import "server-only";
import { resumeAfterProfileChange } from "@/lib/requeue";
import { admin } from "@/lib/supabase/admin";
import { loadProfile, mergeProfile, type Profile, type ProfilePatch } from "@/lib/profile";
import { logEvent } from "@/lib/events";

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await admin().from("profiles").select("profile").eq("id", userId).single();
  if (error) throw new Error(`getProfile failed: ${error.message}`);
  return loadProfile(data.profile);
}

// read-merge-write with optimistic concurrency, so two agents patching at once don't clobber each other
export async function applyPatch(
  userId: string,
  patch: ProfilePatch,
  source: { actor: string; label: string; agentRunId?: string; documentId?: string },
): Promise<Profile> {
  const db = admin();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db.from("profiles").select("profile, updated_at").eq("id", userId).single();
    if (error) throw new Error(`applyPatch read failed: ${error.message}`);
    const merged = mergeProfile(loadProfile(data.profile), patch);
    const { data: upd, error: uerr } = await db
      .from("profiles")
      .update({ profile: merged })
      .eq("id", userId)
      .eq("updated_at", data.updated_at)
      .select("id");
    if (uerr) throw new Error(`applyPatch write failed: ${uerr.message}`);
    if (upd && upd.length) {
      await logEvent({
        userId,
        actor: source.actor,
        action: "profile.patched",
        agentRunId: source.agentRunId ?? null,
        context: { source: source.label, documentId: source.documentId, sections: Object.keys(patch) },
      });
      await resumeAfterProfileChange(userId, source.label ?? "profile").catch(() => 0);
      return merged;
    }
    await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
  }
  throw new Error("applyPatch: too much contention");
}

// generic read-modify-write with the same optimistic concurrency as applyPatch
export async function updateProfile(userId: string, fn: (p: Profile) => Profile): Promise<Profile> {
  const db = admin();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db.from("profiles").select("profile, updated_at").eq("id", userId).single();
    if (error) throw new Error(`updateProfile read failed: ${error.message}`);
    const next = fn(loadProfile(data.profile));
    const { data: upd, error: uerr } = await db
      .from("profiles")
      .update({ profile: next })
      .eq("id", userId)
      .eq("updated_at", data.updated_at)
      .select("id");
    if (uerr) throw new Error(`updateProfile write failed: ${uerr.message}`);
    if (upd?.length) {
      // a changed profile can unblock a stopped submission: resume those on their own
      await resumeAfterProfileChange(userId, "profile").catch(() => 0);
      return next;
    }
    await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
  }
  throw new Error("updateProfile: too much contention");
}
