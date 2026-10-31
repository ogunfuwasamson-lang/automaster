// plans and their limits. every applicant gets the whole product; what differs is how they pay (lib/geo-pricing)
// and the monthly allowance of agent work (the ai budget, the hard cost ceiling).
//   free: preparing applications. in africa each submission is paid for (and adds to the allowance); elsewhere
//         the first 3 applications are free.
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
  pro: { id: "pro", name: "pro", aiBudgetUsd: 12, ...EVERYTHING },
};

// each paid submission in africa adds this much agent work to the month
export const BUDGET_PER_SUBMISSION_USD = 1;

// pro counts only while paid up (plan_until, pushed forward by each renewal). old "pro"/"season" accounts from when
// everything was free have no date: they're free now (a season pass granted by hand keeps working without a date).
export function planOf(id: string | null | undefined, until?: string | null, now = new Date()): Plan {
  if (id === "pro" && until && Date.parse(until) > now.getTime()) return PLANS.pro;
  if (id === "season") return PLANS.pro;
  return PLANS.free;
}
