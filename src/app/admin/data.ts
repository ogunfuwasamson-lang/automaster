import "server-only";
import { creditPolicy } from "@/lib/credit";
import { DEFAULT_POLICY } from "@/lib/credit-policy";
import { admin } from "@/lib/supabase/admin";
import { MILESTONES, MILESTONE_ACTIONS, journeys, type MilestoneKey, type UserJourney } from "@/lib/first-submission";
import { teamIds } from "@/lib/team";
import { budgetFor } from "@/lib/budget";
import { monthStartUTC } from "@/lib/pricing";

// everything the operator console counts, loaded once per request: every account, every application, the
// milestones each user reached, and when they were last active. team and test accounts are flagged, and left out
// of the numbers unless the operator asks to see everyone.

export const STAGES: { key: MilestoneKey | "signup"; label: string }[] = [{ key: "signup", label: "Signed up" }, ...MILESTONES.map((m) => ({ key: m.key, label: m.label }))];

export const SUBMITTED = new Set(["submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "rejected", "declined"]);

export interface Payment {
  userId: string;
  kind: string;
  amount: number | null;
  currency: string | null;
  at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  location: string | null; // where they live ("Lagos, Nigeria"), else the country they signed up from
  citizenship: string | null;
  joined: string;
  plan: string;
  admin: boolean;
  team: boolean;
  source: string;
  invited: boolean;
  lastSignIn: string | null;
  lastActive: string | null; // the latest of: signing in, doing something in the app, talking to the interviewer
  stage: MilestoneKey | "signup";
  journey: UserJourney;
  apps: Record<string, number>;
  appCount: number;
  submitted: number;
  waiting: number; // applications the agents stopped on for this user
  docs: number;
  docKinds: Record<string, number>; // document kind -> how many
  deactivated: boolean; // staff turned the account off: no sign-in, agents stopped
  gmail: { email: string; status: string } | null;
  budget: number; // this month's AI allowance
  payments: Payment[];
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
  program: string | null;
  host: string | null;
  updated: string | null;
  submittedAt: string | null;
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

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

// supabase hands back at most 1,000 rows a request whatever .limit() says: page through, or the counts are wrong
export async function every<T>(page: (from: number, to: number) => Page<T>, cap = 200_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// when each account last signed in (auth keeps it; profiles don't)
// last sign-in per account, and which accounts are deactivated (banned in auth)
async function signIns(): Promise<{ out: Map<string, string>; banned: Set<string>; names: Map<string, string> }> {
  const out = new Map<string, string>();
  const banned = new Set<string>();
  const names = new Map<string, string>(); // the name google gave at sign-in, when there is one
  const auth = admin().auth.admin;
  for (let page = 1; page < 200; page++) {
    const { data, error } = await auth.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.last_sign_in_at) out.set(u.id, u.last_sign_in_at);
      const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
      const nm = (meta.full_name || meta.name || "").trim();
      if (nm) names.set(u.id, nm);
      const until = (u as { banned_until?: string | null }).banned_until;
      if (until && Date.parse(until) > Date.now()) banned.add(u.id);
    }
    if (data.users.length < 1000) break;
  }
  return { out, banned, names };
}

const later = (a: string | null | undefined, b: string | null | undefined) => (!a ? (b ?? null) : !b ? a : a > b ? a : b);

type ProfileRow = { id: string; email: string; full_name: string | null; billing_country: string | null; identity: unknown; first: string | null; last: string | null; preferred: string | null; created_at: string; plan: string | null; plan_until: string | null; monthly_budget_usd: number | null; is_admin: boolean | null; signup_source: unknown; referred_by: string | null };
type AppRow = { id: string; user_id: string; status: string; runner_status: string | null; runner_note: string | null; runner_state: unknown; runner_updated_at: string | null; portal_url: string | null; submitted_at: string | null; programs: unknown };

export async function loadAdmin() {
  const db = admin();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const month = monthStartUTC();
  const [team, profiles, apps, steps, activity, signin, mail, docs, pays] = await Promise.all([
    teamIds(),
    every<ProfileRow>((a, b) => db.from("profiles").select("id, email, full_name, billing_country, identity:profile->identity, first:portal_details->>legal_first_name, last:portal_details->>legal_last_name, preferred:portal_details->>preferred_name, created_at, plan, plan_until, monthly_budget_usd, is_admin, signup_source, referred_by").order("created_at").range(a, b)),
    every<AppRow>((a, b) => db.from("applications").select("id, user_id, status, runner_status, runner_note, runner_state, runner_updated_at, portal_url, submitted_at, programs(name, schools(name))").order("id").range(a, b)),
    every<{ user_id: string; action: string; created_at: string }>((a, b) => db.from("events").select("user_id, action, created_at").in("action", MILESTONE_ACTIONS).order("created_at", { ascending: true }).range(a, b)),
    // what the user did: their own actions, plus each message they sent the interviewer
    every<{ user_id: string; created_at: string }>((a, b) => db.from("events").select("user_id, created_at").or("actor.eq.user,action.eq.interview.turn").gte("created_at", monthAgo).order("created_at", { ascending: false }).range(a, b)),
    signIns().catch(() => ({ out: new Map<string, string>(), banned: new Set<string>(), names: new Map<string, string>() })),
    every<{ user_id: string; email: string; status: string }>((a, b) => db.from("mail_accounts").select("user_id, email, status").range(a, b)),
    every<{ user_id: string; kind: string }>((a, b) => db.from("documents").select("user_id, kind").range(a, b)),
    every<{ user_id: string; kind: string; amount: number | null; currency: string | null; created_at: string }>((a, b) => db.from("billing_events").select("user_id, kind, amount, currency, created_at").order("created_at", { ascending: false }).range(a, b)),
  ]);

  const policy = await creditPolicy().catch(() => DEFAULT_POLICY);
  const logins = signin.out;
  const last = new Map<string, string>();
  for (const e of activity) if (!last.has(e.user_id)) last.set(e.user_id, e.created_at);
  const trips = new Map(journeys(profiles.map((p) => ({ id: p.id, email: p.email, created_at: p.created_at })), steps).map((j) => [j.userId, j]));
  const email = new Map(profiles.map((p) => [p.id, p.email]));
  const gmail = new Map(mail.map((m) => [m.user_id, { email: m.email, status: m.status }]));
  const docCount = new Map<string, number>();
  const docKinds = new Map<string, Record<string, number>>();
  for (const d of docs) {
    docCount.set(d.user_id, (docCount.get(d.user_id) ?? 0) + 1);
    const k = docKinds.get(d.user_id) ?? {};
    k[d.kind] = (k[d.kind] ?? 0) + 1;
    docKinds.set(d.user_id, k);
  }
  const payments: Payment[] = pays.map((p) => ({ userId: p.user_id, kind: p.kind, amount: p.amount != null ? Number(p.amount) : null, currency: p.currency, at: p.created_at }));

  const allApps: AdminApp[] = apps.map((a) => {
    const st = (a.runner_state ?? {}) as { reason?: string; last_url?: string };
    const p = a.programs as { name?: string; schools?: { name?: string } } | null;
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
      program: p?.name ?? null,
      host: host(st.last_url ?? a.portal_url),
      updated: a.runner_updated_at,
      submittedAt: a.submitted_at,
    };
  });
  const appsOf = new Map<string, AdminApp[]>();
  for (const a of allApps) appsOf.set(a.userId, [...(appsOf.get(a.userId) ?? []), a]);

  const users: AdminUser[] = profiles.map((p) => {
    const j = trips.get(p.id)!;
    const reached = [...MILESTONES].reverse().find((m) => j.at[m.key]);
    const mine = appsOf.get(p.id) ?? [];
    const counts: Record<string, number> = {};
    for (const a of mine) counts[a.status] = (counts[a.status] ?? 0) + 1;
    const paid = payments.filter((x) => x.userId === p.id);
    const thisMonth = paid.filter((x) => x.at >= month);
    return {
      id: p.id,
      email: p.email,
      // the name from wherever they gave it: the profile, the interview, the form details, then google
      name: p.full_name?.trim() || idOf(p).full_name?.trim() || [p.first, p.last].map((x) => x?.trim()).filter(Boolean).join(" ") || p.preferred?.trim() || signin.names.get(p.id) || null,
      ...placeOf(p),
      joined: p.created_at,
      plan: p.plan ?? "free",
      admin: !!p.is_admin,
      team: team.has(p.id),
      source: sourceOf(p.signup_source),
      invited: !!p.referred_by,
      lastSignIn: logins.get(p.id) ?? null,
      lastActive: later(last.get(p.id), logins.get(p.id)),
      stage: reached?.key ?? "signup",
      journey: j,
      apps: counts,
      appCount: mine.length,
      submitted: mine.filter((a) => SUBMITTED.has(a.status)).length,
      waiting: mine.filter((a) => a.runner === "needs_you" || a.runner === "failed").length,
      docs: docCount.get(p.id) ?? 0,
      docKinds: docKinds.get(p.id) ?? {},
      deactivated: signin.banned.has(p.id),
      gmail: gmail.get(p.id) ?? null,
      budget: budgetFor(
        { plan: p.plan, plan_until: p.plan_until, monthly_budget_usd: p.monthly_budget_usd, is_admin: p.is_admin },
        thisMonth.filter((x) => x.kind === "submission").length,
        thisMonth.filter((x) => x.kind === "pack").length,
        policy.staffMonthlyUsd,
      ),
      payments: paid,
    };
  });

  return { users, apps: allApps, team, payments };
}

export type AdminData = Awaited<ReturnType<typeof loadAdmin>>;

// the slice the operator is looking at: real users only, unless they asked for everyone
export function scope(d: AdminData, everyone: boolean) {
  const users = everyone ? d.users : d.users.filter((u) => !u.team);
  const ids = new Set(users.map((u) => u.id));
  return { users, ids, apps: d.apps.filter((a) => ids.has(a.userId)), payments: d.payments.filter((p) => ids.has(p.userId)), hidden: d.users.length - users.length };
}

// a two-letter code as a country name ("NG" -> "Nigeria"); anything else as written
const regions = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();
export function countryName(c: string | null | undefined): string | null {
  const v = (c ?? "").trim();
  if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) {
    try {
      return regions?.of(v.toUpperCase()) ?? v.toUpperCase();
    } catch {
      return v.toUpperCase();
    }
  }
  return v;
}

// where someone is: the city and country they told the interviewer, else the country their payments are priced in
type Identity = { full_name?: string | null; city?: string | null; country_of_residence?: string | null; citizenship?: string | null };
const idOf = (p: Pick<ProfileRow, "identity">): Identity => (p.identity && typeof p.identity === "object" ? (p.identity as Identity) : {});
function placeOf(p: Pick<ProfileRow, "billing_country" | "identity">): { location: string | null; citizenship: string | null } {
  const i = idOf(p);
  const city = typeof i.city === "string" ? i.city.trim() : "";
  const country = countryName(i.country_of_residence) ?? countryName(p.billing_country);
  const location = [city, country].filter(Boolean).join(", ") || null;
  return { location, citizenship: countryName(i.citizenship) };
}
