import "server-only";
import { admin } from "@/lib/supabase/admin";
import { billingState } from "@/lib/billing";
import { tierFor, creditPolicy } from "@/lib/credit";
import { localHour } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { logEvent } from "@/lib/events";
import { dueStep, emailNudge, pickNudge, seedOf, type Nudge, type NudgeCtx } from "@/lib/nudge-rules";

// asking engaged applicants to pay (lib/nudge-rules has the angles and words; the Credit tab in the operator console
// turns each on or off and edits the wording). only accounts that uploaded a document, connected gmail or signed,
// and haven't paid: never starters, staff or paying accounts.

const SENT = ["submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "declined", "rejected"];
const OPEN = ["shortlisted", "preparing", "ready_for_review", "packet_approved"];
const NOT_ESSAYS = ["strategy", "fee_plan", "funding_plan", "video_or_interview", "cv"];
const DAY = 86_400_000;

export async function nudgeContext(userId: string): Promise<NudgeCtx> {
  const db = admin();
  const [bill, { data: apps }] = await Promise.all([
    billingState(userId),
    db.from("applications").select("id, status, target_deadline, paid_at, programs(schools(name)), artifacts(kind)").eq("user_id", userId).not("status", "in", "(dropped,withdrawn)").limit(300),
  ]);
  const list = (apps ?? []) as unknown as { status: string; target_deadline: string | null; paid_at: string | null; programs: { schools: { name: string } } | null; artifacts: { kind: string }[] }[];
  const now = Date.now();
  const ahead = list
    .filter((a) => OPEN.includes(a.status) && a.target_deadline && Date.parse(a.target_deadline) + DAY > now)
    .sort((a, b) => Date.parse(a.target_deadline!) - Date.parse(b.target_deadline!))[0];
  const used = list.filter((a) => SENT.includes(a.status) || a.paid_at).length;
  return {
    model: bill.pricing.model,
    price: bill.pricing.label,
    programs: list.length,
    essays: list.reduce((n, a) => n + (a.artifacts ?? []).filter((x) => !NOT_ESSAYS.includes(x.kind)).length, 0),
    ready: list.filter((a) => (a.status === "ready_for_review" || a.status === "packet_approved") && !a.paid_at).length,
    nearest: ahead ? { school: ahead.programs?.schools?.name ?? "Your next school", days: Math.max(0, Math.floor((Date.parse(ahead.target_deadline!) - now) / DAY)) } : null,
    freeLeft: bill.pricing.model === "subscription" ? Math.max(0, bill.pricing.free + bill.bonus - used) : null,
  };
}

// the card on the dashboard, or null (not engaged, already paying, switched off, or snoozed)
export async function dashboardNudge(userId: string, snoozedAt: number | null): Promise<(Nudge & { kind: "pack" | "pro" }) | null> {
  const policy = await creditPolicy();
  if (!policy.nudges.inApp) return null;
  if (snoozedAt && Date.now() - snoozedAt < policy.nudges.snoozeDays * DAY) return null;
  const { tier } = await tierFor(userId);
  if (tier !== "engaged") return null;
  const c = await nudgeContext(userId);
  const n = pickNudge(c, seedOf(userId), Math.floor(Date.now() / DAY), policy.nudges.angles);
  return n ? { ...n, kind: c.model === "pack" ? "pack" : "pro" } : null;
}

// when an account became serious: its first document, or the day it connected gmail
async function engagedAt(userId: string): Promise<number | null> {
  const db = admin();
  const [{ data: doc }, { data: mail }] = await Promise.all([
    db.from("documents").select("created_at").eq("user_id", userId).order("created_at").limit(1).maybeSingle(),
    db.from("events").select("created_at").eq("user_id", userId).eq("action", "mail.connected").order("created_at").limit(1).maybeSingle(),
  ]);
  const ts = [doc?.created_at, mail?.created_at].filter(Boolean).map((x) => Date.parse(x as string));
  return ts.length ? Math.min(...ts) : null;
}

// the email sequence: run hourly; each applicant gets the next step at 10am their time, if they get emails from us
export async function sendPayNudges(limit = 200): Promise<number> {
  const policy = await creditPolicy();
  if (!policy.nudges.email || !policy.nudges.emailDays.length) return 0;
  const db = admin();
  const [{ data: docs }, { data: mail }] = await Promise.all([db.from("documents").select("user_id").limit(20000), db.from("mail_accounts").select("user_id").limit(20000)]);
  const ids = [...new Set([...(docs ?? []), ...(mail ?? [])].map((r) => r.user_id as string))];
  if (!ids.length) return 0;
  let sent = 0;
  for (let i = 0; i < ids.length && sent < limit; i += 200) {
    const { data: profs } = await db.from("profiles").select("id, timezone, digest_enabled").in("id", ids.slice(i, i + 200));
    for (const p of profs ?? []) {
      if (sent >= limit) break;
      if (p.digest_enabled === false || localHour(p.timezone || "Africa/Lagos") !== 10) continue;
      if ((await tierFor(p.id, true)).tier !== "engaged") continue;
      const since = await engagedAt(p.id);
      if (!since) continue;
      const { data: past } = await db.from("notifications").select("dedupe_key, created_at").eq("user_id", p.id).like("dedupe_key", "paynudge:email:%");
      const steps = (past ?? []).map((r) => Number(String(r.dedupe_key).split(":")[2])).filter(Number.isFinite);
      const last = (past ?? []).reduce((m, r) => Math.max(m, Date.parse(r.created_at as string) || 0), 0) || null;
      const step = dueStep(policy.nudges.emailDays, Math.floor((Date.now() - since) / DAY), steps, last, Date.now(), policy.nudges.emailGapDays);
      if (step == null) continue;
      const n = emailNudge(await nudgeContext(p.id), step, policy.nudges.angles);
      if (!n) continue;
      await notify({ userId: p.id, key: `paynudge:email:${step}`, kind: "info", title: n.headline, body: n.body, href: "/settings#plan", actionLabel: n.cta, email: true });
      await logEvent({ userId: p.id, actor: "system", action: "nudge.emailed", context: { step, angle: n.angle } }).catch(() => {});
      sent++;
    }
  }
  return sent;
}
