import Link from "next/link";
import type { ReactNode } from "react";
import { admin } from "@/lib/supabase/admin";
import { runsSince } from "@/lib/runs";
import { categoryOf, monthStartUTC, CATEGORY_SHARE, type Category } from "@/lib/pricing";
import { LessonsAdmin } from "@/components/learning/lessons-admin";
import { MILESTONES, duration, summarize } from "@/lib/first-submission";
import { STAGES, SUBMITTED, every, loadAdmin, scope, type AdminApp, type AdminData, type AdminUser, type Payment } from "./data";
import { TeamToggle } from "./team-toggle";

// the operator console's views. each loads its own data, so switching views stays quick. every number says
// which period it covers, and leaves out team and test accounts unless the operator asks for everyone.

const $ = (n: number) => `$${n.toFixed(2)}`;
const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n.toLocaleString());
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "0%");
const th = "px-4 py-2.5 text-left text-[12px] font-medium text-muted";
const td = "px-4 py-3 tabular-nums";
const DAY = 86_400_000;

function ago(iso: string | null | undefined) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}
const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "·");
const stamp = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

// money in its own currency: payments come in several
function money(ps: Payment[]) {
  const by = new Map<string, number>();
  for (const p of ps) if (p.amount != null) by.set(p.currency ?? "?", (by.get(p.currency ?? "?") ?? 0) + p.amount);
  return [...by.entries()].map(([c, n]) => `${c} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`).join(", ") || "none";
}

// ---- building blocks ----

