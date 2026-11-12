import "server-only";
import { admin } from "@/lib/supabase/admin";
import { planOf } from "@/lib/plans";
import { runsSince } from "@/lib/runs";
import { teamIds } from "@/lib/team";
import { dayStartUTC, gate, nextDayUTC, tierOf, type Gate, type Signals, type Tier } from "@/lib/credit-rules";
import { parsePolicy, type CreditPolicy } from "@/lib/credit-policy";
import type { Category, Spend } from "@/lib/pricing";

// the server side of lib/credit-rules: who each account is, what the platform has spent today, and the limits the
// operator set (billing_settings, so no schema change). everything is cached briefly: this runs before every call.

const SIGNED = ["packet_approved", "submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "declined", "rejected"];
const KEY = "credit_policy";
const ALERTED = "ai_daily_limit_alerted";

let policyCache: { v: CreditPolicy; at: number } | null = null;
export async function creditPolicy(fresh = false): Promise<CreditPolicy> {
  if (!fresh && policyCache && Date.now() - policyCache.at < 60_000) return policyCache.v;
  const { data } = await admin().from("billing_settings").select("value").eq("key", KEY).maybeSingle();
  const v = parsePolicy(data?.value ?? "{}");
  policyCache = { v, at: Date.now() };
  return v;
}

export async function saveCreditPolicy(p: unknown): Promise<CreditPolicy> {
  const v = parsePolicy(p);
  const { error } = await admin().from("billing_settings").upsert({ key: KEY, value: JSON.stringify(v) });
  if (error) throw new Error(error.message);
  policyCache = { v, at: Date.now() };
  return v;
}

let todayCache: { day: string; usd: number; at: number } | null = null;
export async function todaySpendUsd(fresh = false): Promise<number> {
  const day = dayStartUTC();
  if (!fresh && todayCache && todayCache.day === day && Date.now() - todayCache.at < 60_000) return todayCache.usd;
  const rows = await runsSince<{ cost_usd: number | null }>("cost_usd", day);
  const usd = rows.reduce((a, r) => a + (Number(r.cost_usd) || 0), 0);
  todayCache = { day, usd, at: Date.now() };
  return usd;
}

export async function signalsFor(userId: string): Promise<Signals & { createdAt: string | null }> {
  const db = admin();
  const head = { count: "exact" as const, head: true };
  const [{ data: p }, team, { count: docs }, { count: mail }, { count: signed }, { count: paidEvents }] = await Promise.all([
    db.from("profiles").select("plan, plan_until, is_admin, submission_credits, created_at").eq("id", userId).maybeSingle(),
    teamIds().catch(() => new Set<string>()),
    db.from("documents").select("id", head).eq("user_id", userId),
    db.from("mail_accounts").select("user_id", head).eq("user_id", userId),
    db.from("applications").select("id", head).eq("user_id", userId).in("status", SIGNED),
    db.from("billing_events").select("reference", head).eq("user_id", userId),
  ]);
  return {
    staff: !!p?.is_admin || team.has(userId),
    paid: planOf(p?.plan, p?.plan_until ?? null).id === "pro" || (p?.submission_credits ?? 0) > 0 || (paidEvents ?? 0) > 0,
    documents: docs ?? 0,
    gmail: (mail ?? 0) > 0,
    signed: (signed ?? 0) > 0,
    createdAt: (p?.created_at as string | undefined) ?? null,
  };
}

const tierCache = new Map<string, { tier: Tier; lastActive: number | null; at: number }>();
export async function tierFor(userId: string, fresh = false): Promise<{ tier: Tier; lastActive: number | null }> {
  const hit = tierCache.get(userId);
  if (!fresh && hit && Date.now() - hit.at < 5 * 60_000) return hit;
  const s = await signalsFor(userId);
  const tier = tierOf(s);
  let lastActive: number | null = null;
  if (tier === "engaged" || tier === "starter") {
    // the applicant's own actions (and interview messages); a new account counts from when it was made
    const { data: e } = await admin().from("events").select("created_at").eq("user_id", userId).or("actor.eq.user,action.eq.interview.turn").order("created_at", { ascending: false }).limit(1).maybeSingle();
    lastActive = Math.max(e?.created_at ? Date.parse(e.created_at) : 0, s.createdAt ? Date.parse(s.createdAt) : 0) || null;
  }
  const v = { tier, lastActive, at: Date.now() };
  if (tierCache.size > 5000) tierCache.clear();
  tierCache.set(userId, v);
  return v;
}

// held: not the job's fault and not the month's budget. the job waits (without spending an attempt) until `until`
export class CreditHeld extends Error {
  constructor(public kind: "day" | "inactive", reason: string, public until: string) {
    super(`hold: ${reason}`);
    this.name = "CreditHeld";
  }
}

// the check before every model call (lib/budget calls it after the monthly budget). returns the gate's verdict:
// a starter over their allowance is a budget stop (parked until they engage or the month turns); a busy day or a
// long absence is a hold.
export async function creditGate(userId: string, category: Category, spend: Spend): Promise<Gate> {
  if (category === "core") return { ok: true };
  const [{ tier, lastActive }, policy, today] = await Promise.all([tierFor(userId), creditPolicy(), todaySpendUsd()]);
  const g = gate({ tier, category, spend, todayUsd: today, lastActiveMs: lastActive, now: Date.now(), policy });
  if (today >= policy.dailyLimitUsd && policy.dailyLimitUsd > 0) await alertDailyLimit(today, policy.dailyLimitUsd).catch(() => {});
  return g;
}

// a held job looks again tomorrow, spread over the first half hour so they don't all start at once (for an absent
// applicant the look costs nothing: no model call until they're back)
export function holdUntil(): string {
  return nextDayUTC(new Date(), Math.floor(Math.random() * 30 * 60_000));
}

// the operator hears once a UTC day that the limit was reached, and what's still running
async function alertDailyLimit(today: number, limit: number) {
  const db = admin();
  const day = dayStartUTC().slice(0, 10);
  const { data } = await db.from("billing_settings").select("value").eq("key", ALERTED).maybeSingle();
  if (data?.value === day) return;
  await db.from("billing_settings").upsert({ key: ALERTED, value: day });
  const { alert } = await import("@/lib/alerts");
  await alert(`ai-daily-limit:${day}`, "Ivyward reached today's AI spend limit", {
    spent_today_usd: Math.round(today * 100) / 100,
    daily_limit_usd: limit,
    what_runs_now: "Paid, staff and engaged accounts (documents or Gmail). Starter accounts' research and writing wait until tomorrow (UTC).",
    change_it: "Operator console: Credit tab",
  });
}

// an account just became serious (uploaded a document, connected gmail, signed, paid): work that was waiting on
// the starter allowance or the day's limit goes now
export async function releaseHeld(userId: string) {
  tierCache.delete(userId);
  const db = admin();
  const now = new Date().toISOString();
  await db.from("jobs").update({ run_at: now }).eq("user_id", userId).eq("status", "queued").like("last_error", "budget: starter%");
  await db.from("jobs").update({ run_at: now }).eq("user_id", userId).eq("status", "queued").like("last_error", "hold:%");
}
