// plans and their limits. the ai budget is the hard cost ceiling (what the agents may spend on AI for one
// person in a calendar month); the other limits keep usage inside it.
// free: the whole product, with a smaller monthly allowance of agent work. when it runs out, work waits for the
// 1st of the month, or the applicant upgrades.
// pro: paid monthly through paystack ($15, or ₦4,500 in naira). season: paid once for a six-month cycle.

export type PlanId = "free" | "pro" | "season";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceNote?: string;
  blurb: string;
  aiBudgetUsd: number; // per calendar month
  maxRegions: number;
  programsPerRun: number;
  recon_runs_per_month: number;
  maxActiveApplications: number; // applications being prepared or later
  maxDocuments: number;
  features: string[];
}

const EVERYTHING = {
  maxRegions: 9,
  programsPerRun: 20,
  recon_runs_per_month: 6,
  maxActiveApplications: 15,
  maxDocuments: 40,
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "free",
    priceLabel: "Free",
    blurb: "the whole product, with a monthly allowance of agent work",
    aiBudgetUsd: 7.5,
    ...EVERYTHING,
    features: [
      "all regions, bachelor's, master's and PhD",
      "15 applications with essays, briefs and red-team review",
      "agents fill and submit the portals",
      "fee-waiver and funding agent after admission",
      "a monthly allowance of agent work; it resets on the 1st",
    ],
  },
  pro: {
    id: "pro",
    name: "pro",
    priceLabel: "$15 / month",
    priceNote: "or ₦4,500 a month in Nigeria",
    blurb: "keep going when your free allowance runs out",
    aiBudgetUsd: 12,
    ...EVERYTHING,
    features: ["everything in Free", "more agent work every month", "no waiting for the 1st", "cancel any time; it runs to the end of the month you paid for"],
  },
  season: {
    id: "season",
    name: "season pass",
    priceLabel: "$199 / 6 months",
    blurb: "paid once for one admissions cycle",
    aiBudgetUsd: 25,
    ...EVERYTHING,
    features: ["everything in Pro", "the most agent work of any plan", "paid once for a full cycle (apply in autumn, decisions in spring)"],
  },
};

// the plan in force. pro counts only while paid up (plan_until, pushed forward by each renewal); accounts marked
// "pro" from when pro was free have no date and are on free. a season pass without a date was granted by hand.
export function planOf(id: string | null | undefined, until?: string | null, now = new Date()): Plan {
  const live = until ? Date.parse(until) > now.getTime() : false;
  if (id === "pro" && live) return PLANS.pro;
  if (id === "season" && (live || !until)) return PLANS.season;
  return PLANS.free;
}

// the monthly prices paystack charges, in the smallest unit of each currency
export const PRO_PRICE = { USD: 1500, NGN: 450000 } as const;
export const SEASON_PRICE = { USD: 19900 } as const;
export type Currency = keyof typeof PRO_PRICE;
