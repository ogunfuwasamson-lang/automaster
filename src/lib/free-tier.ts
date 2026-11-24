import "server-only";
import { admin } from "@/lib/supabase/admin";
import { tierFor, forgetTier, searchesForUser } from "@/lib/credit";
import { instantMatches, queueInstantMatches } from "@/lib/matches";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { notify, resolve } from "@/lib/notify";
import { getProfile } from "@/lib/profile-store";

// the free tier (lib/credit-rules, "locked"): a new account gets real value with no model call, and the agents
// start when it has a submission credit: bought, or earned when a friend joins through its invite and finishes setup.
//   free:     a shortlist from the checked library (programmes the agents have already verified on official pages),
//             each with its deadline, tuition, funding and fee data; scholarship matches; deadline alerts; CV reading
//             and the interview up to a small allowance.
//   credit:   the agents check fit against the applicant's own record, draft and fact-check statements, ask for fee
//             waivers and fill in the portals, one application per credit. a paid account's agents also search for
//             more programmes; a credit earned through an invite works on the free shortlist.

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
      "With a submission credit the agents check your fit against your own record, draft your statement and fill in the portal for you.",
    ]
      .filter(Boolean)
      .join(" ");
    const { error } = await db.from("applications").insert({ user_id: userId, program_id: m.programId, status: "shortlisted", fit_reasoning: why, target_deadline: m.deadline?.date ?? null, portal_url: m.url ?? null });
    if (error) continue;
    placed++;
  }
  await logEvent({ userId, actor: "system", action: "free.library_shortlist", context: { source, placed } }).catch(() => {});
  if (placed) await logEvent({ userId, actor: "system", action: "application.shortlisted", context: { library: true, placed } }).catch(() => {});
  // still locked: show what they have and how to get a credit. a friend's invite already earned them one: the fit
  // checks on these programmes start instead (lib/kickoff)
  if (await isLocked(userId)) await unlockNotice(userId, placed);
  return placed;
}

// what a locked applicant sees on their dashboard: what they already have, and the two ways to get a credit
export async function unlockNotice(userId: string, placed?: number) {
  const have = placed ? `Your free shortlist has ${placed} checked programme${placed === 1 ? "" : "s"}, with deadlines, fees and funding. ` : "";
  await notify({
    userId,
    key: "unlock:agents",
    kind: "setup",
    urgent: true,
    title: "Get your first application done",
    body: `${have}For the agents to prepare and submit an application, buy a pack of 5, or invite a friend: when they finish setup, you both get one application free.`,
    href: "/unlock",
    actionLabel: "See how",
  }).catch(() => {});
}

// paid, or earned a credit through an invite: the agents start on the applicant's list for real. safe to call more
// than once (idempotency keys), and a no-op for accounts that are still locked.
//   paid:   a full search for more programmes (if it hasn't run) and the fit check on the list
//   earned: the fit check on the free shortlist; preparation starts when those checks finish (lib/kickoff)
export async function unlockAgents(userId: string, why: "paid" | "earned"): Promise<boolean> {
  forgetTier(userId);
  const { tier } = await tierFor(userId, true);
  if (tier === "locked") return false;
  // the card asking them to pay or invite goes, even when the agents had already started
  await resolve(userId, "unlock:agents").catch(() => {});
  const profile = await getProfile(userId);
  if (!profile.goals.study_level || !(profile.preferences.regions ?? []).length) return false; // kickoff starts it when setup is done
  const db = admin();
  const search = why === "paid" && (await searchesForUser(userId));
  if (search) {
    const { count: runs } = await db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("agent", "recon").eq("task", "discover");
    if (!runs) await enqueue({ userId, agent: "recon", task: "discover", idempotencyKey: `kickoff-discover:${userId}`, runAt: new Date("2000-01-01T00:00:00Z") });
  }
  // the library programmes on their list get the fit check they skipped
  await queueInstantMatches(userId).catch(() => 0);
  const { releaseHeld } = await import("@/lib/credit");
  await releaseHeld(userId).catch(() => {});
  await notify({
    userId,
    key: `unlock:done:${why}`,
    kind: "info",
    title: "Your agents are working",
    body: why === "paid" ? "Thanks for your payment. The agents are checking your fit for each programme and searching for more." : "You have a free application. The agents are checking your fit for each programme on your shortlist, then they start preparing the best one.",
    href: "/shortlist",
    actionLabel: "Open shortlist",
    email: true,
  }).catch(() => {});
  await logEvent({ userId, actor: "system", action: "free.unlocked", context: { why, search } }).catch(() => {});
  return true;
}
