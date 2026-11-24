// plans and their limits. every applicant gets the whole product; what differs is how they pay (lib/geo-pricing).
// the agents work for an account once it has a submission credit, bought or earned through an invite
// (lib/credit-rules); aiBudgetUsd is only a monthly backstop against a fault, not an allowance anyone is sold.
//   free: pays in credits (lib/credit-prices): in africa a pack of 60.
//   pro:  $20 a month (outside africa): 160 credits a month. counts only while paid up.

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
  free: { id: "free", name: "free", aiBudgetUsd: 25, ...EVERYTHING },
  pro: { id: "pro", name: "pro", aiBudgetUsd: 15, ...EVERYTHING },
};

// what a paid submission adds to the backstop: nothing since 23 nov 2026. kept (at 0) so the budget sum and the
// operator console read the same
export const BUDGET_PER_SUBMISSION_USD = 0;

// pro counts only while paid up (plan_until, pushed forward by each renewal). old "pro"/"season" accounts from when
// everything was free have no date: they're free now (a season pass granted by hand keeps working without a date).
export function planOf(id: string | null | undefined, until?: string | null, now = new Date()): Plan {
  if (id === "pro" && until && Date.parse(until) > now.getTime()) return PLANS.pro;
  if (id === "season") return PLANS.pro;
  return PLANS.free;
}
