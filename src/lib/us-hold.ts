import "server-only";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile-store";
import { say } from "@/lib/followups";
import { notify, resolve } from "@/lib/notify";
import { logEvent } from "@/lib/events";
import { releaseApplication } from "@/lib/wallet";
import { canTransition, type AppStatus } from "@/lib/app-state";
import { nationalsOf, usStudyBlocked } from "@/lib/us-visa-suspension";

// the founder's call (26 nov 2026, option A): for nationals under the 2026 US student visa suspension, the agents
// stop searching the US (agents/recon, lib/matches), and anyone with US applications not yet submitted is asked
// once whether to drop them or keep them. nothing is dropped without their answer (approvals kind us_visa_suspension
// → api/approvals). a second passport from an unaffected country lifts all of it (profile identity.other_citizenship).

export const KIND = "us_visa_suspension";
const OPEN: AppStatus[] = ["researching", "shortlisted", "preparing", "ready_for_review", "packet_approved"];
const US = /united states|^usa?$|^united states of america$/i;

type OpenApp = { id: string; status: AppStatus; program_id: string; school: string; runner: string | null };

// their US applications that haven't gone in yet
export async function openUsApplications(userId: string): Promise<OpenApp[]> {
  const { data } = await admin()
    .from("applications")
    .select("id, status, program_id, runner_status, programs!inner(schools!inner(name, country, region))")
    .eq("user_id", userId)
    .in("status", OPEN);
  return ((data ?? []) as unknown as { id: string; status: AppStatus; program_id: string; runner_status: string | null; programs: { schools: { name: string; country: string | null; region: string | null } } }[])
    .filter((a) => a.programs.schools.region === "us" || US.test((a.programs.schools.country ?? "").trim()))
    .map((a) => ({ id: a.id, status: a.status, program_id: a.program_id, school: a.programs.schools.name, runner: a.runner_status }));
}

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

// the one message: chat, a decision card, and an email. returns false when there's nothing to ask
export async function askAboutUs(userId: string): Promise<{ asked: boolean; apps?: number; why?: string }> {
  const p = await getProfile(userId);
  const blocked = usStudyBlocked(p.identity.citizenship, p.identity.other_citizenship);
  if (!blocked) return { asked: false, why: "not affected" };
  const apps = await openUsApplications(userId);
  if (!apps.length) return { asked: false, why: "no open US applications" };
  const db = admin();
  const { data: before } = await db.from("approvals").select("id").eq("user_id", userId).eq("kind", KIND).limit(1);
  if (before?.length) return { asked: false, why: "already asked" };

  const schools = [...new Set(apps.map((a) => a.school))];
  const named = schools.length > 4 ? `${schools.slice(0, 4).join(", ")} and ${schools.length - 4} more` : list(schools);
  const n = apps.length;
  const them = n === 1 ? "it" : `these ${n}`;
  const title = `New US student visas are suspended for ${nationalsOf(blocked)}`;
  const text =
    `Since 1 January 2026, the US has suspended new student visas (F, M and J) for ${nationalsOf(blocked)} and 37 other countries, under a presidential proclamation (US State Department). ` +
    `You have ${n === 1 ? "one US application" : `${n} US applications`} open, none submitted yet: ${named}. ` +
    `Your agents have stopped looking for new US programmes for you. Drop ${them}, or keep ${n === 1 ? "it" : "them"} for now? Nothing changes until you choose. ` +
    `If you also hold a passport from a country that isn't on the list, tell me here and I'll search the US again.`;

  await db.from("approvals").insert({ user_id: userId, kind: KIND, title, summary: text, payload: { applicationIds: apps.map((a) => a.id), country: blocked.country }, urgency: 2, created_by: "agent:advisor" });
  await say(userId, text);
  await notify({ userId, key: `us-visa:${userId}`, kind: "info", title, body: text, href: "/dashboard", actionLabel: "Choose", urgent: true, email: true });
  await logEvent({ userId, actor: "agent:advisor", action: "advice.us_suspension", context: { apps: n, country: blocked.country } });
  return { asked: true, apps: n };
}

// their yes: each US application still open is dropped, anything queued for it is cancelled, and credits set aside
// for it come back. applications that moved on since they were asked are left alone.
export async function dropUsApplications(userId: string, ids: string[]): Promise<number> {
  const db = admin();
  const open = (await openUsApplications(userId)).filter((a) => ids.includes(a.id));
  let dropped = 0;
  for (const a of open) {
    // a form being filled right now is left to finish or stop on its own
    if (!canTransition(a.status, "dropped") || a.runner === "running") continue;
    await db.from("jobs").update({ status: "cancelled", last_error: "application dropped: US student visa suspension" }).eq("user_id", userId).eq("status", "queued").eq("payload->>applicationId", a.id);
    const { error } = await db.from("applications").update({ status: "dropped" }).eq("id", a.id).eq("user_id", userId).eq("status", a.status);
    if (error) continue;
    if (["preparing", "ready_for_review", "packet_approved"].includes(a.status)) await releaseApplication(userId, a.id).catch(() => 0);
    await logEvent({ userId, actor: "user", action: "application.dropped", applicationId: a.id, programId: a.program_id, context: { why: "us_visa_suspension" } });
    dropped++;
  }
  await resolve(userId, new RegExp(`^us-visa:${userId}$`)).catch(() => {});
  return dropped;
}
