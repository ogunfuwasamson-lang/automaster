import "server-only";
import { admin } from "@/lib/supabase/admin";
import { budgetCheck, categoryOf, monthStartUTC, type Category, type Spend } from "@/lib/pricing";
import { planOf, type Plan } from "@/lib/plans";

export class BudgetExceeded extends Error {
  constructor(public reason: string, public category: Category) {
    super(`budget: ${reason}`);
  }
}

export async function userPlan(userId: string): Promise<{ plan: Plan; budget: number }> {
  const { data } = await admin().from("profiles").select("plan, plan_until, monthly_budget_usd").eq("id", userId).maybeSingle();
  const plan = planOf(data?.plan, data?.plan_until);
  // per-user override (e.g. the founder's own account) beats the plan's budget
  const own = data?.monthly_budget_usd != null ? Number(data.monthly_budget_usd) : null;
  return { plan, budget: own ?? plan.aiBudgetUsd };
}

export async function monthlyBudget(userId: string): Promise<number> {
  return (await userPlan(userId)).budget;
}

export async function monthSpend(userId: string): Promise<Spend> {
  const { data } = await admin()
    .from("agent_runs")
    .select("agent, cost_usd")
    .eq("user_id", userId)
    .gte("started_at", monthStartUTC())
    .not("cost_usd", "is", null)
    .limit(10000);
  const s: Spend = { total: 0, byCategory: { research: 0, writing: 0, core: 0 } };
  for (const r of data ?? []) {
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
}
