// plans and their limits. every applicant gets the whole product; what differs is how they pay (lib/geo-pricing)
// and the monthly allowance of agent work (the ai budget, the hard cost ceiling).
//   free: preparing applications. in africa each submission is paid for; elsewhere
//         the first 3 applications are free. from 22 nov 2026 the agents are locked until a payment or two
//         invited friends finish setup (lib/credit-rules, lib/free-tier).
//   pro:  $20 a month (outside africa): up to 10 submissions a month and a bigger allowance. counts only while paid up.

export type PlanId = "free" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  aiBudgetUsd: number; // per calendar month
  maxRegions: number;
  programsPerRun: number;
  recon_runs_per_month: number;
  maxActiveApplications: number; // applications being prepared or later
  maxDocuments: number;
}

const EVERYTHING = { maxRegions: 9, programsPerRun: 20, recon_runs_per_month: 6, maxActiveApplications: 40, maxDocuments: 60 };

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", name: "free", aiBudgetUsd: 10, ...EVERYTHING },
  pro: { id: "pro", name: "pro", aiBudgetUsd: 10, ...EVERYTHING },
};

// a paid account's month is $10 whatever it bought (founder's call, 23 nov 2026): a submission or pack no longer
// adds to it. kept (at 0) so the budget sum and the operator console read the same
export const BUDGET_PER_SUBMISSION_USD = 0;

// pro counts only while paid up (plan_until, pushed forward by each renewal). old "pro"/"season" accounts from when
// everything was free have no date: they're free now (a season pass granted by hand keeps working without a date).
export function planOf(id: string | null | undefined, until?: string | null, now = new Date()): Plan {
  if (id === "pro" && until && Date.parse(until) > now.getTime()) return PLANS.pro;
  if (id === "season") return PLANS.pro;
  return PLANS.free;
}
