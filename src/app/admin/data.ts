import "server-only";
import { admin } from "@/lib/supabase/admin";
import { MILESTONES, MILESTONE_ACTIONS, journeys, type MilestoneKey, type UserJourney } from "@/lib/first-submission";
import { teamIds } from "@/lib/team";

// everything the operator console counts, loaded once per request: every account, every application, the
// milestones each user reached, and when they were last active. team and test accounts are flagged, and left out
// of the numbers unless the operator asks to see everyone.

export const STAGES: { key: MilestoneKey | "signup"; label: string }[] = [{ key: "signup", label: "Signed up" }, ...MILESTONES.map((m) => ({ key: m.key, label: m.label }))];

export interface AdminUser {
  id: string;
  email: string;
  joined: string;
  plan: string;
  team: boolean;
  source: string;
  lastActive: string | null;
  stage: MilestoneKey | "signup";
  journey: UserJourney;
  apps: Record<string, number>;
  waiting: number; // applications stopped for this user
}

export interface AdminApp {
  id: string;
  userId: string;
  email: string;
  team: boolean;
  status: string;
  runner: string;
  reason: string | null;
  note: string;
  school: string;
  host: string | null;
  updated: string | null;
}

export function sourceOf(src: unknown): string {
  const s = (src ?? {}) as { utm_source?: string; referrer?: string; ref?: string; invite?: string };
  if (s.utm_source) return s.utm_source.replace(/^www\./, "");
  if (s.invite || s.ref) return "invite";
  if (s.referrer) {
    try {
      return new URL(s.referrer).hostname.replace(/^www\./, "");
    } catch {
      return s.referrer;
    }
  }
  return "direct";
}

const host = (u: string | null | undefined) => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
};

export async function loadAdmin() {
  const db = admin();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [team, { data: profiles }, { data: apps }, { data: steps }, { data: activity }] = await Promise.all([
    teamIds(),
    db.from("profiles").select("id, email, created_at, plan, signup_source"),
    db.from("applications").select("id, user_id, status, runner_status, runner_note, runner_state, runner_updated_at, portal_url, programs(schools(name))").limit(20000),
    db.from("events").select("user_id, action, created_at").in("action", MILESTONE_ACTIONS).order("created_at", { ascending: true }).limit(50000),
    db.from("events").select("user_id, created_at").eq("actor", "user").gte("created_at", monthAgo).order("created_at", { ascending: false }).limit(20000),
  ]);
  const last = new Map<string, string>();
  for (const e of activity ?? []) if (!last.has(e.user_id)) last.set(e.user_id, e.created_at);
  const trips = new Map(journeys((profiles ?? []).map((p) => ({ id: p.id, email: p.email, created_at: p.created_at })), steps ?? []).map((j) => [j.userId, j]));
  const email = new Map((profiles ?? []).map((p) => [p.id as string, p.email as string]));

  const allApps: AdminApp[] = (apps ?? []).map((a) => {
    const st = (a.runner_state ?? {}) as { reason?: string; last_url?: string };
    const p = a.programs as unknown as { schools?: { name?: string } } | null;
    return {
      id: a.id,
      userId: a.user_id,
      email: email.get(a.user_id) ?? "",
      team: team.has(a.user_id),
      status: a.status,
      runner: a.runner_status ?? "idle",
      reason: a.runner_status === "failed" ? "failed" : (st.reason ?? null),
      note: a.runner_note ?? "",
      school: p?.schools?.name ?? "Unknown school",
      host: host(st.last_url ?? a.portal_url),
      updated: a.runner_updated_at,
    };
  });

  const users: AdminUser[] = (profiles ?? []).map((p) => {
    const j = trips.get(p.id)!;
    const reached = [...MILESTONES].reverse().find((m) => j.at[m.key]);
    const mine = allApps.filter((a) => a.userId === p.id);
    const apps: Record<string, number> = {};
    for (const a of mine) apps[a.status] = (apps[a.status] ?? 0) + 1;
    return {
      id: p.id,
      email: p.email,
      joined: p.created_at,
      plan: p.plan ?? "free",
      team: team.has(p.id),
      source: sourceOf(p.signup_source),
      lastActive: last.get(p.id) ?? null,
      stage: reached?.key ?? "signup",
      journey: j,
      apps,
      waiting: mine.filter((a) => a.runner === "needs_you" || a.runner === "failed").length,
    };
  });

  return { users, apps: allApps, team };
}

export type AdminData = Awaited<ReturnType<typeof loadAdmin>>;

// the slice the operator is looking at: real users only, unless they asked for everyone
export function scope(d: AdminData, everyone: boolean) {
  const users = everyone ? d.users : d.users.filter((u) => !u.team);
  const ids = new Set(users.map((u) => u.id));
  return { users, apps: d.apps.filter((a) => ids.has(a.userId)), hidden: d.users.length - users.length };
}
