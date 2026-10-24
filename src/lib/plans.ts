// plans and their limits. the ai budget is the hard cost ceiling; the other limits keep
// usage inside it and make the free tier useful but clearly limited.
// prices are display values; billing (stripe / paystack) is wired separately.

export type PlanId = "free" | "pro" | "season";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  blurb: string;
  aiBudgetUsd: number; // per calendar month
  maxRegions: number;
  programsPerRun: number;
  recon_runs_per_month: number;
  maxActiveApplications: number; // applications being prepared or later
  maxDocuments: number;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "free",
    priceLabel: "$0",
    blurb: "see what the agents find for you",
    aiBudgetUsd: 1.5,
    maxRegions: 1,
    programsPerRun: 6,
    recon_runs_per_month: 1,
    maxActiveApplications: 1,
    maxDocuments: 5,
    features: [
      "profile from your documents + voice interview",
      "1 shortlist run: 6 programs in 1 region",
      "scholarship matches",
      "1 application with drafted essays and red-team review",
    ],
  },
  pro: {
    id: "pro",
    name: "pro",
    priceLabel: "$49 / month",
    blurb: "run your whole application season",
    aiBudgetUsd: 25,
    maxRegions: 9,
    programsPerRun: 20,
    recon_runs_per_month: 6,
    maxActiveApplications: 15,
    maxDocuments: 40,
    features: [
      "all regions, bachelor's, master's and PhD",
      "up to 6 shortlist runs a month, 20 programs each",
      "15 applications with essays, briefs and red-team review",
      "fee-waiver and funding agent after admission (phase 4)",
      "deadline tracking and the full audit log",
    ],
  },
  season: {
    id: "season",
    name: "season pass",
    priceLabel: "$199 / 6 months",
    blurb: "everything in pro for one admissions cycle, ~32% less",
    aiBudgetUsd: 25,
    maxRegions: 9,
    programsPerRun: 20,
    recon_runs_per_month: 6,
    maxActiveApplications: 15,
    maxDocuments: 40,
    features: ["everything in pro", "paid once for a full cycle (apply in autumn, decisions in spring)"],
  },
};

export function planOf(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
}
