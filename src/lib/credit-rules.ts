// who gets the AI credit first. pure, so tests and the operator console agree with the agents.
//
//   paid:    paid for anything (pro, a pack, a one-off): never held back by the platform's daily limit.
//   staff:   admins and accounts marked as team: their own monthly cap (lib/budget), not held by the daily limit.
//   engaged: uploaded a document, connected gmail, or signed an application: the full free allowance, and they keep
//            going after the daily limit is reached (only a runaway day, twice the limit, holds them).
//   starter: none of the above yet: enough for the first shortlist (a small allowance for research and writing),
//            and their background work waits once the day's spend passes 60% of the limit, so serious users go first.
//   locked:  the free tier from 22 nov 2026 (founder's call, marketing plan): a new account that hasn't paid and
//            hasn't brought UNLOCK_FRIENDS friends who finished setup. no research or writing at all: their shortlist
//            comes from the checked library with no model call (lib/free-tier). core work (reading a CV, the
//            interview) runs up to FREE_MONTHLY_USD so the profile still fills in. paying or the second friend unlocks
//            the agents. applies to every account, old and new (founder's call, 21 nov 2026).
//
// what each kind of account may spend on AI in a calendar month (founder's call, 23 nov 2026):
//   free (locked):   FREE_MONTHLY_USD, CV reading and the interview only
//   invited:         INVITED_MONTHLY_USD once UNLOCK_FRIENDS invited friends finish setup without a payment: a fit
//                    check on the shortlist and about one application prepared
//   paid:            $10 (lib/plans), whatever they bought
//
// interview, document reading and profile work ("core") is never held for the other tiers: it's cheap, and it's how
// a starter becomes engaged.

import type { Category, Spend } from "@/lib/pricing";
import { DEFAULT_POLICY, type CreditPolicy } from "@/lib/credit-policy";

export type Tier = "paid" | "staff" | "engaged" | "starter" | "locked";

// the free tier (above): accounts made from this moment on start locked
export const FREE_TIER_FROM = "2026-11-22T00:00:00Z";
// friends who finish setup through your invite link before the agents unlock for you
export const UNLOCK_FRIENDS = 2;
// a free account's month: core work only (reading documents, the interview), the agents stay locked
export const FREE_MONTHLY_USD = 0.5;
// an account unlocked by invites but not paid: everything, up to this a month
export const INVITED_MONTHLY_USD = 2;
// the numbers live in lib/credit-policy (the operator edits them in the console)

export interface Signals {
  paid: boolean;
  staff: boolean;
  documents: number;
  gmail: boolean;
  signed: boolean;
  // when the account was made (ISO), and how many friends it invited have finished setup. both optional: callers
  // that don't know them (the operator console's older views) get the pre-free-tier answer
  createdAt?: string | null;
  friendsDone?: number;
}

// a new account that hasn't paid and hasn't brought enough friends
export function lockedOut(s: Signals): boolean {
  if (s.staff || s.paid) return false;
  return (s.friendsDone ?? 0) < UNLOCK_FRIENDS;
}

export function tierOf(s: Signals): Tier {
  if (s.staff) return "staff";
  if (s.paid) return "paid";
  if (lockedOut(s)) return "locked";
  if (s.documents > 0 || s.gmail || s.signed) return "engaged";
  return "starter";
}

export const isSerious = (t: Tier) => t !== "starter" && t !== "locked";

// the month's AI allowance for an account of this tier, given its plan budget (lib/budget): free and invited
// accounts are held to their own smaller amounts by the gate below; this is what the operator console shows
export function monthlyCapFor(tier: Tier, planBudget: number): number {
  if (tier === "locked") return Math.min(planBudget, FREE_MONTHLY_USD);
  if (tier === "starter" || tier === "engaged") return Math.min(planBudget, INVITED_MONTHLY_USD);
  return planBudget;
}

export const LOCKED_REASON = "the agents unlock when you buy your first submission, or when 2 friends you invite finish setup";
export const INVITED_REASON = "this month's free allowance is used: buy your first submission to keep the agents working";

export type Gate = { ok: true } | { ok: false; kind: "starter" | "day" | "inactive" | "locked"; reason: string };

// reasons are shown to the applicant (job errors, the dashboard): plain words, no amounts
type Limits = Pick<CreditPolicy, "dailyLimitUsd" | "starterUsd" | "starterShareOfDay" | "runawayMultiple" | "inactiveDays">;

export function gate(a: { tier: Tier; category: Category; spend: Spend; todayUsd: number; lastActiveMs: number | null; now: number; policy?: Partial<Limits> }): Gate {
  const p = { ...DEFAULT_POLICY, ...a.policy };
  if (a.tier === "locked") {
    if (a.category === "core" && a.spend.total < FREE_MONTHLY_USD) return { ok: true };
    return { ok: false, kind: "locked", reason: LOCKED_REASON };
  }
  // unlocked by invites, not paid: the month's allowance covers everything, core work included
  if ((a.tier === "starter" || a.tier === "engaged") && a.spend.total >= INVITED_MONTHLY_USD) return { ok: false, kind: "locked", reason: INVITED_REASON };
  if (a.category === "core") return { ok: true };
  if (a.tier === "paid" || a.tier === "staff") return { ok: true };
  if (a.tier === "starter" && a.spend.byCategory.research + a.spend.byCategory.writing >= p.starterUsd)
    return { ok: false, kind: "starter", reason: "starter allowance used: upload a document or connect Gmail to keep going" };
  const limit = Math.max(0, p.dailyLimitUsd);
  if (limit > 0) {
    const cut = a.tier === "starter" ? limit * p.starterShareOfDay : limit * p.runawayMultiple;
    if (a.todayUsd >= cut) return { ok: false, kind: "day", reason: "busy today: this picks up again tomorrow" };
  }
  if (p.inactiveDays > 0 && a.category === "research" && a.lastActiveMs != null && a.now - a.lastActiveMs > p.inactiveDays * 86_400_000)
    return { ok: false, kind: "inactive", reason: "paused while you're away: it picks up when you're back" };
  return { ok: true };
}

// when a held job should be tried again: tomorrow (spread over the first half hour so they don't all start at once)
export function nextDayUTC(now = new Date(), jitterMs = 0): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) + jitterMs).toISOString();
}

export function dayStartUTC(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}
