import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { admin } from "@/lib/supabase/admin";
import { planOf } from "@/lib/plans";
import { runsSince } from "@/lib/runs";
import { teamIds } from "@/lib/team";
import { APPLICATION_CEILING_USD, dayStartUTC, gate, overCeiling, tierOf, type Gate, type Signals, type Tier } from "@/lib/credit-rules";
import { parsePolicy, type CreditPolicy } from "@/lib/credit-policy";
import type { Category, Spend } from "@/lib/pricing";

// the server side of lib/credit-rules: who each account is, what the platform has spent today, and the limits the
// operator set (billing_settings, so no schema change). everything is cached briefly: this runs before every call.

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

export async function signalsFor(userId: string): Promise<Signals> {
  const db = admin();
  const head = { count: "exact" as const, head: true };
  const [{ data: p }, team, { count: paidEvents }, { count: friends }, { count: signed }] = await Promise.all([
    db.from("profiles").select("plan, plan_until, is_admin, submission_credits, bonus_submissions, referral_rewarded_at").eq("id", userId).maybeSingle(),
    teamIds().catch(() => new Set<string>()),
    db.from("billing_events").select("reference", head).eq("user_id", userId),
    // friends this account invited who finished setup (lib/referrals stamps referral_rewarded_at then)
    db.from("profiles").select("id", head).eq("referred_by", userId).not("referral_rewarded_at", "is", null),
    db.from("applications").select("id", head).eq("user_id", userId).eq("status", "packet_approved"),
  ]);
  // free credits count as earned once an invite is involved: they joined through one and finished setup, or brought a
  // friend who did. the free submission every account got from 14 nov alone doesn't unlock the agents
  const invited = !!p?.referral_rewarded_at || (friends ?? 0) > 0;
  return {
    staff: !!p?.is_admin || team.has(userId),
    paid: planOf(p?.plan, p?.plan_until ?? null).id === "pro" || (paidEvents ?? 0) > 0,
    credits: Number(p?.submission_credits ?? 0),
    earned: invited ? Number(p?.bonus_submissions ?? 0) : 0,
    signedWithFree: (signed ?? 0) > 0 && Number(p?.bonus_submissions ?? 0) > 0,
  };
}

const tierCache = new Map<string, { tier: Tier; at: number }>();
// after a payment or a friend finishing setup: the next call looks again instead of using the cached tier
export function forgetTier(userId: string) {
  tierCache.delete(userId);
}
export async function tierFor(userId: string, fresh = false): Promise<{ tier: Tier }> {
  const hit = tierCache.get(userId);
  if (!fresh && hit && Date.now() - hit.at < 5 * 60_000) return hit;
  const tier = tierOf(await signalsFor(userId));
  const v = { tier, at: Date.now() };
  if (tierCache.size > 5000) tierCache.clear();
  tierCache.set(userId, v);
  return v;
}

// the agents search for programmes of their own (a full shortlist run) for accounts that paid; a credit earned through
// an invite gets the fit check on the free shortlist and its application, not a search
export async function searchesForUser(userId: string): Promise<boolean> {
  const s = await signalsFor(userId);
  return s.staff || s.paid || (s.credits ?? 0) > 0;
}

// background work (queued jobs), as opposed to something the applicant clicked and is waiting for
const background = new AsyncLocalStorage<true>();
export const inBackground = <T>(fn: () => Promise<T>): Promise<T> => background.run(true, fn);

// the check before every model call (lib/budget calls it after the monthly backstop): a free account past its small
// allowance, or any work but CV reading and the interview, waits for a credit; an account past the month's research
// stops researching until the 1st (and the operator hears about it once)
export async function creditGate(userId: string, category: Category, spend: Spend): Promise<Gate> {
  const [{ tier }, policy, today] = await Promise.all([tierFor(userId), creditPolicy(), todaySpendUsd()]);
  if (today >= policy.dailyLimitUsd && policy.dailyLimitUsd > 0) await alertDailyLimit(today, policy.dailyLimitUsd).catch(() => {});
  const g = gate({ tier, category, spend });
  if (!g.ok && g.kind === "research") await alertOnce(`research-ceiling:${userId}:${dayStartUTC().slice(0, 7)}`, "An account reached this month's research ceiling", { user: userId, research_usd: Math.round(spend.byCategory.research * 100) / 100 }).catch(() => {});
  return g;
}

// what one application has cost in AI so far: its own jobs (planning, essays, reviews, fee waivers, the portal)
export async function applicationSpendUsd(applicationId: string): Promise<number> {
  const db = admin();
  const { data: jobs } = await db.from("jobs").select("id").eq("payload->>applicationId", applicationId).limit(5000);
  const ids = (jobs ?? []).map((j) => j.id as string);
  let usd = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from("agent_runs").select("cost_usd").in("job_id", ids.slice(i, i + 200)).limit(10000);
    for (const r of data ?? []) usd += Number(r.cost_usd) || 0;
  }
  return usd;
}

