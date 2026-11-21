import "server-only";
import { admin } from "@/lib/supabase/admin";
import { tierFor, forgetTier } from "@/lib/credit";
import { instantMatches, queueInstantMatches } from "@/lib/matches";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { notify, resolve } from "@/lib/notify";
import { UNLOCK_FRIENDS } from "@/lib/credit-rules";
import { getProfile } from "@/lib/profile-store";

// the free tier (lib/credit-rules, "locked"): a new account gets real value with no model call, and the agents
// unlock when it pays or when UNLOCK_FRIENDS friends it invited finish setup.
//   free:     a shortlist from the checked library (programmes the agents have already verified on official pages),
//             each with its deadline, tuition, funding and fee data; scholarship matches; deadline alerts; CV reading
//             and the interview up to a small allowance.
//   unlocked: the agents check fit against the applicant's own record, research more programmes, draft and
//             fact-check statements, ask for fee waivers and fill in the portals.

const LIBRARY_SHORTLIST = 8;

export async function isLocked(userId: string): Promise<boolean> {
  return (await tierFor(userId)).tier === "locked";
}

// the free shortlist: library matches placed straight on the applicant's list, no model call. once per applicant
// (an existing list is left alone). returns how many were placed.
export async function placeLibraryShortlist(userId: string, source: string): Promise<number> {
  const db = admin();
  const { count: have } = await db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (have) return 0;
  const matches = await instantMatches(userId, LIBRARY_SHORTLIST).catch(() => []);
  let placed = 0;
  for (const m of matches) {
    const why = [
      "From Ivyward's checked library: it matches the level, field and region you chose, and the agents have already read its official pages.",
      m.funding === "fully funded option" ? "A fully funded option is on file for it." : m.funding === "funding possible" ? "Funding is possible here." : "",
      "Unlock the agents for a fit check against your own record, a drafted statement and the portal filled in for you.",
    ]
      .filter(Boolean)
      .join(" ");
    const { error } = await db.from("applications").insert({ user_id: userId, program_id: m.programId, status: "shortlisted", fit_reasoning: why, target_deadline: m.deadline?.date ?? null, portal_url: m.url ?? null });
    if (error) continue;
    placed++;
  }
  await logEvent({ userId, actor: "system", action: "free.library_shortlist", context: { source, placed } }).catch(() => {});
  if (placed) await logEvent({ userId, actor: "system", action: "application.shortlisted", context: { library: true, placed } }).catch(() => {});
  await unlockNotice(userId, placed);
  return placed;
}

// what a locked applicant sees on their dashboard: what they already have, and the two ways to unlock the rest
export async function unlockNotice(userId: string, placed?: number) {
  const db = admin();
  const { count: friends } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId).not("referral_rewarded_at", "is", null);
  const left = Math.max(0, UNLOCK_FRIENDS - (friends ?? 0));
  const have = placed ? `Your free shortlist has ${placed} checked programme${placed === 1 ? "" : "s"}, with deadlines, fees and funding. ` : "";
  await notify({
    userId,
    key: "unlock:agents",
    kind: "setup",
    urgent: true,
    title: "Unlock your agents to apply",
    body: `${have}To have the agents check your fit, draft your statements, ask for fee waivers and fill in the portals, buy your first submission or invite ${left} more friend${left === 1 ? "" : "s"} who finish${left === 1 ? "es" : ""} setup.`,
    href: "/settings#invite",
    actionLabel: "Unlock the agents",
  }).catch(() => {});
}

// paid, or the second friend finished setup: the agents start on the applicant's list for real. safe to call more
// than once (idempotency keys), and a no-op for accounts that aren't locked out any more.
export async function unlockAgents(userId: string, why: "paid" | "friends"): Promise<boolean> {
  forgetTier(userId);
  const { tier } = await tierFor(userId, true);
  if (tier === "locked") return false;
  const db = admin();
  const { count: runs } = await db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("agent", "recon").eq("task", "discover");
  if (runs) return false; // the agents were already working for this account
  const profile = await getProfile(userId);
  if (!profile.goals.study_level || !(profile.preferences.regions ?? []).length) {
    await resolve(userId, "unlock:agents").catch(() => {});
    return false; // setup isn't finished: kickoff starts the shortlist when it is
  }
  await enqueue({ userId, agent: "recon", task: "discover", idempotencyKey: `kickoff-discover:${userId}`, runAt: new Date("2000-01-01T00:00:00Z") });
  // the library programmes already on their list get the fit check they skipped
  await queueInstantMatches(userId).catch(() => 0);
  await resolve(userId, "unlock:agents").catch(() => {});
  await notify({
    userId,
    key: "unlock:done",
    kind: "info",
    title: "Your agents are unlocked",
    body: why === "paid" ? "Thanks for your payment. The agents are checking your fit for each programme and searching for more." : `${UNLOCK_FRIENDS} friends you invited finished setup. The agents are checking your fit for each programme and searching for more.`,
    href: "/shortlist",
    actionLabel: "Open shortlist",
    email: true,
  }).catch(() => {});
  await logEvent({ userId, actor: "system", action: "free.unlocked", context: { why } }).catch(() => {});
  return true;
}
