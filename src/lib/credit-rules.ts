// who gets the AI credit first. pure, so tests and the operator console agree with the agents.
//
//   paid:    paid for anything (pro, a pack, a one-off): never held back by the platform's daily limit.
//   staff:   admins and accounts marked as team: their own monthly cap (lib/budget), not held by the daily limit.
//   engaged: uploaded a document, connected gmail, or signed an application: the full free allowance, and they keep
//            going after the daily limit is reached (only a runaway day, twice the limit, holds them).
//   starter: none of the above yet: enough for the first shortlist (a small allowance for research and writing),
//            and their background work waits once the day's spend passes 60% of the limit, so serious users go first.
//
// interview, document reading and profile work ("core") is never held: it's cheap, and it's how a starter becomes
// engaged.

import type { Category, Spend } from "@/lib/pricing";
import { DEFAULT_POLICY, type CreditPolicy } from "@/lib/credit-policy";

export type Tier = "paid" | "staff" | "engaged" | "starter";
// the numbers live in lib/credit-policy (the operator edits them in the console)

export interface Signals {
  paid: boolean;
  staff: boolean;
  documents: number;
  gmail: boolean;
  signed: boolean;
}

export function tierOf(s: Signals): Tier {
  if (s.staff) return "staff";
  if (s.paid) return "paid";
  if (s.documents > 0 || s.gmail || s.signed) return "engaged";
  return "starter";
}

export const isSerious = (t: Tier) => t !== "starter";

export type Gate = { ok: true } | { ok: false; kind: "starter" | "day" | "inactive"; reason: string };

// reasons are shown to the applicant (job errors, the dashboard): plain words, no amounts
type Limits = Pick<CreditPolicy, "dailyLimitUsd" | "starterUsd" | "starterShareOfDay" | "runawayMultiple" | "inactiveDays">;

export function gate(a: { tier: Tier; category: Category; spend: Spend; todayUsd: number; lastActiveMs: number | null; now: number; policy?: Partial<Limits> }): Gate {
  const p = { ...DEFAULT_POLICY, ...a.policy };
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
