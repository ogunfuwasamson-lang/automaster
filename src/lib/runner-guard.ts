import { NAV_BUDGET, VISION_BUDGET } from "@/lib/cloud-engine";

// guards against a run that keeps stopping on the same page. before these, one portal was restarted 475 times in
// nine days, each run spending up to 30 navigator and 60 screenshot model calls on a page it could never pass.

export interface GuardState {
  lastFingerprint?: string;
  stopFingerprint?: string; // the page the last "stuck" stop happened on
  stuckRepeats?: number; // stuck stops in a row on that same page
  navCalls?: number;
  visionCalls?: number;
}

export const REPEAT_NOTE =
  "the agents stopped on the same page of this portal several times. Open the portal, get past that page (or tell Ivyward AI what it needs), then choose Try again";

// how much of the model budget this run gets: all of it, a small look (the last stop was on this page), or none
export function stuckBudget(state: GuardState): "full" | "small" | "stop" {
  const n = state.stuckRepeats ?? 0;
  if (n >= 2) return "stop";
  if (n === 1) {
    // a quick second look: a few navigator steps and a few screenshots, then hand over
    state.navCalls = Math.max(state.navCalls ?? 0, NAV_BUDGET - 6);
    state.visionCalls = Math.max(state.visionCalls ?? 0, VISION_BUDGET - 12);
    return "small";
  }
  return "full";
}

// what to remember after a stop: a "stuck" on the same page as the previous one counts up; anything else resets
export function stuckMark(before: GuardState, after: GuardState, reason: string | null | undefined): Pick<GuardState, "stopFingerprint" | "stuckRepeats"> {
  if (reason !== "stuck") return { stopFingerprint: undefined, stuckRepeats: 0 };
  const page = after.lastFingerprint ?? "";
  const same = !!page && page === before.stopFingerprint;
  return { stopFingerprint: page || undefined, stuckRepeats: same ? (before.stuckRepeats ?? 0) + 1 : 1 };
}
