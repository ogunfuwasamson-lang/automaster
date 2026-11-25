import "server-only";
import { admin } from "@/lib/supabase/admin";
import { budgetCheck, categoryOf, monthStartUTC, type Category, type Spend } from "@/lib/pricing";
import { BUDGET_PER_SUBMISSION_USD, planOf, type Plan } from "@/lib/plans";
import { LEGACY_PACK_SIZE } from "@/lib/geo-pricing";
import { runsSince } from "@/lib/runs";
import { creditGate, creditPolicy, todaySpendUsd } from "@/lib/credit";
import { DEFAULT_POLICY } from "@/lib/credit-policy";
import { WELCOME_MONTHLY_USD } from "@/lib/credit-rules";

// staff and the nightly learning pass run under admin accounts: capped like everyone, so testing can't drain the
// credit applicants need (30 days to nov 2026: about $27, half of all spend). the operator sets it (Credit tab)
export const STAFF_BUDGET_USD = DEFAULT_POLICY.staffMonthlyUsd;

export class BudgetExceeded extends Error {
  constructor(public reason: string, public category: Category) {
    super(`budget: ${reason}`);
  }
}

type BudgetProfile = { plan?: string | null; plan_until?: string | null; monthly_budget_usd?: number | null; is_admin?: boolean | null };

// a user's AI allowance this month, from their profile and what they paid for this month. pure, so the operator
// console shows the same number the agents are held to.
export function budgetFor(p: BudgetProfile | null, singles: number, packs: number, staffUsd = STAFF_BUDGET_USD): number {
  // per-user override (e.g. the founder's own account) beats the plan's budget
  if (p?.monthly_budget_usd != null) return Number(p.monthly_budget_usd);
  // staff accounts (and the learning jobs that run under them) aren't capped by a plan
  if (p?.is_admin) return staffUsd;
  // the plan's month: a backstop nobody reaches in normal use (the heaviest account so far, 50 programmes checked and 3
  // applications prepared, used $7.60). free accounts are held to far less by the credit gate (lib/credit-rules)
  return planOf(p?.plan, p?.plan_until ?? null).aiBudgetUsd + (singles + packs * LEGACY_PACK_SIZE) * BUDGET_PER_SUBMISSION_USD;
}

export async function userPlan(userId: string): Promise<{ plan: Plan; budget: number }> {
  const db = admin();
  // plan_until arrives with the billing migration: read without it until then
  const full = await db.from("profiles").select("plan, plan_until, monthly_budget_usd, is_admin").eq("id", userId).maybeSingle();
  const data = (full.error ? (await db.from("profiles").select("plan, monthly_budget_usd").eq("id", userId).maybeSingle()).data : full.data) as BudgetProfile | null;
  const plan = planOf(data?.plan, data?.plan_until ?? null);
  if (data?.monthly_budget_usd != null || data?.is_admin) return { plan, budget: budgetFor(data, 0, 0, (await creditPolicy().catch(() => DEFAULT_POLICY)).staffMonthlyUsd) };
  const since = monthStartUTC();
  const [{ count: singles }, { count: packs }, { count: paidEver }, { data: grants }] = await Promise.all([
    db.from("billing_events").select("reference", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "submission").gte("created_at", since),
    db.from("billing_events").select("reference", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "pack").gte("created_at", since),
    db.from("billing_events").select("reference", { count: "exact", head: true }).eq("user_id", userId),
    db.from("credit_grants").select("source, reference").eq("user_id", userId).limit(20),
  ]);
  const budget = budgetFor(data, singles ?? 0, packs ?? 0);
  // only the welcome credits: a small month (lib/credit-rules)
  const welcomeOnly = !paidEver && (grants ?? []).length > 0 && (grants ?? []).every((g) => g.source === "grant" && String(g.reference ?? "").startsWith("signup:"));
  return { plan, budget: welcomeOnly ? Math.min(budget, WELCOME_MONTHLY_USD) : budget };
}

export async function monthlyBudget(userId: string): Promise<number> {
  return (await userPlan(userId)).budget;
}

export async function monthSpend(userId: string): Promise<Spend> {
  // all of the month's calls, not the first 1,000: a capped read let a busy account run past its budget
  const data = await runsSince<{ agent: string; cost_usd: number | null }>("agent, cost_usd", monthStartUTC(), userId);
  const s: Spend = { total: 0, byCategory: { research: 0, writing: 0, core: 0 } };
  for (const r of data) {
    // growing the checked list (agents/library) runs under an admin account but has its own allowance (below)
    if (r.agent === "library") continue;
    const c = Number(r.cost_usd) || 0;
    s.total += c;
    s.byCategory[categoryOf(r.agent)] += c;
  }
  return s;
}

// growing the checked programme list (agents/library, founder's call 25 nov 2026: 500 programmes, ~$35): its own
// allowance, apart from the account it runs under, and it steps aside for the day before the platform's daily limit
export const LIBRARY_DAILY_USD = 6;
export const LIBRARY_MONTHLY_USD = 40;
export class Hold extends Error {
  constructor(reason: string, public until: string) {
    super(`hold: ${reason}`);
  }
}
const tomorrowUTC = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 3, 0)).toISOString();
};
async function assertLibraryBudget() {
  const day = new Date().toISOString().slice(0, 10);
  const [month, policy, platform] = await Promise.all([runsSince<{ cost_usd: number | null; started_at: string }>("cost_usd, started_at", monthStartUTC(), undefined, "library"), creditPolicy(), todaySpendUsd()]);
  const sum = (rows: typeof month) => rows.reduce((a, r) => a + (Number(r.cost_usd) || 0), 0);
  if (sum(month) >= LIBRARY_MONTHLY_USD) throw new BudgetExceeded("the checked list's growth used this month's allowance", "research");
  if (sum(month.filter((r) => String(r.started_at).startsWith(day))) >= LIBRARY_DAILY_USD) throw new Hold("the checked list's growth used today's allowance", tomorrowUTC());
  if (policy.dailyLimitUsd > 0 && platform >= policy.dailyLimitUsd - 1) throw new Hold("the platform is near today's AI limit", tomorrowUTC());
}

// call before every model request
export async function assertBudget(userId: string, agent: string) {
  if (agent === "library") return assertLibraryBudget();
  const category = categoryOf(agent);
  const [spend, monthly] = await Promise.all([monthSpend(userId), monthlyBudget(userId)]);
  const check = budgetCheck(spend, monthly, category);
  if (!check.ok) throw new BudgetExceeded(check.reason, category);
  // free accounts wait for a credit; research stops for the month at its ceiling (lib/credit-rules)
  const g = await creditGate(userId, category, spend);
  if (!g.ok) throw new BudgetExceeded(g.reason, category);
}
