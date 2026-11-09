// time from sign-up to the first submission the agents made, and every step on the way. the goal it measures:
// someone who signs up gets a school submission quickly. pure, so the admin page and tests share it.

export const MILESTONES = [
  { key: "profile", label: "Started their profile", actions: ["interview.turn", "profile.patched", "profile.details_saved"] },
  { key: "shortlist", label: "First program shortlisted", actions: ["program.shortlisted", "application.shortlisted"] },
  { key: "draft", label: "First essay ready to review", actions: ["artifact.ready_for_user"] },
  { key: "signed", label: "First packet signed", actions: ["packet.approved"] },
  { key: "started", label: "Agents start on a portal", actions: ["runner.started"] },
  { key: "account", label: "Portal account made", actions: ["runner.account_created"] },
  { key: "submitted", label: "First submission", actions: ["runner.submitted"] },
] as const;
export type MilestoneKey = (typeof MILESTONES)[number]["key"];
export const MILESTONE_ACTIONS = [...new Set(MILESTONES.flatMap((m) => m.actions as readonly string[]))];

export interface UserJourney {
  userId: string;
  email: string;
  signedUp: string;
  at: Partial<Record<MilestoneKey, string>>; // first time each step happened
  reached: MilestoneKey | null; // the furthest step so far
  toSubmitMs: number | null;
}

export function journeys(users: { id: string; email: string | null; created_at: string }[], events: { user_id: string; action: string; created_at: string }[]): UserJourney[] {
  const keyOf = new Map<string, MilestoneKey>();
  for (const m of MILESTONES) for (const a of m.actions) keyOf.set(a, m.key);
  const first = new Map<string, Partial<Record<MilestoneKey, string>>>();
  for (const e of events) {
    const k = keyOf.get(e.action);
    if (!k) continue;
    const at = first.get(e.user_id) ?? {};
    if (!at[k] || e.created_at < at[k]!) at[k] = e.created_at;
    first.set(e.user_id, at);
  }
  return users.map((u) => {
    const at = first.get(u.id) ?? {};
    const reached = [...MILESTONES].reverse().find((m) => at[m.key])?.key ?? null;
    const toSubmitMs = at.submitted ? Date.parse(at.submitted) - Date.parse(u.created_at) : null;
    return { userId: u.id, email: u.email ?? "", signedUp: u.created_at, at, reached, toSubmitMs };
  });
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface FunnelSummary {
  users: number;
  submitted: number;
  medianToSubmitMs: number | null;
  within15m: number;
  within24h: number;
  within7d: number;
  steps: { key: MilestoneKey; label: string; users: number; medianFromSignupMs: number | null; medianFromPreviousMs: number | null }[];
}

export function summarize(js: UserJourney[]): FunnelSummary {
  const done = js.filter((j) => j.toSubmitMs != null).map((j) => j.toSubmitMs!);
  const under = (ms: number) => done.filter((d) => d <= ms).length;
  const steps = MILESTONES.map((m, i) => {
    const hit = js.filter((j) => j.at[m.key]);
    const fromSignup = hit.map((j) => Date.parse(j.at[m.key]!) - Date.parse(j.signedUp));
    // from the step before it that this user reached (a step can be skipped: a document upload has no essay to review)
    const fromPrev = hit.map((j) => {
      const prev = MILESTONES.slice(0, i).reverse().find((x) => j.at[x.key]);
      return Date.parse(j.at[m.key]!) - Date.parse(prev ? j.at[prev.key]! : j.signedUp);
    });
    return { key: m.key, label: m.label, users: hit.length, medianFromSignupMs: median(fromSignup), medianFromPreviousMs: median(fromPrev) };
  });
  return { users: js.length, submitted: done.length, medianToSubmitMs: median(done), within15m: under(15 * 60_000), within24h: under(86_400_000), within7d: under(7 * 86_400_000), steps };
}

// "14 min", "3.2 h", "5 d"
export function duration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 0) return "0 min";
  const min = ms / 60_000;
  if (min < 90) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} h`;
  return `${Math.round(h / 24)} d`;
}
