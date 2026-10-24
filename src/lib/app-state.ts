// mirror of app_transitions in the db. the db trigger is the source of truth;
// this exists so the ui and agents can reason about next moves without a round trip.

export const APP_STATUSES = [
  "researching", "shortlisted", "preparing", "ready_for_review", "packet_approved",
  "submitted", "under_review", "interview", "admitted", "waitlisted", "rejected",
  "accepted", "declined", "withdrawn", "dropped",
] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export const TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  researching: ["shortlisted", "dropped"],
  shortlisted: ["preparing", "dropped", "researching"],
  preparing: ["ready_for_review", "dropped"],
  ready_for_review: ["packet_approved", "preparing", "dropped"],
  packet_approved: ["submitted", "preparing", "dropped"],
  submitted: ["under_review", "interview", "admitted", "waitlisted", "rejected", "withdrawn"],
  under_review: ["interview", "admitted", "waitlisted", "rejected", "withdrawn"],
  interview: ["admitted", "waitlisted", "rejected", "withdrawn"],
  waitlisted: ["admitted", "rejected", "withdrawn"],
  admitted: ["accepted", "declined"],
  rejected: [],
  accepted: [],
  declined: [],
  withdrawn: [],
  dropped: [],
};

export function canTransition(from: AppStatus, to: AppStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const TERMINAL: AppStatus[] = APP_STATUSES.filter((s) => TRANSITIONS[s].length === 0);