// the per-application ceiling (lib/credit-rules): past it, work on that application waits for the operator, who
// hears about it once. staff accounts aren't held
export async function applicationOverCeiling(userId: string, applicationId: string): Promise<boolean> {
  if ((await tierFor(userId)).tier === "staff") return false;
  const usd = await applicationSpendUsd(applicationId);
  if (!overCeiling(usd)) return false;
  await alertOnce(`app-ceiling:${applicationId}`, "An application reached its AI ceiling and is paused", {
    user: userId,
    application: applicationId,
    spent_usd: Math.round(usd * 100) / 100,
    ceiling_usd: APPLICATION_CEILING_USD,
    to_continue: "set run_at to now on its queued jobs (last_error starts with 'budget: this application is waiting')",
  }).catch(() => {});
  return true;
}

async function alertOnce(key: string, title: string, fields: Record<string, unknown>) {
  const { alert } = await import("@/lib/alerts");
  await alert(key, title, fields);
}

// the operator hears once a UTC day that the limit was reached, and what's still running
let alertedDay = "";
async function alertDailyLimit(today: number, limit: number) {
  const day = dayStartUTC().slice(0, 10);
  if (alertedDay === day) return; // this process already checked today: no query on every call past the limit
  alertedDay = day;
  const db = admin();
  const { data } = await db.from("billing_settings").select("value").eq("key", ALERTED).maybeSingle();
  if (data?.value === day) return;
  await db.from("billing_settings").upsert({ key: ALERTED, value: day });
  const { alert } = await import("@/lib/alerts");
  await alert(`ai-daily-limit:${day}`, "Ivyward reached today's AI spend limit", {
    spent_today_usd: Math.round(today * 100) / 100,
    daily_limit_usd: limit,
    what_runs_now: "Everything keeps running: this is an alert only. Free accounts can't use more than their small monthly amount, and each paying account's research and each application have their own ceilings.",
    change_it: "Operator console: Credit tab",
  });
}

// an account just got a credit (paid, or earned one through an invite): work that waited for it goes now
export async function releaseHeld(userId: string) {
  tierCache.delete(userId);
  const db = admin();
  const now = new Date().toISOString();
  for (const waiting of ["budget: the agents start%", "budget: the agents unlock%", "budget: starter%", "budget: this month's free allowance%", "hold:%"])
    await db.from("jobs").update({ run_at: now }).eq("user_id", userId).eq("status", "queued").like("last_error", waiting);
}

// ---- running low: a warning before the provider credit hits zero ----
// the provider has no balance to read, so this estimates from history: how much was spent between the last time the
// credit came back and the time it ran out is the size of that top-up; when spend since the newest top-up passes 80%
// of that, the operator is told once. an estimate (a bigger or smaller top-up moves it), and it says so.
const CYCLE = "ai_cycle_usd";
const LOW_ALERTED = "ai_low_alerted";

async function spendSince(iso: string): Promise<number> {
  const rows = await runsSince<{ cost_usd: number | null }>("cost_usd", iso);
  return rows.reduce((a, r) => a + (Number(r.cost_usd) || 0), 0);
}

// called when the credit runs out: remember how much the last top-up lasted
export async function recordCreditCycle(): Promise<void> {
  const db = admin();
  const { data } = await db.from("billing_settings").select("value").eq("key", "ai_probe_ok_at").maybeSingle();
  if (!data?.value) return;
  const spent = await spendSince(data.value);
  if (spent >= 1) await db.from("billing_settings").upsert({ key: CYCLE, value: spent.toFixed(2) });
}

export async function warnIfCreditLow(): Promise<boolean> {
  const db = admin();
  const { data } = await db.from("billing_settings").select("key, value").in("key", [CYCLE, LOW_ALERTED, "ai_probe_ok_at", "ai_paused_until"]);
  const get = (k: string) => data?.find((r) => r.key === k)?.value ?? "";
  const since = get("ai_probe_ok_at");
  const cycle = Number(get(CYCLE));
  if (!since || !(cycle >= 1) || get(LOW_ALERTED) === since) return false;
  if ((Date.parse(get("ai_paused_until")) || 0) > Date.now()) return false; // already out: that alert has gone
  const spent = await spendSince(since);
  if (spent < cycle * 0.8) return false;
  await db.from("billing_settings").upsert({ key: LOW_ALERTED, value: since });
  const { alert } = await import("@/lib/alerts");
  await alert(`ai-credit-low:${since}`, "Ivyward's AI credit is running low", {
    spent_since_last_top_up_usd: Math.round(spent * 100) / 100,
    last_top_up_lasted_usd: cycle,
    estimate: `About $${Math.max(0, cycle - spent).toFixed(2)} left if this top-up was the same size as the last. When it runs out, every agent stops.`,
    fix: "Top up in the Anthropic Console, or turn on auto-reload there so it never reaches zero.",
  });
  return true;
}
