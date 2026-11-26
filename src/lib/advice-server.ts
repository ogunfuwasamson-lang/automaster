import "server-only";
import { admin } from "@/lib/supabase/admin";
import { getProfile, updateProfile } from "@/lib/profile-store";
import { publicProgrammes } from "@/lib/programme-data";
import { openScholarships } from "@/lib/open-scholarships";
import { REGIONS, type Profile } from "@/lib/profile";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { adviceFor, destinationOptions, type Advice, type Want } from "@/lib/destination-advice";
import { usStudyBlocked, usSuspensionNote } from "@/lib/us-visa-suspension";

// the destination advice for one applicant (lib/destination-advice), and acting on their answer

export function wantOf(p: Profile): Want | null {
  const level = (p.goals.study_level ?? "masters") as Want["level"];
  const fields = (p.goals.fields ?? []).filter(Boolean);
  const regions = (p.preferences.regions ?? []).filter((r) => REGIONS[r]);
  if (!fields.length || !regions.length) return null;
  const gre = p.goals.gmat_gre_plan === "will_take" || p.tests.some((t) => /GRE|GMAT/.test(t.name) && t.status !== "not_planned");
  // never suggest the US to someone whose nationality can't get a new US student visa now, and say so if they picked it
  const us = usStudyBlocked(p.identity.citizenship, p.identity.other_citizenship);
  return {
    level: ["masters", "phd", "undergraduate"].includes(level) ? level : "masters",
    fields,
    regions,
    fundingNeed: (p.funding.need as Want["fundingNeed"]) ?? null,
    gre,
    ...(us ? { blocked: ["us"], blockedNote: usSuspensionNote(us) } : {}),
  };
}

export async function destinationAdvice(userId: string): Promise<Advice | null> {
  const p = await getProfile(userId);
  const w = wantOf(p);
  if (!w) return null;
  const c = p.identity.citizenship;
  // scholarships named for their citizenship in one region and not everywhere
  const anywhere = new Set(openScholarships(c, ["-"]).map((s) => s.name));
  const named = (region: string) => openScholarships(c, [region]).map((s) => s.name).filter((n) => !anywhere.has(n));
  return adviceFor(w, destinationOptions(w, await publicProgrammes(), named));
}

// they said yes: the regions join their picks and the agents search there (each programme checked uses a credit,
// as any search does)
export async function addRegions(userId: string, regions: string[], via: string): Promise<string[]> {
  const add = regions.filter((r) => REGIONS[r]);
  if (!add.length) return [];
  await updateProfile(userId, (p) => ({ ...p, preferences: { ...p.preferences, regions: [...new Set([...(p.preferences.regions ?? []), ...add])] } }));
  await enqueue({ userId, agent: "recon", task: "discover", payload: { regions: add }, idempotencyKey: `add-regions:${userId}:${add.sort().join("+")}` });
  await logEvent({ userId, actor: via === "assistant" ? "agent:interviewer" : "user", action: "regions.added", context: { regions: add, via } });
  return add;
}

// an advice the applicant already answered (or has open) for these regions isn't raised again
export async function adviceSeen(userId: string, regions: string[]): Promise<boolean> {
  const { data } = await admin().from("approvals").select("payload").eq("user_id", userId).eq("kind", "destination_advice").limit(50);
  const key = [...regions].sort().join("+");
  return (data ?? []).some((a) => ((a.payload as { regions?: string[] }).regions ?? []).slice().sort().join("+") === key);
}
