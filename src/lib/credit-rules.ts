// what each account may have the agents do. pure, so tests and the operator console agree with the agents.
//
// one unit (founder's call, 24 nov 2026): a submission credit is one application, prepared by the agents and submitted
// once the applicant signs. credits are bought (5 for a pack) or earned (a friend who joins through your invite and
// finishes setup earns you both one). AI spend is our cost, not the applicant's allowance.
//
//   staff:   admins and team accounts: their own monthly cap (lib/budget).
//   paid:    paid for anything, or holds a bought or earned credit: the agents work. our own guards, never shown as an
//            allowance: research stops for the month at RESEARCH_MONTHLY_USD (shortlist re-runs can't run away), and an
//            application that passes APPLICATION_CEILING_USD pauses for the operator to look at (lib/jobs).
//   locked:  everyone else: the free shortlist from the checked library (no model call), deadline alerts, and CV
//            reading and the interview up to FREE_MONTHLY_USD a month. no research or writing.
//
// the free submission every account got from 14 nov (bonus_submissions defaults to 1) doesn't unlock the agents on
// its own: only a credit bought or earned through an invite does. it does once the applicant has signed an application
// the agents prepared before the free tier, so that signed application goes in on it.

import type { Category, Spend } from "@/lib/pricing";

export type Tier = "paid" | "staff" | "locked";

// a free account's month: core work only (reading documents, the interview)
export const FREE_MONTHLY_USD = 0.5;
// an account the agents work for: research (finding and checking programmes) stops for the month here
export const RESEARCH_MONTHLY_USD = 3;
// one application's AI (planning, essays, reviews, fee waivers, the portal): past this it pauses for the operator.
// the only application submitted end to end so far cost $1.77 with its portal run; the top tenth cost under $1
export const APPLICATION_CEILING_USD = 3;

export interface Signals {
  paid: boolean; // pro, a pack, a one-off payment
  staff: boolean;
  credits?: number; // bought submission credits left
  earned?: number; // free credits earned through invites (joined through one and finished setup, or brought a friend who did)
  signedWithFree?: boolean; // a signed application waiting to be submitted, and a free submission to submit it with
}

export function lockedOut(s: Signals): boolean {
  if (s.staff || s.paid || s.signedWithFree) return false;
  return (s.credits ?? 0) <= 0 && (s.earned ?? 0) <= 0;
}

export function tierOf(s: Signals): Tier {
  if (s.staff) return "staff";
  if (lockedOut(s)) return "locked";
  return "paid";
}

// the month's AI an account can use, for the operator console: free accounts' small amount, everyone else's plan
export function monthlyCapFor(tier: Tier, planBudget: number): number {
  return tier === "locked" ? Math.min(planBudget, FREE_MONTHLY_USD) : planBudget;
}

// reasons are shown to the applicant (job errors, the dashboard): plain words, no amounts
export const LOCKED_REASON = "the agents start when you have a submission: buy a pack, or invite a friend and you both get one free";
export const RESEARCH_REASON = "this month's programme research is done: it picks up again next month";
export const CEILING_REASON = "this application is waiting for a check by the Ivyward team";

export type Gate = { ok: true } | { ok: false; kind: "locked" | "research"; reason: string };

export function gate(a: { tier: Tier; category: Category; spend: Spend }): Gate {
  if (a.tier === "staff") return { ok: true };
  if (a.tier === "locked") {
    if (a.category === "core" && a.spend.total < FREE_MONTHLY_USD) return { ok: true };
    return { ok: false, kind: "locked", reason: LOCKED_REASON };
  }
  if (a.category === "research" && a.spend.byCategory.research >= RESEARCH_MONTHLY_USD) return { ok: false, kind: "research", reason: RESEARCH_REASON };
  return { ok: true };
}

export const overCeiling = (applicationUsd: number) => applicationUsd >= APPLICATION_CEILING_USD;

// when a held job should be tried again: tomorrow (spread over the first half hour so they don't all start at once)
export function nextDayUTC(now = new Date(), jitterMs = 0): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) + jitterMs).toISOString();
}

export function dayStartUTC(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}