function Section({ title, note, action, children }: { title: string; note?: ReactNode; action?: ReactNode; children: ReactNode }) {
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
const dot = (t: Tone) => (t === "go" ? "bg-go" : t === "stop" ? "bg-stop" : t === "signal" ? "bg-signal" : "bg-neutral-400");

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: Tone }) {
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

function Empty({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td className="px-4 py-3 text-[13.5px] text-muted" colSpan={cols}>
        {children}
      </td>
    </tr>
  );
}

function Bar({ share, tone }: { share: number; tone?: Tone }) {
  return (
    <span className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <span className={`block h-full ${tone === "stop" ? "bg-stop" : "bg-foreground/70"}`} style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} />
    </span>
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

// one column per day for the last 30 days
function Daily({ values, label, fmt = String }: { values: Map<string, number>; label: string; fmt?: (n: number) => string }) {
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * DAY).toISOString().slice(0, 10));
  const counts = days.map((d) => values.get(d) ?? 0);
  const max = Math.max(...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <div className="px-4 pb-3 pt-4">
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={`${label}, last 30 days: ${fmt(total)} in total`}>
        {counts.map((c, i) => (
          <span key={days[i]} title={`${days[i]}: ${fmt(c)}`} className={`flex-1 rounded-t-sm ${c ? "bg-foreground/70" : "bg-neutral-200 dark:bg-neutral-800"}`} style={{ height: `${c && max ? Math.max(8, (c / max) * 100) : 4}%` }} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-muted">
        <span>{date(days[0])}</span>
        <span>
          {fmt(total)} in 30 days, peak {fmt(max)} a day
        </span>
        <span>today</span>
      </div>
    </div>
  );
}

const byDay = (dates: string[]) => {
  const m = new Map<string, number>();
  for (const d of dates) m.set(d.slice(0, 10), (m.get(d.slice(0, 10)) ?? 0) + 1);
  return m;
};

const linkCls = "underline decoration-current/30 underline-offset-4 hover:text-foreground";

function UserLink({ u, everyone }: { u: { id: string; email: string }; everyone?: boolean }) {
  return (
    <Link href={`/admin?view=user&id=${u.id}${everyone ? "&all=1" : ""}`} className="decoration-current/30 underline-offset-4 hover:underline">
      {u.email}
    </Link>
  );
}

// ---- shared data ----

async function health() {
  const db = admin();
  const [{ data: pause }, { data: lastLock }, queued, { count: gmail }, { data: lastErr }, { data: lastOk }] = await Promise.all([
    db.from("billing_settings").select("value").eq("key", "ai_paused_until").maybeSingle(),
    db.from("jobs").select("locked_at").not("locked_at", "is", null).order("locked_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("jobs").select("run_at").eq("status", "queued").lte("run_at", new Date().toISOString()).order("run_at").limit(1000),
    db.from("mail_accounts").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    db.from("agent_runs").select("error, started_at").not("error", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("agent_runs").select("finished_at").eq("status", "done").order("finished_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const pausedUntil = pause?.value ? Date.parse(pause.value) : 0;
  const lastOkAt = (lastOk?.finished_at as string | undefined) ?? null;
  // out of credit: the latest failure says so, and nothing has worked since it
  const credit = /credit balance is too low/i.test(lastErr?.error ?? "") && (!lastOkAt || lastOkAt < lastErr!.started_at);
  return {
    pausedUntil: pausedUntil > Date.now() ? pausedUntil : 0,
    credit,
    lastOk: lastOkAt,
    lastLock: lastLock?.locked_at as string | undefined,
    queued: queued.data?.length ?? 0,
    oldestQueued: (queued.data?.[0]?.run_at as string | undefined) ?? null,
    gmail: gmail ?? 0,
  };
}
type Health = Awaited<ReturnType<typeof health>>;

function HealthStrip({ h }: { h: Health }) {
  const workerStale = !h.lastLock || Date.now() - Date.parse(h.lastLock) > 20 * 60_000;
  const items: [string, string, Tone][] = [
    [
      "AI provider",
      h.credit
        ? `Out of credit since ${ago(h.lastOk)}: top up at console.anthropic.com`
        : h.pausedUntil
          ? `Paused until ${new Date(h.pausedUntil).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`
          : `Working. Last answer ${ago(h.lastOk)}`,
      h.credit || h.pausedUntil ? "stop" : "go",
    ],
    ["Job worker", `Last job picked up ${ago(h.lastLock)}${h.queued ? `. ${h.queued} due, oldest ${ago(h.oldestQueued)}` : ". Nothing due"}`, workerStale && h.queued ? "stop" : workerStale ? "signal" : "go"],
    ["Gmail connections", `${h.gmail} connected`, h.gmail ? undefined : "signal"],
  ];
  return (
    <Card className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map(([label, value, tone]) => (
        <div key={label} className="flex items-start gap-3 px-4 py-3.5">
          <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${dot(tone)}`} />
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
  failed: "Run failed",
};
const reasonLabel = (r: string | null) => (r ? (REASON[r] ?? r) : "Other");

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
const RUNNER_LABEL: Record<string, string> = { submitted: "Submitted", failed: "Failed", needs_you: "Needs the applicant", running: "Running", ready: "Queued", paused: "Paused", idle: "Not started" };
const runnerTone = (s: string): Tone => (s === "submitted" ? "go" : s === "failed" ? "stop" : s === "needs_you" ? "signal" : undefined);

// what happened, in words. actions not listed read as their name
const EVENT: Record<string, string> = {
  "runner.submitted": "Agents submitted an application",
  "runner.corrections": "Applicant corrected the agents' answers in Chrome",
  "runner.status_changed": "A submitted application's portal changed",
  "runner.status_checked": "Checked a submitted portal (no change)",
  "application.deadline_from_page": "Deadline saved from a program page",
  "application.submitted": "Application marked submitted",
  "inbox.submission_receipt": "School confirmed a submission by email",
  "runner.started": "Agents started on a portal",
  "runner.needs_you": "Agents stopped and asked the applicant",
  "runner.account_created": "Agents created a portal account",
  "runner.portal_found": "Agents found the application portal",
  "runner.questions": "Agents asked the applicant questions",
  "runner.queued": "Sent an application to the agents",
  "runner.error": "Agent run hit an error",
  "runner.requeued": "Run queued again",
  "runner.cancelled": "Run cancelled",
  "runner.paused": "Run paused",
  "runner.login_revealed": "Looked at a saved portal login",
  "runner.moved_to_chrome": "Moved a run to the Chrome extension",
  "interview.turn": "Talked to the interviewer",
  "profile.patched": "Profile updated",
  "profile.details_saved": "Saved personal details",
  "profile.portal_answer": "Answered a portal question",
  "profile.consolidated": "Profile tidied by the agents",
  "document.uploaded": "Uploaded a document",
  "document.extracted": "Agents read a document",
  "recon.requested": "Asked for program research",
  "recon.discovered": "Research found programs",
  "program.shortlisted": "Program added to the shortlist",
  "application.shortlisted": "Shortlisted a program",
  "program.dropped": "Program dropped",
  "application.prepare_requested": "Asked the agents to prepare an application",
  "application.planned": "Application planned",
  "artifact.drafted": "Essay drafted",
  "artifact.ready_for_user": "Essay ready to review",
  "artifact.approved": "Approved an essay",
  "artifact.edited": "Edited an essay",
  "packet.approved": "Signed an application packet",
  "approval.approved": "Approved an agent action",
  "fee_waiver.drafted": "Fee waiver request drafted",
  "scholarships.found": "Scholarships found",
  "mail.connected": "Connected Gmail",
  "mail.disconnected": "Disconnected Gmail",
  "email.sent": "Email sent",
  "preferences.updated": "Changed preferences",
  "controls.paused": "Paused the agents",
  "controls.resumed": "Resumed the agents",
  "billing.pack_paid": "Paid for a pack",
  "job.failed": "A background job failed",
  "references.requested": "Asked referees for letters",
};
// machine chatter: left out of activity feeds
const NOISE = ["runner.page", "runner.status_checked", "runner.resumed", "guard.allow", "guard.allow_with_undo", "system.pinged", "program.researching", "artifact.revised", "artifact.sent_back", "lesson.approve"];
const eventLabel = (a: string) => EVENT[a] ?? a.replace(/[._]/g, " ");
const actorLabel = (a: string) => (a === "user" ? "applicant" : a.replace(/^agent:/, ""));

function ScopeNote({ d, hidden, everyone, view }: { d: AdminData; hidden: number; everyone: boolean; view: string }) {
  const base = view === "overview" ? "/admin" : `/admin?view=${view}`;
  const join = base.includes("?") ? "&" : "?";
  const marked = d.users.filter((u) => u.team && !u.admin).length;
  return (
    <p className="text-[13px] text-muted">
      {everyone ? "Every account, team and test accounts included. " : `Real users only: ${hidden} team or test account${hidden === 1 ? "" : "s"} left out${marked ? "" : " (only admins so far)"}. `}
      <Link href={everyone ? base : `${base}${join}all=1`} className={linkCls}>
        {everyone ? "Show real users only" : "Include them"}
      </Link>
      {". "}
      <Link href="/admin?view=users&all=1" className={linkCls}>
        Mark your own test accounts as team
      </Link>
    </p>
  );
}

function Activity({ rows, apps, users, everyone, showUser = true }: { rows: { user_id: string; actor: string; action: string; application_id: string | null; created_at: string }[]; apps: Map<string, AdminApp>; users: Map<string, AdminUser>; everyone: boolean; showUser?: boolean }) {
  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.length ? (
          rows.map((e, i) => {
            const u = users.get(e.user_id);
            const app = e.application_id ? apps.get(e.application_id) : undefined;
            return (
              <li key={i} className="grid gap-x-4 gap-y-0.5 px-4 py-2.5 text-[13.5px] sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,14rem)]">
                <span className="text-[12.5px] text-muted" title={stamp(e.created_at)}>
                  {ago(e.created_at)}
                </span>
                <span className="min-w-0">
                  {eventLabel(e.action)}
                  {app && <span className="text-muted">: {app.school}</span>}
                  <span className="ml-2 text-[12px] text-muted">by {actorLabel(e.actor)}</span>
                </span>
                {showUser && <span className="truncate text-[12.5px] text-muted sm:text-right">{u ? <UserLink u={u} everyone={everyone} /> : "deleted account"}</span>}
              </li>
            );
          })
        ) : (
          <li className="px-4 py-3 text-[13.5px] text-muted">Nothing yet.</li>
        )}
      </ul>
    </Card>
  );
}

async function recentEvents(ids: string[], limit: number) {
  if (!ids.length) return [];
  const { data } = await admin()
    .from("events")
    .select("user_id, actor, action, application_id, created_at")
    .in("user_id", ids.slice(0, 200))
    .not("action", "in", `(${NOISE.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as { user_id: string; actor: string; action: string; application_id: string | null; created_at: string }[];
}

// ---- overview ----

type Attention = { tone: Tone; title: string; detail?: ReactNode; href?: string };

export async function OverviewView({ since, everyone }: { since: string; everyone: boolean }) {
  const db = admin();
  const dayAgo = new Date(Date.now() - DAY).toISOString();
  const [h, d, runs, { data: failedJobs }] = await Promise.all([
    health(),
    loadAdmin(),
    runsSince<{ user_id: string; cost_usd: number | null }>("user_id, cost_usd", since),
    db.from("jobs").select("user_id, agent, task, last_error").eq("status", "failed").gte("finished_at", dayAgo).limit(1000),
  ]);
  // gmail connections that failed (any account: a setup problem hits everyone)
  const { data: mailFails } = await db.from("events").select("user_id, context, created_at").eq("action", "mail.connect_failed").gte("created_at", dayAgo).order("created_at", { ascending: false }).limit(200);
  const { users, ids, apps, payments, hidden } = scope(d, everyone);
  const userMap = new Map(d.users.map((u) => [u.id, u]));
  const appMap = new Map(d.apps.map((a) => [a.id, a]));
  const feed = await recentEvents([...ids], 25);
  const within = (iso: string | null, ms: number) => !!iso && Date.now() - Date.parse(iso) < ms;

  // the bill is the bill: the headline is everything spent; the split says how much went on these users
  const spent = runs.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const cost = runs.filter((r) => ids.has(r.user_id)).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const reached = (key: string) => users.filter((u) => u.journey.at[key as keyof typeof u.journey.at]).length;
  const submittedApps = apps.filter((a) => SUBMITTED.has(a.status));
  const submitters = new Set(submittedApps.map((a) => a.userId)).size;
  const monthPays = payments.filter((p) => p.at >= since);
  const payers = new Set(payments.map((p) => p.userId)).size;
  const byStage = STAGES.map((s) => [s.label, users.filter((u) => u.stage === s.key).length] as [string, number]);
  const statusRows = STATUS_ORDER.map((st) => [STATUS_LABEL[st], apps.filter((a) => a.status === st).length] as [string, number]).filter(([, n]) => n);
  const sources = new Map<string, number>();
  for (const u of users) sources.set(u.source, (sources.get(u.source) ?? 0) + 1);
  const stageLabel = (key: string) => STAGES.find((s) => s.key === key)?.label ?? key;

  // what to look at first
  const att: Attention[] = [];
  const workerStale = !h.lastLock || Date.now() - Date.parse(h.lastLock) > 20 * 60_000;
  if (h.credit) att.push({ tone: "stop", title: "The agents can't work: Anthropic credit is empty", detail: `Nothing has run since ${ago(h.lastOk)}. ${h.queued} job${h.queued === 1 ? "" : "s"} waiting. Top up at console.anthropic.com; the worker picks up within 15 minutes.` });
  else if (h.pausedUntil) att.push({ tone: "stop", title: "AI calls are paused", detail: `The circuit breaker tripped after repeated failures. It retries at ${new Date(h.pausedUntil).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC.` });
  if (mailFails?.length) {
    const why = String((mailFails[0].context as { error?: string } | null)?.error ?? "");
    const setup = /permission|api key|unauthori[sz]ed|403|401|auth config/i.test(why);
    att.push({
      tone: "stop",
      title: `Gmail connection failed ${mailFails.length} time${mailFails.length === 1 ? "" : "s"} in the last 24 hours, for ${new Set(mailFails.map((m) => m.user_id)).size} user${new Set(mailFails.map((m) => m.user_id)).size === 1 ? "" : "s"}`,
      detail: setup ? `A setup problem, so nobody can connect: ${why.slice(0, 220)}` : `Latest: ${why.slice(0, 220)}`,
    });
  }
  if (workerStale && h.queued) att.push({ tone: "stop", title: "The job worker has stopped", detail: `No job picked up for ${ago(h.lastLock)}, with ${h.queued} due.`, href: "/admin?view=system" });
  const myFailed = (failedJobs ?? []).filter((j) => ids.has(j.user_id));
  if (myFailed.length) {
    const kinds = new Map<string, number>();
    for (const j of myFailed) kinds.set(`${j.agent}.${j.task}`, (kinds.get(`${j.agent}.${j.task}`) ?? 0) + 1);
    att.push({ tone: "stop", title: `${myFailed.length} job${myFailed.length === 1 ? "" : "s"} failed in the last 24 hours`, detail: [...kinds.entries()].map(([kk, n]) => `${kk}${n > 1 ? ` ×${n}` : ""}`).join(", "), href: "/admin?view=system" });
  }
  const stopped = apps.filter((a) => a.runner === "needs_you" || a.runner === "failed");
  const reasons = new Map<string, number>();
  for (const a of stopped) reasons.set(a.reason ?? "other", (reasons.get(a.reason ?? "other") ?? 0) + 1);
  if (stopped.length)
    att.push({
      tone: "signal",
      title: `${stopped.length} application${stopped.length === 1 ? "" : "s"} stopped, across ${new Set(stopped.map((a) => a.userId)).size} user${new Set(stopped.map((a) => a.userId)).size === 1 ? "" : "s"}`,
      detail: [...reasons.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${reasonLabel(r)} ${n}`).join(", "),
      href: `/admin?view=portals${everyone ? "&all=1" : ""}`,
    });
  for (const u of users.filter((x) => within(x.joined, 2 * DAY)))
    att.push({ tone: undefined, title: `New sign-up: ${u.email}`, detail: `Joined ${ago(u.joined)} from ${u.source}. Furthest step: ${stageLabel(u.stage).toLowerCase()}.`, href: `/admin?view=user&id=${u.id}` });
  const stalled = users.filter((u) => !u.submitted && !within(u.lastActive, 3 * DAY) && !within(u.joined, 2 * DAY)).sort((a, b) => (b.lastActive ?? b.joined).localeCompare(a.lastActive ?? a.joined));
  for (const u of stalled.slice(0, 5))
    att.push({ tone: "signal", title: `${u.email} has gone quiet`, detail: `Last active ${ago(u.lastActive ?? u.joined)}, stopped at "${stageLabel(u.stage).toLowerCase()}"${u.waiting ? `, ${u.waiting} application${u.waiting === 1 ? "" : "s"} waiting on them` : ""}.`, href: `/admin?view=user&id=${u.id}` });
  if (stalled.length > 5) att.push({ tone: "signal", title: `${stalled.length - 5} more users have gone quiet`, href: `/admin?view=users${everyone ? "&all=1" : ""}` });

  return (
    <div className="space-y-10">
      <HealthStrip h={h} />
      <ScopeNote d={d} hidden={hidden} everyone={everyone} view="overview" />

      <Section title="Needs your attention" note={att.length ? undefined : "Nothing right now."}>
        {att.length > 0 && (
          <Card>
            <ul className="divide-y divide-line">
              {att.map((a, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${dot(a.tone)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium">{a.href ? <Link href={a.href} className="decoration-current/30 underline-offset-4 hover:underline">{a.title}</Link> : a.title}</p>
                    {a.detail && <p className="mt-0.5 text-[13px] text-muted">{a.detail}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <Stat label="Accounts, all time" value={`${users.length}`} sub={`${users.filter((u) => within(u.joined, 7 * DAY)).length} new in 7 days`} />
        <Stat label="Active, last 7 days" value={`${users.filter((u) => within(u.lastActive, 7 * DAY)).length}`} sub="signed in or did something" />
        <Stat label="Have a shortlist" value={`${reached("shortlist")}`} sub={`${pct(reached("shortlist"), users.length)} of accounts`} />
        <Stat label="Signed a packet" value={`${reached("signed")}`} sub={`${pct(reached("signed"), users.length)} of accounts`} />
        <Stat label="Submitted, all time" value={`${submittedApps.length}`} sub={`application${submittedApps.length === 1 ? "" : "s"} for ${submitters} user${submitters === 1 ? "" : "s"}`} tone={submittedApps.length ? "go" : undefined} />
        <Stat label="Revenue, this month" value={monthPays.length ? money(monthPays) : "0"} sub={`${payers} paying user${payers === 1 ? "" : "s"} all time`} />
        <Stat label="AI cost, this month" value={$(spent)} sub={`${$(cost)} on ${everyone ? "these" : "real"} users, ${$(spent - cost)} on team and test`} />
      </dl>

      <Section title="Latest activity" note="What applicants and agents did, newest first. Background retries left out.">
        <Activity rows={feed} apps={appMap} users={userMap} everyone={everyone} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Where users are" note="Each account's furthest step.">
          <Card>
            <Bars rows={byStage} total={users.length} />
          </Card>
        </Section>
        <Section title="Applications by status" note={`${apps.length} across ${new Set(apps.map((a) => a.userId)).size} users, all time.`}>
          <Card>{statusRows.length ? <Bars rows={statusRows} total={apps.length} /> : <p className="px-4 py-4 text-[13.5px] text-muted">No applications yet.</p>}</Card>
        </Section>
        <Section title="Sign-ups per day">
          <Card>
            <Daily values={byDay(users.map((u) => u.joined))} label="Sign-ups" />
          </Card>
        </Section>
        <Section title="Where sign-ups come from" note="First-touch source, all time." action={<Link href={`/admin?view=growth${everyone ? "&all=1" : ""}`} className={`text-[13.5px] text-muted ${linkCls}`}>How each source converts</Link>}>
          <Card>
            <Bars rows={[...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)} total={users.length} />
          </Card>
        </Section>
      </div>
    </div>
  );
}

// ---- users ----

export async function UsersView({ since, everyone }: { since: string; everyone: boolean }) {
  const [d, runs] = await Promise.all([loadAdmin(), runsSince<{ user_id: string; cost_usd: number | null }>("user_id, cost_usd", since)]);
  const spend = new Map<string, number>();
  for (const r of runs) spend.set(r.user_id, (spend.get(r.user_id) ?? 0) + (Number(r.cost_usd) || 0));
  const { users, hidden } = scope(d, everyone);
  const stageLabel = (key: string) => STAGES.find((s) => s.key === key)?.label ?? key;
  const dash = <span className="text-muted">·</span>;
  return (
    <div className="space-y-4">
      <ScopeNote d={d} hidden={hidden} everyone={everyone} view="users" />
      <Section title={`Users (${users.length})`} note="Newest first. Open an account for its applications and history. Mark your own and test accounts as team so the numbers show real applicants.">
        <Table head={["User", "Counted as", "Joined", "Source", "Last active", "Furthest step", "Applications", "Submitted", "Stopped", "Docs", "Gmail", "AI this month"]} min="78rem">
          {users.length ? (
            [...users]
              .sort((a, b) => b.joined.localeCompare(a.joined))
              .map((u) => (
                <tr key={u.id}>
                  <td className="max-w-[16rem] px-4 py-3">
                    <span className="block truncate">
                      <UserLink u={u} everyone={everyone} />
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {[u.name, u.plan !== "free" ? u.plan : null].filter(Boolean).join(", ") || "no name yet"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TeamToggle userId={u.id} team={u.team} admin={u.admin} />
                  </td>
                  <td className="px-4 py-3 text-muted">{date(u.joined)}</td>
                  <td className="px-4 py-3 text-muted">{u.source}</td>
                  <td className="px-4 py-3 text-muted">{ago(u.lastActive)}</td>
                  <td className="px-4 py-3">{stageLabel(u.stage)}</td>
                  <td className={td}>{u.appCount || dash}</td>
                  <td className={`${td} ${u.submitted ? "font-medium text-go" : ""}`}>{u.submitted || dash}</td>
                  <td className={`${td} ${u.waiting ? "text-signal" : ""}`}>{u.waiting || dash}</td>
                  <td className={td}>{u.docs || dash}</td>
                  <td className="px-4 py-3">{u.gmail?.status === "active" ? <Pill tone="go">Connected</Pill> : dash}</td>
                  <td className={td}>
                    {$(spend.get(u.id) ?? 0)}
                    <Bar share={(spend.get(u.id) ?? 0) / Math.max(0.01, u.budget)} tone={(spend.get(u.id) ?? 0) > u.budget * 0.9 ? "stop" : undefined} />
                  </td>
                </tr>
              ))
          ) : (
            <Empty cols={12}>No real users yet.</Empty>
          )}
        </Table>
      </Section>
    </div>
  );
}

// ---- one user ----

export async function UserView({ id, since, everyone }: { id: string; since: string; everyone: boolean }) {
  const db = admin();
  const d = await loadAdmin();
  const u = d.users.find((x) => x.id === id);
  if (!u) return <p className="text-muted">No account with that id. It may have been deleted.</p>;
  const [runs, { data: events }, { data: errors }, { data: jobs }] = await Promise.all([
    runsSince<{ agent: string; cost_usd: number | null; status: string }>("agent, cost_usd, status", since, id),
    db.from("events").select("user_id, actor, action, application_id, created_at").eq("user_id", id).not("action", "in", `(${NOISE.join(",")})`).order("created_at", { ascending: false }).limit(60),
    db.from("agent_runs").select("agent, error, started_at").eq("user_id", id).eq("status", "failed").not("error", "is", null).order("started_at", { ascending: false }).limit(200),
    db.from("jobs").select("agent, task, status, last_error, attempts, run_at, finished_at").eq("user_id", id).in("status", ["queued", "running", "failed"]).order("created_at", { ascending: false }).limit(50),
  ]);
  const mine = d.apps.filter((a) => a.userId === id).sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
  const appMap = new Map(d.apps.map((a) => [a.id, a]));
  const spent = runs.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const cats: Record<Category, number> = { research: 0, writing: 0, core: 0 };
  for (const r of runs) cats[categoryOf(r.agent)] += Number(r.cost_usd) || 0;
  const errGroups = groupErrors(errors ?? []);
  const back = `/admin?view=users${everyone ? "&all=1" : ""}`;

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Link href={back} className={`text-[13px] text-muted ${linkCls}`}>
          All users
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-[28px] leading-tight">{u.name || u.email}</h2>
          <TeamToggle userId={u.id} team={u.team} admin={u.admin} />
        </div>
        <p className="text-[13.5px] text-muted">
          {u.name ? `${u.email}. ` : ""}Joined {stamp(u.joined)} from {u.source}
          {u.invited ? " (invited)" : ""}. Plan: {u.plan}. Last signed in {ago(u.lastSignIn)}, last active {ago(u.lastActive)}.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Applications" value={`${u.appCount}`} sub={`${u.submitted} submitted`} tone={u.submitted ? "go" : undefined} />
        <Stat label="Stopped" value={`${u.waiting}`} sub="waiting on them or failed" tone={u.waiting ? "signal" : undefined} />
        <Stat label="Documents" value={`${u.docs}`} sub="uploaded" />
        <Stat label="Gmail" value={u.gmail?.status === "active" ? "On" : "Off"} sub={u.gmail ? `${u.gmail.email}${u.gmail.status !== "active" ? `, ${u.gmail.status}` : ""}` : "not connected"} />
        <Stat label="AI, this month" value={$(spent)} sub={`of ${$(u.budget)} budget. Research ${$(cats.research)}, writing ${$(cats.writing)}, core ${$(cats.core)}`} tone={spent > u.budget * 0.9 ? "stop" : undefined} />
        <Stat label="Paid, all time" value={u.payments.length ? money(u.payments) : "0"} sub={`${u.payments.length} payment${u.payments.length === 1 ? "" : "s"}`} />
      </dl>

      <Section title="Journey" note="When this account first reached each step.">
        <Table head={["Step", "When", "After sign-up"]} min="30rem">
          {MILESTONES.map((m) => {
            const at = u.journey.at[m.key];
            return (
              <tr key={m.key}>
                <td className="px-4 py-3">{m.label}</td>
                <td className="px-4 py-3 text-muted">{at ? stamp(at) : "not yet"}</td>
                <td className={td}>{at ? duration(Date.parse(at) - Date.parse(u.joined)) : <span className="text-muted">·</span>}</td>
              </tr>
            );
          })}
        </Table>
      </Section>

      <Section title={`Applications (${mine.length})`} note="Most recently worked on first.">
        <Table head={["School", "Status", "Agents", "What they said", "Portal", "Updated"]} min="60rem">
          {mine.length ? (
            mine.map((a) => (
              <tr key={a.id}>
                <td className="max-w-[16rem] px-4 py-3">
                  <span className="block truncate">{a.school}</span>
                  {a.program && <span className="block truncate text-[12px] text-muted">{a.program}</span>}
                </td>
                <td className="px-4 py-3">{STATUS_LABEL[a.status] ?? a.status}</td>
                <td className="px-4 py-3">
                  <Pill tone={runnerTone(a.runner)}>{RUNNER_LABEL[a.runner] ?? a.runner}</Pill>
                  {a.reason && a.reason !== "failed" && <span className="mt-1 block text-[12px] text-muted">{reasonLabel(a.reason)}</span>}
                </td>
                <td className="max-w-[22rem] px-4 py-3 text-[12.5px] text-muted">
                  <span className="line-clamp-3">{a.note || "·"}</span>
                </td>
                <td className="max-w-[10rem] truncate px-4 py-3 font-mono text-[12px] text-muted">{a.host ?? "·"}</td>
                <td className="px-4 py-3 text-muted">{ago(a.updated)}</td>
              </tr>
            ))
          ) : (
            <Empty cols={6}>No applications yet.</Empty>
          )}
        </Table>
      </Section>

      {((jobs ?? []).length > 0 || errGroups.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Open and failed jobs">
            <Card>
              <ul className="divide-y divide-line">
                {(jobs ?? []).length ? (
                  (jobs ?? []).map((j, i) => (
                    <li key={i} className="px-4 py-2.5 text-[13px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[12.5px]">
                          {j.agent}.{j.task}
                        </span>
                        <Pill tone={j.status === "failed" ? "stop" : undefined}>
                          {j.status === "queued" ? `due ${ago(j.run_at)}` : j.status}
                          {j.attempts ? `, ${j.attempts} tries` : ""}
                        </Pill>
                      </div>
                      {j.last_error && <p className="mt-1 break-words font-mono text-[11.5px] text-muted">{String(j.last_error).slice(0, 240)}</p>}
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-3 text-[13.5px] text-muted">None.</li>
                )}
              </ul>
            </Card>
          </Section>
          <Section title="AI calls that failed" note="Grouped by cause, latest 200.">
            <ErrorList groups={errGroups} />
          </Section>
        </div>
      )}

      <Section title="History" note="The latest 60 things that happened on this account. Background retries left out.">
        <Activity rows={(events ?? []) as Parameters<typeof Activity>[0]["rows"]} apps={appMap} users={new Map([[u.id, u]])} everyone={everyone} showUser={false} />
      </Section>
    </div>
  );
}

// ---- submissions ----

export async function SubmissionsView({ everyone }: { everyone: boolean }) {
  const d = await loadAdmin();
  const { users, apps, hidden } = scope(d, everyone);
  const trips = users.map((u) => u.journey).sort((a, b) => b.signedUp.localeCompare(a.signedUp));
  const funnel = summarize(trips);
  const done = apps.filter((a) => SUBMITTED.has(a.status)).sort((a, b) => (b.submittedAt ?? b.updated ?? "").localeCompare(a.submittedAt ?? a.updated ?? ""));
  const userMap = new Map(d.users.map((u) => [u.id, u]));
  return (
    <div className="space-y-10">
      <ScopeNote d={d} hidden={hidden} everyone={everyone} view="submissions" />
      <Section title="Time to first submission" note="From sign-up to the first application the agents submitted. All time.">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Users who submitted" value={`${funnel.submitted} of ${funnel.users}`} tone={funnel.submitted ? "go" : undefined} />
          <Stat label="Median time" value={duration(funnel.medianToSubmitMs)} />
          <Stat label="Within 24 hours" value={`${funnel.within24h}`} />
          <Stat label="Within 7 days" value={`${funnel.within7d}`} />
        </dl>
      </Section>
      <Section title={`Submitted applications (${done.length})`} note="Newest first.">
        <Table head={["School", "User", "Status", "Submitted"]} min="40rem">
          {done.length ? (
            done.map((a) => (
              <tr key={a.id}>
                <td className="max-w-[18rem] px-4 py-3">
                  <span className="block truncate">{a.school}</span>
                  {a.program && <span className="block truncate text-[12px] text-muted">{a.program}</span>}
                </td>
                <td className="max-w-[14rem] truncate px-4 py-3 text-muted">{userMap.get(a.userId) ? <UserLink u={userMap.get(a.userId)!} everyone={everyone} /> : a.email}</td>
                <td className="px-4 py-3">{STATUS_LABEL[a.status] ?? a.status}</td>
                <td className="px-4 py-3 text-muted">{a.submittedAt ? stamp(a.submittedAt) : "date not recorded"}</td>
              </tr>
            ))
          ) : (
            <Empty cols={4}>No submissions yet.</Empty>
          )}
        </Table>
      </Section>
      <Section title="Where people stop" note="How many users reached each step, and how long it took (medians).">
        <Table head={["Step", "Users who reached it", "From sign-up", "From the step before"]}>
          {funnel.steps.map((x) => (
            <tr key={x.key}>
              <td className="px-4 py-3">{x.label}</td>
              <td className={td}>
                {x.users} <span className="text-muted">({pct(x.users, funnel.users)})</span>
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
              <td className="max-w-[14rem] truncate px-4 py-3">
                <UserLink u={{ id: j.userId, email: j.email }} everyone={everyone} />
              </td>
              <td className={td}>{date(j.signedUp)}</td>
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

// ---- portals ----

export async function PortalsView({ everyone }: { everyone: boolean }) {
  const d = await loadAdmin();
  const { apps, hidden } = scope(d, everyone);
  const worked = apps.filter((a) => a.runner !== "idle" || SUBMITTED.has(a.status));
  // per school, across every user: how often the agents get through
  const bySchool = new Map<string, { school: string; host: string | null; total: number; submitted: number; stopped: number; running: number; reasons: Map<string, number>; last: string | null }>();
  for (const a of worked) {
    const r = bySchool.get(a.school) ?? { school: a.school, host: a.host, total: 0, submitted: 0, stopped: 0, running: 0, reasons: new Map(), last: null };
    r.total++;
    if (SUBMITTED.has(a.status) || a.runner === "submitted") r.submitted++;
    else if (a.runner === "needs_you" || a.runner === "failed") {
      r.stopped++;
      const why = a.reason ?? "other";
      r.reasons.set(why, (r.reasons.get(why) ?? 0) + 1);
    } else if (a.runner === "running" || a.runner === "ready") r.running++;
    r.host ??= a.host;
    if (a.updated && (!r.last || a.updated > r.last)) r.last = a.updated;
    bySchool.set(a.school, r);
  }
  const rows = [...bySchool.values()].sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  const totals = rows.reduce((s, r) => ({ total: s.total + r.total, submitted: s.submitted + r.submitted, stopped: s.stopped + r.stopped, running: s.running + r.running }), { total: 0, submitted: 0, stopped: 0, running: 0 });
  const ids = worked.sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? "")).map((a) => a.id).slice(0, 150);
  const { data } = ids.length
    ? await admin().from("applications").select("id, user_id, runner_status, runner_note, portal_url, runner_state, runner_updated_at, programs(schools(name))").in("id", ids).order("runner_updated_at", { ascending: false })
    : { data: [] };
  const email = new Map(d.users.map((u) => [u.id, u.email]));
  return (
    <div className="space-y-10">
      <ScopeNote d={d} hidden={hidden} everyone={everyone} view="portals" />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Applications the agents worked on" value={`${totals.total}`} sub={`at ${rows.length} school${rows.length === 1 ? "" : "s"}, all time`} />
        <Stat label="Submitted" value={`${totals.submitted}`} sub={`${pct(totals.submitted, totals.total)} of them`} tone={totals.submitted ? "go" : undefined} />
        <Stat label="Stopped" value={`${totals.stopped}`} sub="waiting on the applicant or failed" tone={totals.stopped ? "signal" : undefined} />
        <Stat label="In progress" value={`${totals.running}`} sub="running or queued" />
      </dl>
      <Section title="By school" note="Most recently worked on first.">
        <Table head={["School", "Portal", "Applications", "Submitted", "Stopped", "In progress", "Why they stopped", "Last run"]} min="62rem">
          {rows.length ? (
            rows.map((r) => (
              <tr key={r.school}>
                <td className="max-w-[16rem] truncate px-4 py-3">{r.school}</td>
                <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-[12px] text-muted">{r.host ?? "·"}</td>
                <td className={td}>{r.total}</td>
                <td className={`${td} ${r.submitted ? "font-medium text-go" : ""}`}>{r.submitted}</td>
                <td className={`${td} ${r.stopped ? "text-signal" : ""}`}>{r.stopped}</td>
                <td className={td}>{r.running}</td>
                <td className="px-4 py-3 text-[12.5px] text-muted">{[...r.reasons.entries()].map(([why, n]) => `${reasonLabel(why)}${n > 1 ? ` ×${n}` : ""}`).join(", ") || "·"}</td>
                <td className="px-4 py-3 text-muted">{ago(r.last)}</td>
              </tr>
            ))
          ) : (
            <Empty cols={8}>The agents haven&apos;t worked on any portal yet.</Empty>
          )}
        </Table>
      </Section>
      <Section title="Each run" note="Newest first, latest 150. Open one for what the page said, the last steps and the raw page details.">
        <RunList rows={(data ?? []) as Record<string, unknown>[]} email={email} everyone={everyone} />
      </Section>
    </div>
  );
}

function RunList({ rows, email, everyone }: { rows: Record<string, unknown>[]; email: Map<string, string>; everyone: boolean }) {
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-[13.5px] text-muted">No runs yet.</p>}
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
        const status = (a.runner_status as string) ?? "idle";
        const uid = a.user_id as string;
        return (
          <details key={a.id as string} className="group rounded-2xl border border-line bg-surface shadow-card">
            <summary className="grid cursor-pointer list-none gap-x-4 gap-y-1 px-4 py-3 marker:hidden sm:grid-cols-[minmax(0,14rem)_9rem_minmax(0,1fr)_6rem] sm:items-center">
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-medium">{p?.schools?.name ?? "Unknown school"}</span>
                <span className="block truncate text-[12px] text-muted">{email.get(uid) ?? "deleted account"}</span>
              </span>
              <span>
                <Pill tone={runnerTone(status)}>{RUNNER_LABEL[status] ?? status}</Pill>
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
                  <dd className="inline">{st.reason ? reasonLabel(st.reason) : "none"}</dd>
                </div>
                <div>
                  <dt className="inline text-muted">Steps: </dt>
                  <dd className="inline">
                    {st.steps ?? 0} this run, {st.totalSteps ?? 0} in all{st.stuckRepeats ? `, stuck ${st.stuckRepeats}× on this page` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-muted">Applicant: </dt>
                  <dd className="inline">{email.get(uid) ? <UserLink u={{ id: uid, email: email.get(uid)! }} everyone={everyone} /> : "deleted account"}</dd>
                </div>
                {dbg?.title && (
                  <div className="truncate">
                    <dt className="inline text-muted">Page title: </dt>
                    <dd className="inline">{dbg.title}</dd>
                  </div>
                )}
              </dl>
              {dbg?.complaints?.length || dbg?.errors?.length ? <p className="text-stop">What the page said: {[...(dbg?.errors ?? []), ...(dbg?.complaints ?? [])].join(" / ")}</p> : null}
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

// ---- costs ----

export async function CostsView({ since, everyone }: { since: string; everyone: boolean }) {
  const monthAgo = new Date(Date.now() - 30 * DAY).toISOString();
  const from = since < monthAgo ? since : monthAgo;
  type Run = { user_id: string; agent: string; model: string; cost_usd: number | null; input_tokens: number | null; output_tokens: number | null; started_at: string };
  const [d, recent] = await Promise.all([loadAdmin(), runsSince<Run>("user_id, agent, model, cost_usd, input_tokens, output_tokens, started_at", from)]);
  const { ids } = scope(d, everyone);
  // a call the api turned away (no credit, overloaded) never reached the model and cost nothing: count it apart
  const billedRun = (r: Run) => r.cost_usd != null || (r.input_tokens ?? 0) > 0;
  const all = recent.filter((r) => r.started_at >= since);
  const runs = all.filter(billedRun);
  const refused = all.length - runs.length;
  const perDay = new Map<string, number>();
  for (const r of recent) if (billedRun(r)) perDay.set(r.started_at.slice(0, 10), (perDay.get(r.started_at.slice(0, 10)) ?? 0) + (Number(r.cost_usd) || 0));

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
    const key = `${r.agent}|${r.model}`;
    const a = perAgent.get(key) ?? { cost: 0, calls: 0, inTok: 0, outTok: 0 };
    a.cost += c;
    a.calls++;
    a.inTok += r.input_tokens ?? 0;
    a.outTok += r.output_tokens ?? 0;
    perAgent.set(key, a);
  }
  const total = [...perUser.values()].reduce((s, u) => s + u.cost, 0);
  const real = [...perUser.entries()].filter(([id]) => !d.team.has(id)).reduce((s, [, u]) => s + u.cost, 0);
  const realUsers = d.users.filter((u) => !u.team).length;
  const agents = [...perAgent.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const top = agents[0]?.[1].cost || 1;
  const days = Math.max(1, (Date.now() - Date.parse(since)) / DAY);
  const shown = d.users.filter((u) => ids.has(u.id) || perUser.has(u.id)).filter((u) => everyone || !u.team || (perUser.get(u.id)?.cost ?? 0) > 0);

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="AI cost, this month" value={$(total)} sub={`${$(total / days)} a day. Real users ${$(real)}, team and test ${$(total - real)}`} />
        <Stat label="Per real user, this month" value={$(real / Math.max(1, realUsers))} sub={`${realUsers} real account${realUsers === 1 ? "" : "s"}`} />
        <Stat label="Billed calls, this month" value={k(runs.length)} sub={`${$(total / Math.max(1, runs.length))} each${refused ? `. ${k(refused)} more turned away by the API, not billed` : ""}`} />
        <Stat label="Most expensive agent" value={agents[0]?.[0].split("|")[0] ?? "none"} sub={agents[0] ? `${$(agents[0][1].cost)}, ${pct(agents[0][1].cost, total)} of spend` : undefined} />
      </dl>
      <Section title="Spend per day" note="Billed calls only, every account.">
        <Card>
          <Daily values={perDay} label="AI spend" fmt={$} />
        </Card>
      </Section>
      <Section title="By agent and model" note="This month, every account.">
        <Table head={["Agent", "Model", "Calls", "Tokens in / out", "Cost", "Per call"]}>
          {agents.length ? (
            agents.map(([key, a]) => {
              const [agent, model] = key.split("|");
              return (
                <tr key={key}>
                  <td className="px-4 py-3 font-medium">{agent}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted">{model}</td>
                  <td className={td}>{k(a.calls)}</td>
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
            })
          ) : (
            <Empty cols={6}>No billed calls this month.</Empty>
          )}
        </Table>
      </Section>
      <Section title="By user" note="This month, against the budget the agents are held to (plan, paid submissions, and any override).">
        <Table head={["User", "Plan", "Spent of budget", "Research", "Writing", "Core", "Calls"]} min="52rem">
          {shown
            .map((u) => ({ u, r: perUser.get(u.id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 } }))
            .sort((a, b) => b.r.cost - a.r.cost)
            .map(({ u, r }) => {
              const share = u.budget ? r.cost / u.budget : 0;
              return (
                <tr key={u.id}>
                  <td className="max-w-[14rem] truncate px-4 py-3">
                    <UserLink u={u} everyone={everyone} />
                    {u.team && <span className="ml-2 text-[12px] text-muted">team</span>}
                  </td>
                  <td className="px-4 py-3 capitalize">{u.admin ? "staff" : u.plan}</td>
                  <td className={td}>
                    <span className={share > 0.9 ? "font-medium text-stop" : ""}>
                      {$(r.cost)} <span className="text-muted">of {$(u.budget)}</span>
                    </span>
                    <Bar share={share} tone={share > 0.9 ? "stop" : undefined} />
                  </td>
                  {(["research", "writing", "core"] as const).map((c) => (
                    <td key={c} className={td}>
                      {$(r.cat[c])} <span className="text-muted">of {$(u.budget * CATEGORY_SHARE[c])}</span>
                    </td>
                  ))}
                  <td className={td}>{k(r.calls)}</td>
                </tr>
              );
            })}
        </Table>
      </Section>
    </div>
  );
}

// ---- growth ----

export async function GrowthView({ everyone }: { everyone: boolean }) {
  const db = admin();
  const [d, alerts, { data: ambassadors }] = await Promise.all([
    loadAdmin(),
    db.from("alert_subscribers").select("id", { count: "exact", head: true }).not("confirmed_at", "is", null).is("unsubscribed_at", null),
    db.from("ambassador_applications").select("name, email, country, institution, audience, channels, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const { users, hidden } = scope(d, everyone);
  const within = (iso: string, days: number) => Date.now() - Date.parse(iso) < days * DAY;
  const paying = new Set(users.filter((u) => u.payments.length).map((u) => u.id)).size;
  // how each source converts, step by step
  const bySource = new Map<string, AdminUser[]>();
  for (const u of users) bySource.set(u.source, [...(bySource.get(u.source) ?? []), u]);
  const steps = ["profile", "shortlist", "signed", "submitted"] as const;
  const rows = [...bySource.entries()].sort((a, b) => b[1].length - a[1].length);
  return (
    <div className="space-y-10">
      <ScopeNote d={d} hidden={hidden} everyone={everyone} view="growth" />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Accounts, all time" value={`${users.length}`} />
        <Stat label="New today" value={`${users.filter((u) => within(u.joined, 1)).length}`} />
        <Stat label="New, 7 days" value={`${users.filter((u) => within(u.joined, 7)).length}`} />
        <Stat label="New, 30 days" value={`${users.filter((u) => within(u.joined, 30)).length}`} />
        <Stat label="Joined by invite" value={`${users.filter((u) => u.invited).length}`} />
        <Stat label="Have an application" value={`${users.filter((u) => u.appCount).length}`} />
        <Stat label="Paying" value={`${paying}`} />
        <Stat label="Deadline alerts" value={alerts.error ? "n/a" : `${alerts.count ?? 0}`} sub="confirmed subscribers" />
      </dl>
      <Section title="How each source converts" note="Accounts by first-touch source, and how many reached each step. All time.">
        <Table head={["Source", "Sign-ups", "Started profile", "Shortlist", "Signed", "Submitted", "Paying"]} min="44rem">
          {rows.length ? (
            rows.map(([src, us]) => (
              <tr key={src}>
                <td className="px-4 py-3">{src}</td>
                <td className={td}>{us.length}</td>
                {steps.map((s) => {
                  const n = us.filter((u) => u.journey.at[s]).length;
                  return (
                    <td key={s} className={td}>
                      {n} <span className="text-muted">({pct(n, us.length)})</span>
                    </td>
                  );
                })}
                <td className={td}>{us.filter((u) => u.payments.length).length}</td>
              </tr>
            ))
          ) : (
            <Empty cols={7}>No sign-ups yet.</Empty>
          )}
        </Table>
      </Section>
      <Section title="Ambassador applications" note="Newest first.">
        <Card>
          <ul className="divide-y divide-line text-[14px]">
            {(ambassadors ?? []).length ? (
              (ambassadors ?? []).map((a) => (
                <li key={a.email + a.created_at} className="px-4 py-3">
                  <p className="font-medium">
                    {a.name} <span className="font-normal text-muted">{a.email}</span>
                    <span className="ml-2 text-[12px] text-muted">{ago(a.created_at)}</span>
                  </p>
                  <p className="text-muted">{[a.country, a.institution].filter(Boolean).join(", ")}</p>
                  {a.audience && <p className="mt-0.5">{a.audience}</p>}
                  {a.channels && <p className="mt-0.5 break-all text-muted">{a.channels}</p>}
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-muted">None yet.</li>
            )}
          </ul>
        </Card>
      </Section>
    </div>
  );
}

// ---- learning ----

export async function LearningView() {
  return (
    <Section title="Learning" note="Lessons the agents learned from stuck runs and edits. Portal notes apply at once; general lessons wait for your approval.">
      <LessonsAdmin {...await lessonData()} />
    </Section>
  );
}

// ---- system ----

// one line per cause: the same error with different ids, urls or numbers is one problem
function groupErrors(rows: { agent: string; error: string | null; started_at: string }[]) {
  const by = new Map<string, { sig: string; sample: string; agents: Set<string>; n: number; last: string }>();
  for (const r of rows) {
    const e = String(r.error ?? "");
    const sig = e
      .replace(/https?:\/\/\S+/g, "<url>")
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<id>")
      .replace(/req_[A-Za-z0-9]+/g, "<req>")
      .replace(/\d+/g, "#")
      .slice(0, 140);
    const g = by.get(sig) ?? { sig, sample: e.slice(0, 400), agents: new Set<string>(), n: 0, last: r.started_at };
    g.n++;
    g.agents.add(r.agent);
    if (r.started_at > g.last) g.last = r.started_at;
    by.set(sig, g);
  }
  return [...by.values()].sort((a, b) => b.last.localeCompare(a.last));
}

function ErrorList({ groups }: { groups: ReturnType<typeof groupErrors> }) {
  return (
    <Card>
      <ul className="divide-y divide-line">
        {groups.length ? (
          groups.map((g) => (
            <li key={g.sig} className="px-4 py-2.5 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="stop">{k(g.n)}×</Pill>
                <span className="font-medium">{[...g.agents].join(", ")}</span>
                <span className="text-muted">last {ago(g.last)}</span>
              </div>
              <p className="mt-1 break-words font-mono text-[11.5px] text-muted">{g.sample}</p>
            </li>
          ))
        ) : (
          <li className="px-4 py-3 text-[13.5px] text-muted">None.</li>
        )}
      </ul>
    </Card>
  );
}

export async function SystemView({ since }: { since: string }) {
  const db = admin();
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const [h, failedRuns, open, { data: failedJobs }] = await Promise.all([
    health(),
    every<{ agent: string; error: string | null; started_at: string }>((a, b) => db.from("agent_runs").select("agent, error, started_at").eq("status", "failed").gte("started_at", since).order("started_at", { ascending: false }).range(a, b), 20_000),
    every<{ agent: string; task: string; status: string; run_at: string }>((a, b) => db.from("jobs").select("agent, task, status, run_at").in("status", ["queued", "running"]).order("id").range(a, b)),
    db.from("jobs").select("agent, task, last_error, attempts, finished_at, user_id").eq("status", "failed").gte("finished_at", weekAgo).order("finished_at", { ascending: false }).limit(200),
  ]);
  const byJob = new Map<string, { queued: number; due: number; running: number; oldest: string | null }>();
  const now = new Date().toISOString();
  for (const j of open) {
    const key = `${j.agent}.${j.task}`;
    const r = byJob.get(key) ?? { queued: 0, due: 0, running: 0, oldest: null };
    if (j.status === "running") r.running++;
    else {
      r.queued++;
      if (j.run_at <= now) {
        r.due++;
        if (!r.oldest || j.run_at < r.oldest) r.oldest = j.run_at;
      }
    }
    byJob.set(key, r);
  }
  const jobErrors = groupErrors((failedJobs ?? []).map((j) => ({ agent: `${j.agent}.${j.task}`, error: j.last_error, started_at: j.finished_at })));
  return (
    <div className="space-y-10">
      <HealthStrip h={h} />
      <Section title="Job queue" note="Jobs waiting or running now, by agent and task. Due means its start time has passed.">
        <Table head={["Job", "Waiting", "Due now", "Oldest due", "Running"]} min="34rem">
          {byJob.size ? (
            [...byJob.entries()]
              .sort((a, b) => b[1].due - a[1].due || b[1].queued - a[1].queued)
              .map(([key, r]) => (
                <tr key={key}>
                  <td className="px-4 py-3 font-mono text-[12.5px]">{key}</td>
                  <td className={td}>{r.queued}</td>
                  <td className={`${td} ${r.due ? "text-signal" : ""}`}>{r.due}</td>
                  <td className="px-4 py-3 text-muted">{r.oldest ? ago(r.oldest) : "·"}</td>
                  <td className={td}>{r.running}</td>
                </tr>
              ))
          ) : (
            <Empty cols={5}>The queue is empty.</Empty>
          )}
        </Table>
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Failed jobs" note="Last 7 days, grouped by cause.">
          <ErrorList groups={jobErrors} />
        </Section>
        <Section title="Failed AI calls" note={`This month: ${k(failedRuns.length)} in all, grouped by cause.`}>
          <ErrorList groups={groupErrors(failedRuns)} />
        </Section>
      </div>
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
  for (const r of runs) for (const id of r.lesson_ids ?? []) uses.set(id, (uses.get(id) ?? 0) + 1);
  const withUses = (xs: typeof rows) => xs.map((l) => ({ ...l, uses: uses.get(l.id) ?? 0 }));
  const personal = rows.filter((l) => l.scope === "user" && l.status === "active");
  return {
    proposed: withUses(global.filter((l) => l.status === "proposed")),
    active: withUses(global.filter((l) => l.status === "active")),
    retired: withUses(global.filter((l) => l.status === "retired").slice(0, 10)),
    personal: { users: new Set(personal.map((l) => l.user_id)).size, lessons: personal.length },
  };
}
