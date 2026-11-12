import "server-only";
import { admin } from "@/lib/supabase/admin";
import { budgetCheck, categoryOf, monthStartUTC, type Category, type Spend } from "@/lib/pricing";
import { BUDGET_PER_SUBMISSION_USD, planOf, type Plan } from "@/lib/plans";
import { PACK_SIZE } from "@/lib/geo-pricing";
import { runsSince } from "@/lib/runs";
import { creditGate, creditPolicy, CreditHeld, holdUntil } from "@/lib/credit";
import { DEFAULT_POLICY } from "@/lib/credit-policy";

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
  // africa: every submission paid for this month (one-off, or 5 per pack) adds to the month's allowance of agent work
  return planOf(p?.plan, p?.plan_until ?? null).aiBudgetUsd + (singles + packs * PACK_SIZE) * BUDGET_PER_SUBMISSION_USD;
}

export async function userPlan(userId: string): Promise<{ plan: Plan; budget: number }> {
  const db = admin();
  // plan_until arrives with the billing migration: read without it until then
  const full = await db.from("profiles").select("plan, plan_until, monthly_budget_usd, is_admin").eq("id", userId).maybeSingle();
  const data = (full.error ? (await db.from("profiles").select("plan, monthly_budget_usd").eq("id", userId).maybeSingle()).data : full.data) as BudgetProfile | null;
  const plan = planOf(data?.plan, data?.plan_until ?? null);
  if (data?.monthly_budget_usd != null || data?.is_admin) return { plan, budget: budgetFor(data, 0, 0, (await creditPolicy().catch(() => DEFAULT_POLICY)).staffMonthlyUsd) };
  const since = monthStartUTC();
  const [{ count: singles }, { count: packs }] = await Promise.all([
    db.from("billing_events").select("reference", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "submission").gte("created_at", since),
    db.from("billing_events").select("reference", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "pack").gte("created_at", since),
  ]);
  return { plan, budget: budgetFor(data, singles ?? 0, packs ?? 0) };
}

export async function monthlyBudget(userId: string): Promise<number> {
  return (await userPlan(userId)).budget;
}

export async function monthSpend(userId: string): Promise<Spend> {
  // all of the month's calls, not the first 1,000: a capped read let a busy account run past its budget
  const data = await runsSince<{ agent: string; cost_usd: number | null }>("agent, cost_usd", monthStartUTC(), userId);
  const s: Spend = { total: 0, byCategory: { research: 0, writing: 0, core: 0 } };
  for (const r of data) {
    const c = Number(r.cost_usd) || 0;
    s.total += c;
    s.byCategory[categoryOf(r.agent)] += c;
  }
  return s;
}

// call before every model request
export async function assertBudget(userId: string, agent: string) {
  const category = categoryOf(agent);
  const [spend, monthly] = await Promise.all([monthSpend(userId), monthlyBudget(userId)]);
  const check = budgetCheck(spend, monthly, category);
  if (!check.ok) throw new BudgetExceeded(check.reason, category);
  // who goes first when credit is short (lib/credit-rules)
  const g = await creditGate(userId, category, spend);
  if (g.ok) return;
  if (g.kind === "starter") throw new BudgetExceeded(g.reason, category);
  throw new CreditHeld(g.kind, g.reason, holdUntil());
}
