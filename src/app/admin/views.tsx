import { runsSince } from "@/lib/runs";
import Link from "next/link";
import type { ReactNode } from "react";
import { admin } from "@/lib/supabase/admin";
import { categoryOf, monthStartUTC, CATEGORY_SHARE, type Category } from "@/lib/pricing";
import { planOf } from "@/lib/plans";
import { teamIds } from "@/lib/team";
import { LessonsAdmin } from "@/components/learning/lessons-admin";
import { GrowthAdmin } from "@/components/growth/growth-admin";
import { MILESTONES, duration, summarize } from "@/lib/first-submission";
import { STAGES, loadAdmin, scope, type AdminApp, type AdminUser } from "./data";
import { TeamToggle } from "./team-toggle";

// the operator console's views. each loads its own data, so switching views stays quick.

const $ = (n: number) => `$${n.toFixed(2)}`;
const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const th = "px-4 py-2.5 text-left text-[12px] font-medium text-muted";
const td = "px-4 py-3 tabular-nums";

function ago(iso: string | null | undefined) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

// ---- building blocks ----

function Section({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {note && <p className="mt-0.5 text-[13.5px] text-muted">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

type Tone = "go" | "stop" | "signal" | undefined;
const toneText = (t: Tone) => (t === "go" ? "text-go" : t === "stop" ? "text-stop" : t === "signal" ? "text-signal" : "");

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: Tone }) {
  return (
    <Card className="p-4">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className={`mt-1 font-serif text-[30px] leading-none tabular-nums ${toneText(tone)}`}>{value}</dd>
      {sub && <dd className="mt-1.5 text-[12.5px] text-muted">{sub}</dd>}
    </Card>
  );
}

function Pill({ tone, children }: { tone?: Tone; children: ReactNode }) {
  const cls = tone === "go" ? "border-go/30 text-go" : tone === "stop" ? "border-stop/30 text-stop" : tone === "signal" ? "border-signal/30 text-signal" : "border-line text-muted";
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] ${cls}`}>{children}</span>;
}

function Table({ head, children, min = "40rem" }: { head: string[]; children: ReactNode; min?: string }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-[14px]" style={{ minWidth: min }}>
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </Card>
  );
}

function Bar({ share, tone }: { share: number; tone?: Tone }) {
  return (
    <span className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <span className={`block h-full ${tone === "stop" ? "bg-stop" : "bg-foreground/70"}`} style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} />
    </span>
  );
}

// ---- shared data ----

async function health() {
  const db = admin();
  const [{ data: pause }, { data: lastLock }, { count: queued }, { count: gmail }, { data: lastErr }] = await Promise.all([
    db.from("billing_settings").select("value").eq("key", "ai_paused_until").maybeSingle(),
    db.from("jobs").select("locked_at").not("locked_at", "is", null).order("locked_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued").lte("run_at", new Date().toISOString()),
    db.from("mail_accounts").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    db.from("agent_runs").select("error, started_at").not("error", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const pausedUntil = pause?.value ? Date.parse(pause.value) : 0;
  const credit = /credit balance is too low/i.test(lastErr?.error ?? "") && Date.now() - Date.parse(lastErr!.started_at) < 3 * 3_600_000;
  return { pausedUntil: pausedUntil > Date.now() ? pausedUntil : 0, credit, lastLock: lastLock?.locked_at as string | undefined, queued: queued ?? 0, gmail: gmail ?? 0 };
}

function HealthStrip({ h }: { h: Awaited<ReturnType<typeof health>> }) {
  const workerStale = !h.lastLock || Date.now() - Date.parse(h.lastLock) > 20 * 60_000;
  const items: [string, string, Tone][] = [
    [
      "AI provider",
      h.credit ? "Out of credit: top up at console.anthropic.com" : h.pausedUntil ? `Paused until ${new Date(h.pausedUntil).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : "Working",
      h.credit || h.pausedUntil ? "stop" : "go",
    ],
    ["Job worker", `Last job picked up ${ago(h.lastLock)}${h.queued ? `, ${h.queued} waiting` : ""}`, workerStale && h.queued ? "stop" : workerStale ? "signal" : "go"],
    ["Gmail connections", `${h.gmail} connected`, h.gmail ? undefined : "signal"],
  ];
  return (
    <Card className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map(([label, value, tone]) => (
        <div key={label} className="flex items-start gap-3 px-4 py-3.5">
          <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${tone === "go" ? "bg-go" : tone === "stop" ? "bg-stop" : tone === "signal" ? "bg-signal" : "bg-neutral-400"}`} />
          <div className="min-w-0">
            <p className="text-[12.5px] text-muted">{label}</p>
            <p className={`text-[14px] ${toneText(tone === "go" ? undefined : tone)}`}>{value}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}

const REASON: Record<string, string> = {
  stuck: "Stuck on a page",
  question: "Waiting on the applicant's answer",
  missing: "Missing profile detail or document",
  verification: "Waiting on a verification email",
  login: "Saved password rejected",
  account: "Couldn't create the portal account",
  blocked: "Portal blocked the agents",
  captcha: "Bot check",
  unpaid: "Waiting for the applicant to pay",
  payment: "At the payment page",
};

// ---- views ----

const STATUS_ORDER = ["researching", "shortlisted", "preparing", "packet_approved", "submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "rejected", "declined", "dropped"];
const STATUS_LABEL: Record<string, string> = {
  researching: "Researching",
  shortlisted: "Shortlisted",
  preparing: "Preparing the packet",
  packet_approved: "Signed, agents submitting",
  submitted: "Submitted",
  under_review: "Under review",
  interview: "Interview",
  waitlisted: "Waitlisted",
  admitted: "Admitted",
  accepted: "Accepted",
  rejected: "Rejected",
  declined: "Declined",
  dropped: "Dropped",
};
const SUBMITTED = new Set(["submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "rejected", "declined"]);

function ScopeNote({ hidden, everyone, view }: { hidden: number; everyone: boolean; view: string }) {
  if (!hidden && !everyone) return null;
  const base = view === "overview" ? "/admin" : `/admin?view=${view}`;
  const join = base.includes("?") ? "&" : "?";
  return (
    <p className="text-[13px] text-muted">
      {everyone ? "Showing every account, team and test accounts included. " : `Real users only: ${hidden} team or test account${hidden === 1 ? "" : "s"} left out. `}
      <Link href={everyone ? base : `${base}${join}all=1`} className="underline decoration-current/30 underline-offset-4 hover:text-foreground">
        {everyone ? "Show real users only" : "Include them"}
      </Link>
      {" · "}
      <Link href="/admin?view=users" className="underline decoration-current/30 underline-offset-4 hover:text-foreground">
        Choose which accounts are team
      </Link>
    </p>
  );
}

function Bars({ rows, total }: { rows: [string, number][]; total: number }) {
  return (
    <ul className="space-y-2.5 px-4 py-4">
      {rows.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[minmax(0,11rem)_1fr_2.5rem] items-center gap-3 text-[13.5px]">
          <span className="truncate">{label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
          </span>
          <span className="text-right tabular-nums text-muted">{n}</span>
        </li>
      ))}
    </ul>
  );
}

function Daily({ dates }: { dates: string[] }) {
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10));
  const counts = days.map((d) => dates.filter((x) => x.slice(0, 10) === d).length);
  const max = Math.max(1, ...counts);
  return (
    <div className="px-4 pb-3 pt-4">
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={`Sign-ups per day for the last 30 days: ${counts.reduce((a, b) => a + b, 0)} in total`}>
        {counts.map((c, i) => (
          <span key={days[i]} title={`${days[i]}: ${c}`} className={`flex-1 rounded-t-sm ${c ? "bg-foreground/70" : "bg-neutral-200 dark:bg-neutral-800"}`} style={{ height: `${c ? Math.max(8, (c / max) * 100) : 4}%` }} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-muted">
        <span>{new Date(days[0]).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
        <span>today</span>
      </div>
    </div>
  );
}

export async function OverviewView({ since, everyone }: { since: string; everyone: boolean }) {
  const db = admin();
  const [h, d, runs, { data: pays }] = await Promise.all([
    health(),
    loadAdmin(),
    runsSince<{ user_id: string; cost_usd: number | null }>("user_id, cost_usd", since),
    db.from("billing_events").select("user_id, kind, amount, currency").gte("created_at", since),
  ]);
  const { users, apps, hidden } = scope(d, everyone);
  const ids = new Set(users.map((u) => u.id));
  const week = (iso: string | null) => !!iso && Date.now() - Date.parse(iso) < 7 * 86_400_000;
  // the bill is the bill: the headline is everything spent; the split says how much went on real users
  const spent = runs.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const cost = runs.filter((r) => ids.has(r.user_id)).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const teamCost = spent - cost;
  const payers = new Set((pays ?? []).filter((p) => ids.has(p.user_id)).map((p) => p.user_id));
  const reached = (k: string) => users.filter((u) => k === "signup" || u.journey.at[k as keyof typeof u.journey.at]).length;
  const submittedApps = apps.filter((a) => SUBMITTED.has(a.status)).length;
  const submitters = new Set(apps.filter((a) => SUBMITTED.has(a.status)).map((a) => a.userId)).size;
  const byStage = STAGES.map((s) => [s.label, users.filter((u) => u.stage === s.key).length] as [string, number]);
  const sources = new Map<string, number>();
  for (const u of users) sources.set(u.source, (sources.get(u.source) ?? 0) + 1);
  const statusRows = STATUS_ORDER.map((st) => [STATUS_LABEL[st], apps.filter((a) => a.status === st).length] as [string, number]).filter(([, n]) => n);

  // who needs a nudge: real users who stopped moving, and applications the agents stopped on
  const stalled = users
    .filter((u) => u.stage !== "submitted" && (!u.lastActive || Date.now() - Date.parse(u.lastActive) > 3 * 86_400_000))
    .sort((a, b) => (a.lastActive ?? a.joined).localeCompare(b.lastActive ?? b.joined));
  const stopped = apps.filter((a) => a.runner === "needs_you" || a.runner === "failed");
  const groups = new Map<string, AdminApp[]>();
  for (const a of stopped) groups.set(a.reason ?? "other", [...(groups.get(a.reason ?? "other") ?? []), a]);
  const stageLabel = (k: string) => STAGES.find((s) => s.key === k)?.label ?? k;

  return (
    <div className="space-y-10">
      <HealthStrip h={h} />
      <ScopeNote hidden={hidden} everyone={everyone} view="overview" />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Sign-ups" value={`${users.length}`} sub={`${users.filter((u) => week(u.joined)).length} in the last 7 days`} />
        <Stat label="Active this week" value={`${users.filter((u) => week(u.lastActive)).length}`} sub="did something themselves" />
        <Stat label="Reached a shortlist" value={`${reached("shortlist")}`} sub={`${users.length ? Math.round((reached("shortlist") / users.length) * 100) : 0}% of sign-ups`} />
        <Stat label="Signed a packet" value={`${reached("signed")}`} sub={`${users.length ? Math.round((reached("signed") / users.length) * 100) : 0}% of sign-ups`} />
        <Stat label="Submitted" value={`${submittedApps}`} sub={`application${submittedApps === 1 ? "" : "s"}, ${submitters} user${submitters === 1 ? "" : "s"}`} tone={submittedApps ? "go" : undefined} />
        <Stat
          label="AI cost this month"
          value={$(spent)}
          sub={`${$(cost)} on ${everyone ? "all" : "real"} users (${$(cost / Math.max(1, users.length))} each)${teamCost > 0.005 ? `, ${$(teamCost)} on team and test accounts` : ""}${payers.size ? `, ${payers.size} paying` : ""}`}
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Where users are" note="Each user's furthest step.">
          <Card>
            <Bars rows={byStage} total={users.length} />
          </Card>
        </Section>
        <Section title="Applications by status" note={`${apps.length} across ${new Set(apps.map((a) => a.userId)).size} users.`}>
          <Card>{statusRows.length ? <Bars rows={statusRows} total={apps.length} /> : <p className="px-4 py-4 text-[13.5px] text-muted">No applications yet.</p>}</Card>
        </Section>
        <Section title="Sign-ups, last 30 days">
          <Card>
            <Daily dates={users.map((u) => u.joined)} />
          </Card>
        </Section>
        <Section title="Where sign-ups come from" note="First-touch source recorded at sign-up.">
          <Card>
            <Bars rows={[...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)} total={users.length} />
          </Card>
        </Section>
      </div>

      <Section title="Users who stopped" note={stalled.length ? "Not submitted and not active for 3 days or more." : "Everyone not yet submitted was active in the last 3 days."} action={<Link href={`/admin?view=users${everyone ? "&all=1" : ""}`} className="text-[13.5px] text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">All users</Link>}>
        {stalled.length > 0 && (
          <Table head={["User", "Furthest step", "Last active", "Joined", "Source"]} min="40rem">
            {stalled.slice(0, 10).map((u) => (
              <tr key={u.id}>
                <td className="max-w-[16rem] truncate px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{stageLabel(u.stage)}</td>
                <td className="px-4 py-3 text-muted">{ago(u.lastActive)}</td>
                <td className="px-4 py-3 text-muted">{ago(u.joined)}</td>
                <td className="px-4 py-3 text-muted">{u.source}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section
        title="Applications the agents stopped on"
        note={stopped.length ? `${stopped.length} across ${new Set(stopped.map((a) => a.userId)).size} users, grouped by why` : "None."}
        action={<Link href={`/admin?view=portals${everyone ? "&all=1" : ""}`} className="text-[13.5px] text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">Portal details</Link>}
      >
        {groups.size > 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            {[...groups.entries()]
              .sort((a, b) => b[1].length - a[1].length)
              .map(([reason, list]) => (
                <Card key={reason}>
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <p className="text-[14.5px] font-medium">{reason === "failed" ? "Run failed" : (REASON[reason] ?? "Other")}</p>
                    <Pill tone={reason === "failed" || reason === "stuck" ? "stop" : "signal"}>{list.length}</Pill>
                  </div>
                  <ul className="divide-y divide-line">
                    {list.slice(0, 5).map((w) => (
                      <li key={w.id} className="px-4 py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[14px]">{w.school}</span>
                          <span className="shrink-0 text-[12px] text-muted">{ago(w.updated)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">
                          {w.email} · {w.note}
                        </p>
                      </li>
                    ))}
                    {list.length > 5 && <li className="px-4 py-2 text-[12.5px] text-muted">and {list.length - 5} more</li>}
                  </ul>
                </Card>
              ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export async function UsersView({ since, everyone }: { since: string; everyone: boolean }) {
  const [d, runs] = await Promise.all([loadAdmin(), runsSince<{ user_id: string; cost_usd: number | null }>("user_id, cost_usd", since)]);
  const spend = new Map<string, number>();
  for (const r of runs) spend.set(r.user_id, (spend.get(r.user_id) ?? 0) + (Number(r.cost_usd) || 0));
  const { users, hidden } = scope(d, everyone);
  const stageLabel = (k: string) => STAGES.find((s) => s.key === k)?.label ?? k;
  const count = (u: AdminUser, sts: string[]) => sts.reduce((n, s) => n + (u.apps[s] ?? 0), 0);
  return (
    <div className="space-y-4">
      <ScopeNote hidden={hidden} everyone={everyone} view="users" />
      <Section title="Users" note="Newest first. Mark your own and test accounts as team so the numbers show real applicants.">
        <Table head={["User", "Counted as", "Joined", "Source", "Last active", "Furthest step", "Shortlisted", "Preparing", "Signed", "Submitted", "Stopped", "AI this month"]} min="70rem">
          {[...users]
            .sort((a, b) => b.joined.localeCompare(a.joined))
            .map((u) => (
              <tr key={u.id}>
                <td className="max-w-[16rem] truncate px-4 py-3">
                  {u.email}
                  {u.plan !== "free" && <span className="ml-2 text-[12px] capitalize text-muted">{u.plan}</span>}
                </td>
                <td className="px-4 py-3">
                  <TeamToggle userId={u.id} team={u.team} />
                </td>
                <td className="px-4 py-3 text-muted">{new Date(u.joined).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3 text-muted">{u.source}</td>
                <td className="px-4 py-3 text-muted">{ago(u.lastActive)}</td>
                <td className="px-4 py-3">{stageLabel(u.stage)}</td>
                <td className={td}>{count(u, ["shortlisted", "researching"]) || <span className="text-muted">·</span>}</td>
                <td className={td}>{count(u, ["preparing"]) || <span className="text-muted">·</span>}</td>
                <td className={td}>{count(u, ["packet_approved"]) || <span className="text-muted">·</span>}</td>
                <td className={`${td} ${count(u, [...SUBMITTED]) ? "font-medium text-go" : ""}`}>{count(u, [...SUBMITTED]) || <span className="text-muted">·</span>}</td>
                <td className={`${td} ${u.waiting ? "text-signal" : ""}`}>{u.waiting || <span className="text-muted">·</span>}</td>
                <td className={td}>{$(spend.get(u.id) ?? 0)}</td>
              </tr>
            ))}
        </Table>
      </Section>
    </div>
  );
}

export async function SubmissionsView({ everyone }: { everyone: boolean }) {
  const d = await loadAdmin();
  const { users, hidden } = scope(d, everyone);
  const trips = users.map((u) => u.journey).sort((a, b) => b.signedUp.localeCompare(a.signedUp));
  const funnel = summarize(trips);
  return (
    <div className="space-y-10">
      <ScopeNote hidden={hidden} everyone={everyone} view="submissions" />
      <Section title="Time to first submission" note="From sign-up to the first application the agents submitted.">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Users who submitted" value={`${funnel.submitted} of ${funnel.users}`} tone={funnel.submitted ? "go" : undefined} />
          <Stat label="Median time" value={duration(funnel.medianToSubmitMs)} />
          <Stat label="Within 15 min" value={`${funnel.within15m}`} />
          <Stat label="Within 24 h / 7 d" value={`${funnel.within24h} / ${funnel.within7d}`} />
        </dl>
      </Section>
      <Section title="Where people stop" note="How many users reached each step, and how long it took.">
        <Table head={["Step", "Users who reached it", "Median from sign-up", "Median from the step before"]}>
          {funnel.steps.map((x) => (
            <tr key={x.key}>
              <td className="px-4 py-3">{x.label}</td>
              <td className={td}>
                {x.users}
                <Bar share={funnel.users ? x.users / funnel.users : 0} />
              </td>
              <td className={td}>{duration(x.medianFromSignupMs)}</td>
              <td className={td}>{duration(x.medianFromPreviousMs)}</td>
            </tr>
          ))}
        </Table>
      </Section>
      <Section title="Each user" note="Time from sign-up to each step.">
        <Table head={["User", "Signed up", ...MILESTONES.map((m) => m.label)]} min="64rem">
          {trips.map((j) => (
            <tr key={j.userId}>
              <td className="max-w-[14rem] truncate px-4 py-3">{j.email}</td>
              <td className={td}>{new Date(j.signedUp).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
              {MILESTONES.map((m) => (
                <td key={m.key} className={`${td} ${m.key === "submitted" && j.at.submitted ? "font-medium text-go" : ""}`}>
                  {j.at[m.key] ? duration(Date.parse(j.at[m.key]!) - Date.parse(j.signedUp)) : <span className="text-muted">·</span>}
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}

export async function PortalsView({ everyone }: { everyone: boolean }) {
  const d = await loadAdmin();
  const { apps, hidden } = scope(d, everyone);
  const worked = apps.filter((a) => a.runner !== "idle" || SUBMITTED.has(a.status));
  // per school, across every user: how often the agents get through
  const bySchool = new Map<string, { school: string; host: string | null; total: number; submitted: number; stopped: number; running: number; reasons: Map<string, number> }>();
  for (const a of worked) {
    const r = bySchool.get(a.school) ?? { school: a.school, host: a.host, total: 0, submitted: 0, stopped: 0, running: 0, reasons: new Map() };
    r.total++;
    if (SUBMITTED.has(a.status)) r.submitted++;
    else if (a.runner === "needs_you" || a.runner === "failed") {
      r.stopped++;
      const why = a.reason ?? "other";
      r.reasons.set(why, (r.reasons.get(why) ?? 0) + 1);
    } else if (a.runner === "running" || a.runner === "ready") r.running++;
    r.host ??= a.host;
    bySchool.set(a.school, r);
  }
  const rows = [...bySchool.values()].sort((a, b) => b.total - a.total || a.school.localeCompare(b.school));
  const ids = worked.map((a) => a.id);
  const { data } = ids.length
    ? await admin().from("applications").select("id, runner_status, runner_note, portal_url, runner_state, runner_updated_at, programs(schools(name)), profiles(email)").in("id", ids.slice(0, 300)).order("runner_updated_at", { ascending: false })
    : { data: [] };
  return (
    <div className="space-y-10">
      <ScopeNote hidden={hidden} everyone={everyone} view="portals" />
      <Section title="By school" note="Every school the agents have worked on, across all users.">
        <Table head={["School", "Portal", "Applications", "Submitted", "Stopped", "In progress", "Why they stopped"]} min="56rem">
          {rows.length ? (
            rows.map((r) => (
              <tr key={r.school}>
                <td className="max-w-[16rem] truncate px-4 py-3">{r.school}</td>
                <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-[12px] text-muted">{r.host ?? "·"}</td>
                <td className={td}>{r.total}</td>
                <td className={`${td} ${r.submitted ? "font-medium text-go" : ""}`}>{r.submitted}</td>
                <td className={`${td} ${r.stopped ? "text-signal" : ""}`}>{r.stopped}</td>
                <td className={td}>{r.running}</td>
                <td className="px-4 py-3 text-[12.5px] text-muted">
                  {[...r.reasons.entries()].map(([why, n]) => `${why === "failed" ? "Run failed" : (REASON[why] ?? why)}${n > 1 ? ` ×${n}` : ""}`).join(", ") || "·"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-3 text-muted" colSpan={7}>
                The agents haven&apos;t worked on any portal yet.
              </td>
            </tr>
          )}
        </Table>
      </Section>
      <Section title="Each run" note="Newest first. Open one for what the page said, the last steps and the raw page details.">
        <RunList rows={data ?? []} />
      </Section>
    </div>
  );
}

function RunList({ rows }: { rows: Record<string, unknown>[] }) {
  const tone = (s: string): Tone => (s === "submitted" ? "go" : s === "failed" ? "stop" : s === "needs_you" ? "signal" : undefined);
  const label: Record<string, string> = { submitted: "Submitted", failed: "Failed", needs_you: "Needs the applicant", running: "Running", ready: "Queued", paused: "Paused", idle: "Idle" };
  return (
    <div className="space-y-2">
      {rows.map((a) => {
        const st = (a.runner_state ?? {}) as {
          last_url?: string;
          reason?: string;
          steps?: number;
          totalSteps?: number;
          stuckRepeats?: number;
          navHistory?: string[];
          debug?: { title?: string; fields?: string[]; values?: string[]; buttons?: string[]; errors?: string[]; complaints?: string[]; unnamed?: string[]; captcha?: boolean; body?: string };
        };
        const dbg = st.debug;
        const p = a.programs as { schools?: { name?: string } } | null;
        const status = a.runner_status as string;
        return (
          <details key={a.id as string} className="group rounded-2xl border border-line bg-surface shadow-card">
            <summary className="grid cursor-pointer list-none gap-x-4 gap-y-1 px-4 py-3 marker:hidden sm:grid-cols-[minmax(0,14rem)_9rem_minmax(0,1fr)_6rem] sm:items-center">
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-medium">{p?.schools?.name ?? "Unknown school"}</span>
                <span className="block truncate text-[12px] text-muted">{(a.profiles as { email?: string } | null)?.email}</span>
              </span>
              <span>
                <Pill tone={tone(status)}>{label[status] ?? status}</Pill>
              </span>
              <span className="line-clamp-2 text-[13px] text-muted">{a.runner_note as string}</span>
              <span className="text-[12px] text-muted sm:text-right">{ago(a.runner_updated_at as string)}</span>
            </summary>
            <div className="space-y-3 border-t border-line px-4 py-3 text-[12.5px]">
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <div className="truncate">
                  <dt className="inline text-muted">Last page: </dt>
                  <dd className="inline break-all">{st.last_url ?? "none"}</dd>
                </div>
                <div>
                  <dt className="inline text-muted">Reason: </dt>
                  <dd className="inline">{st.reason ? (REASON[st.reason] ?? st.reason) : "none"}</dd>
                </div>
                <div>
                  <dt className="inline text-muted">Steps: </dt>
                  <dd className="inline">
                    {st.steps ?? 0} this run, {st.totalSteps ?? 0} in all{st.stuckRepeats ? `, stuck ${st.stuckRepeats}× on this page` : ""}
                  </dd>
                </div>
                {dbg?.title && (
                  <div className="truncate">
                    <dt className="inline text-muted">Page title: </dt>
                    <dd className="inline">{dbg.title}</dd>
                  </div>
                )}
              </dl>
              {dbg?.complaints?.length || dbg?.errors?.length ? <p className="text-stop">What the page said: {[...(dbg?.errors ?? []), ...(dbg?.complaints ?? [])].join(" · ")}</p> : null}
              {st.navHistory?.length ? (
                <ol className="list-decimal space-y-0.5 pl-5 text-muted">
                  {st.navHistory.slice(-8).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ol>
              ) : null}
              {dbg && (
                <div className="space-y-1 rounded-xl bg-neutral-100 p-3 font-mono text-[11.5px] leading-relaxed dark:bg-neutral-900">
                  <p>fields: {(dbg.fields ?? []).join(" | ")}</p>
                  <p>values: {(dbg.values ?? []).join(" | ")}</p>
                  <p>buttons: {(dbg.buttons ?? []).join(" | ")}</p>
                  {dbg.unnamed?.length ? <p>buttons without text: {dbg.unnamed.join(" | ")}</p> : null}
                  <p>captcha: {String(dbg.captcha ?? false)}</p>
                  <p className="whitespace-pre-wrap">body: {dbg.body}</p>
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export async function CostsView({ since }: { since: string }) {
  const team = await teamIds();
  const db = admin();
  type Run = { user_id: string; agent: string; model: string; cost_usd: number | null; input_tokens: number | null; output_tokens: number | null };
  const [{ data: users }, all] = await Promise.all([
    db.from("profiles").select("id, email, plan, monthly_budget_usd"),
    runsSince<Run>("user_id, agent, model, cost_usd, input_tokens, output_tokens", since),
  ]);
  // a call the api turned away (no credit, overloaded) never reached the model and cost nothing: count it apart
  const runs = all.filter((r) => r.cost_usd != null || (r.input_tokens ?? 0) > 0);
  const refused = all.length - runs.length;
  type Row = { cost: number; cat: Record<Category, number>; calls: number };
  const perUser = new Map<string, Row>();
  const perAgent = new Map<string, { cost: number; calls: number; inTok: number; outTok: number }>();
  for (const r of runs) {
    const c = Number(r.cost_usd) || 0;
    const u = perUser.get(r.user_id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 };
    u.cost += c;
    u.cat[categoryOf(r.agent)] += c;
    u.calls++;
    perUser.set(r.user_id, u);
    const key = `${r.agent} · ${r.model}`;
    const a = perAgent.get(key) ?? { cost: 0, calls: 0, inTok: 0, outTok: 0 };
    a.cost += c;
    a.calls++;
    a.inTok += r.input_tokens ?? 0;
    a.outTok += r.output_tokens ?? 0;
    perAgent.set(key, a);
  }
  const total = [...perUser.values()].reduce((s, u) => s + u.cost, 0);
  const teamSpend = [...perUser.entries()].filter(([id]) => team.has(id)).reduce((s, [, u]) => s + u.cost, 0);
  const agents = [...perAgent.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const top = agents[0]?.[1].cost || 1;
  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="AI cost this month" value={$(total)} sub={`${$(total - teamSpend)} real users, ${$(teamSpend)} team and test`} />
        <Stat label="Billed calls" value={k(runs.length)} sub={refused ? `${k(refused)} more turned away by the API, not billed` : undefined} />
        <Stat label="Per call" value={$(total / Math.max(1, runs.length))} />
        <Stat label="Most expensive agent" value={agents[0]?.[0].split(" · ")[0] ?? "none"} sub={agents[0] ? $(agents[0][1].cost) : undefined} />
      </dl>
      <Section title="By agent and model">
        <Table head={["Agent", "Model", "Calls", "Tokens in / out", "Cost", "Per call"]}>
          {agents.map(([key, a]) => {
            const [agent, model] = key.split(" · ");
            return (
              <tr key={key}>
                <td className="px-4 py-3 font-medium">{agent}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-muted">{model}</td>
                <td className={td}>{a.calls}</td>
                <td className={td}>
                  {k(a.inTok)} / {k(a.outTok)}
                </td>
                <td className={td}>
                  {$(a.cost)}
                  <Bar share={a.cost / top} />
                </td>
                <td className={td}>{$(a.cost / Math.max(1, a.calls))}</td>
              </tr>
            );
          })}
        </Table>
      </Section>
      <Section title="By user" note="Spend against each user's monthly AI budget.">
        <Table head={["User", "Plan", "Spent of budget", "Research", "Writing", "Core", "Calls"]} min="48rem">
          {(users ?? [])
            .map((u) => ({ u, r: perUser.get(u.id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 } }))
            .sort((a, b) => b.r.cost - a.r.cost)
            .map(({ u, r }) => {
              const budget = u.monthly_budget_usd != null ? Number(u.monthly_budget_usd) : planOf(u.plan).aiBudgetUsd;
              const share = budget ? r.cost / budget : 0;
              return (
                <tr key={u.id}>
                  <td className="max-w-[14rem] truncate px-4 py-3">
                    {u.email}
                    {team.has(u.id) && <span className="ml-2 text-[12px] text-muted">team</span>}
                  </td>
                  <td className="px-4 py-3 capitalize">{u.plan}</td>
                  <td className={td}>
                    <span className={share > 0.9 ? "font-medium text-stop" : ""}>
                      {$(r.cost)} <span className="text-muted">of {$(budget)}</span>
                    </span>
                    <Bar share={share} tone={share > 0.9 ? "stop" : undefined} />
                  </td>
                  {(["research", "writing", "core"] as const).map((c) => (
                    <td key={c} className={td}>
                      {$(r.cat[c])} <span className="text-muted">of {$(budget * CATEGORY_SHARE[c])}</span>
                    </td>
                  ))}
                  <td className={td}>{r.calls}</td>
                </tr>
              );
            })}
        </Table>
      </Section>
    </div>
  );
}

export function GrowthView() {
  return (
    <Section title="Growth" note="Where sign-ups come from, invites and ambassadors.">
      <GrowthAdmin />
    </Section>
  );
}

export async function LearningView() {
  return (
    <Section title="Learning" note="Lessons the agents learned from stuck runs and edits. Portal notes apply at once; general lessons wait for your approval.">
      <LessonsAdmin {...await lessonData()} />
    </Section>
  );
}

export async function SystemView({ since }: { since: string }) {
  const db = admin();
  const [h, { data: failed }, { data: queue }] = await Promise.all([
    health(),
    db.from("agent_runs").select("agent, error, started_at").eq("status", "failed").gte("started_at", since).order("started_at", { ascending: false }).limit(30),
    db.from("jobs").select("agent, task, status").in("status", ["queued", "running", "failed"]).limit(2000),
  ]);
  const byJob = new Map<string, Record<string, number>>();
  for (const j of queue ?? []) {
    const key = `${j.agent}.${j.task}`;
    const r = byJob.get(key) ?? {};
    r[j.status] = (r[j.status] ?? 0) + 1;
    byJob.set(key, r);
  }
  return (
    <div className="space-y-10">
      <HealthStrip h={h} />
      <Section title="Job queue" note="Jobs waiting, running or failed, by agent and task.">
        <Table head={["Job", "Waiting", "Running", "Failed"]} min="30rem">
          {[...byJob.entries()].length ? (
            [...byJob.entries()]
              .sort((a, b) => (b[1].queued ?? 0) - (a[1].queued ?? 0))
              .map(([key, r]) => (
                <tr key={key}>
                  <td className="px-4 py-3 font-mono text-[12.5px]">{key}</td>
                  <td className={td}>{r.queued ?? 0}</td>
                  <td className={td}>{r.running ?? 0}</td>
                  <td className={`${td} ${r.failed ? "text-stop" : ""}`}>{r.failed ?? 0}</td>
                </tr>
              ))
          ) : (
            <tr>
              <td className="px-4 py-3 text-muted" colSpan={4}>
                The queue is empty.
              </td>
            </tr>
          )}
        </Table>
      </Section>
      <Section title="Recent failures" note="This month, newest first.">
        <Card>
          <ul className="divide-y divide-line">
            {(failed ?? []).length ? (
              (failed ?? []).map((f, i) => (
                <li key={i} className="grid gap-1 px-4 py-2.5 text-[12.5px] sm:grid-cols-[9rem_7rem_minmax(0,1fr)]">
                  <span className="text-muted">{ago(f.started_at)}</span>
                  <span className="font-medium">{f.agent}</span>
                  <span className="break-words font-mono text-[11.5px]">{(f.error ?? "").slice(0, 300)}</span>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-[13.5px] text-muted">No failures this month.</li>
            )}
          </ul>
        </Card>
      </Section>
    </div>
  );
}

async function lessonData() {
  const db = admin();
  const empty = { proposed: [], active: [], retired: [], personal: { users: 0, lessons: 0 } };
  const { data, error } = await db.from("lessons").select("id, scope, user_id, agent, task, topic, text, status, evidence, created_at, retired_reason").order("created_at", { ascending: false }).limit(1000);
  if (error) return empty;
  const rows = data ?? [];
  const global = rows.filter((l) => l.scope === "global");
  const runs = await runsSince<{ lesson_ids: string[] | null }>("lesson_ids", monthStartUTC());
  const uses = new Map<string, number>();
  for (const r of runs) for (const id of (r.lesson_ids as string[]) ?? []) uses.set(id, (uses.get(id) ?? 0) + 1);
  const withUses = (xs: typeof rows) => xs.map((l) => ({ ...l, uses: uses.get(l.id) ?? 0 }));
  const personal = rows.filter((l) => l.scope === "user" && l.status === "active");
  return {
    proposed: withUses(global.filter((l) => l.status === "proposed")),
    active: withUses(global.filter((l) => l.status === "active")),
    retired: withUses(global.filter((l) => l.status === "retired").slice(0, 10)),
    personal: { users: new Set(personal.map((l) => l.user_id)).size, lessons: personal.length },
  };
}
