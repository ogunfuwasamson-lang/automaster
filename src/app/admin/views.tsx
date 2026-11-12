import Link from "next/link";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { admin } from "@/lib/supabase/admin";
import { runsSince } from "@/lib/runs";
import { categoryOf, monthStartUTC, CATEGORY_SHARE, type Category } from "@/lib/pricing";
import { LessonsAdmin } from "@/components/learning/lessons-admin";
import { RunEval } from "@/components/learning/evals-admin";
import { QUESTIONS } from "@/evals/questions";
import { PASS, scoreRules } from "@/evals/score";
import { sampleSheet } from "@/evals/sample";
import { MILESTONES, duration, summarize } from "@/lib/first-submission";
import { STAGES, SUBMITTED, every, loadAdmin, scope, type AdminApp, type AdminUser, type Payment } from "./data";
import { TeamToggle } from "./team-toggle";
import { AccountActions } from "./account-actions";
import { DOC_KINDS } from "@/lib/doc-kinds";
import { href, inRange, type Range } from "./range";
import { CreditEditor } from "./credit-editor";
import { creditPolicy } from "@/lib/credit";
import { paymentAttempts } from "@/lib/billing";
import { DEFAULT_POLICY } from "@/lib/credit-policy";
import { dayStartUTC, tierOf, type Tier } from "@/lib/credit-rules";

// the operator console's views. each loads its own data, so switching views stays quick. every number follows the
// period in the range bar (and says so), and leaves out team and test accounts unless the operator asks for everyone.
// long lists scroll inside their own panel, so a view fits on a screen or two instead of one long page.

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

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

// a titled panel; `scroll` caps its height and lets the body scroll, so long lists don't stretch the page
const SCROLL = { sm: "max-h-[16rem]", md: "max-h-[24rem]", lg: "max-h-[34rem]", xl: "max-h-[70vh]" } as const;
function Panel({ title, note, action, scroll, className = "", children }: { title: ReactNode; note?: ReactNode; action?: ReactNode; scroll?: keyof typeof SCROLL; className?: string; children: ReactNode }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border border-line bg-surface shadow-card ${className}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-semibold">{title}</h2>
          {note && <p className="text-[12.5px] text-muted">{note}</p>}
        </div>
        {action && <div className="text-[13px]">{action}</div>}
      </header>
      <div className={`min-h-0 ${scroll ? `${SCROLL[scroll]} overflow-y-auto overscroll-contain` : ""}`}>{children}</div>
    </section>
  );
}

type Tone = "go" | "stop" | "signal" | undefined;
const toneText = (t: Tone) => (t === "go" ? "text-go" : t === "stop" ? "text-stop" : t === "signal" ? "text-signal" : "");
const dot = (t: Tone) => (t === "go" ? "bg-go" : t === "stop" ? "bg-stop" : t === "signal" ? "bg-signal" : "bg-neutral-400");

function Kpis({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{children}</dl>;
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: Tone }) {
  return (
    <Card className="px-3.5 py-3">
      <dt className="truncate text-[12px] text-muted">{label}</dt>
      <dd className={`mt-0.5 font-serif text-[24px] leading-tight tabular-nums ${toneText(tone)}`}>{value}</dd>
      {sub && <dd className="mt-0.5 line-clamp-2 text-[12px] text-muted">{sub}</dd>}
    </Card>
  );
}

function Pill({ tone, children }: { tone?: Tone; children: ReactNode }) {
  const cls = tone === "go" ? "border-go/30 text-go" : tone === "stop" ? "border-stop/30 text-stop" : tone === "signal" ? "border-signal/30 text-signal" : "border-line text-muted";
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] ${cls}`}>{children}</span>;
}

// a table whose header stays put while the panel around it scrolls
function Table({ head, children, min = "40rem" }: { head: string[]; children: ReactNode; min?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13.5px]" style={{ minWidth: min }}>
        <thead className="sticky top-0 z-[1] bg-surface">
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
    </div>
  );
}

function Empty({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td className="px-4 py-3 text-[13px] text-muted" colSpan={cols}>
        {children}
      </td>
    </tr>
  );
}

function Bar({ share, tone }: { share: number; tone?: Tone }) {
  return (
    <span className="mt-1 block h-1 w-20 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <span className={`block h-full ${tone === "stop" ? "bg-stop" : "bg-foreground/70"}`} style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} />
    </span>
  );
}

function Bars({ rows, total }: { rows: [string, number][]; total: number }) {
  if (!rows.length) return <p className="px-4 py-3 text-[13px] text-muted">Nothing in this period.</p>;
  return (
    <ul className="space-y-2 px-4 py-3">
      {rows.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-[13px]">
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

// one column per day across the period (a week per column when the period is longer than about three months)
function Daily({ values, label, range, fmt = String }: { values: Map<string, number>; label: string; range: Range; fmt?: (n: number) => string }) {
  const first = range.allTime ? [...values.keys()].sort()[0] ?? range.to.slice(0, 10) : range.from.slice(0, 10);
  const span = Math.max(1, Math.round((Date.parse(range.to.slice(0, 10)) - Date.parse(first)) / DAY) + 1);
  const step = span > 92 ? 7 : 1;
  const cols = Math.ceil(span / step);
  const buckets = Array.from({ length: cols }, (_, i) => {
    const start = new Date(Date.parse(first) + i * step * DAY).toISOString().slice(0, 10);
    let n = 0;
    for (let d = 0; d < step; d++) n += values.get(new Date(Date.parse(first) + (i * step + d) * DAY).toISOString().slice(0, 10)) ?? 0;
    return [start, n] as const;
  });
  const max = Math.max(0, ...buckets.map(([, n]) => n));
  const total = buckets.reduce((a, [, n]) => a + n, 0);
  return (
    <div className="px-4 pb-3 pt-3">
      <div className={`flex h-24 items-end ${cols > 60 ? "gap-px" : "gap-[3px]"}`} role="img" aria-label={`${label}, ${range.label}: ${fmt(total)} in total`}>
        {buckets.map(([d, c]) => (
          <span key={d} title={`${step > 1 ? "Week of " : ""}${d}: ${fmt(c)}`} className={`flex-1 rounded-t-sm ${c ? "bg-foreground/70" : "bg-neutral-200 dark:bg-neutral-800"}`} style={{ height: `${c && max ? Math.max(8, (c / max) * 100) : 4}%` }} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between gap-2 text-[11.5px] text-muted">
        <span>{date(first)}</span>
        <span>
          {fmt(total)} in all, peak {fmt(max)} {step > 1 ? "a week" : "a day"}
        </span>
        <span>{date(range.to)}</span>
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

// document kinds in words; short forms for the users table
const DOC_LABEL: Record<string, string> = Object.fromEntries(DOC_KINDS);
const DOC_SHORT: Record<string, string> = { cv: "CV", transcript: "Transcript", degree_certificate: "Degree", test_score: "Test score", passport: "Passport", reference_letter: "Reference", old_essay: "Old essay", award: "Award", portfolio: "Portfolio", financial: "Financial", other: "Other" };
const docLabel = (k: string) => DOC_LABEL[k] ?? k.replace(/_/g, " ");
function DocKinds({ kinds }: { kinds: Record<string, number> }) {
  const list = Object.entries(kinds).sort((a, b) => b[1] - a[1]);
  if (!list.length) return <span className="text-muted">·</span>;
  return (
    <span className="flex max-w-[15rem] flex-wrap gap-1">
      {list.map(([k, n]) => (
        <span key={k} title={docLabel(k)} className="whitespace-nowrap rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11.5px] dark:bg-neutral-800">
          {DOC_SHORT[k] ?? docLabel(k)}
          {n > 1 ? ` ×${n}` : ""}
        </span>
      ))}
    </span>
  );
}

type Who = { id: string; email: string; name?: string | null; location?: string | null };

// a person, everywhere in the console: their name (or email when there's none yet) and where they are
function UserLink({ u, r, everyone }: { u: Who; r: Range; everyone?: boolean }) {
  return (
    <span className="min-w-0" title={u.email}>
      <Link href={href("user", r, !!everyone, { id: u.id })} className="decoration-current/30 underline-offset-4 hover:underline">
        {u.name || u.email}
      </Link>
      <span className="text-muted">, {u.location ?? "location unknown"}</span>
    </span>
  );
}

// the same, as plain text (alert titles)
const whoText = (u: Who) => `${u.name || u.email} (${u.location ?? "location unknown"})`;


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
  "application.ready_for_review": "Essays finished: handed to the applicant for sign-off",
  "references.missing": "An application needs references and no referee email is on file",
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
  "account.deactivated": "Staff deactivated the account",
  "account.reactivated": "Staff reactivated the account",
};
// machine chatter: left out of activity feeds
const NOISE = ["runner.page", "runner.status_checked", "runner.resumed", "guard.allow", "guard.allow_with_undo", "system.pinged", "program.researching", "artifact.revised", "artifact.sent_back", "lesson.approve"];
const eventLabel = (a: string) => EVENT[a] ?? a.replace(/[._]/g, " ");
const actorLabel = (a: string) => (a === "user" ? "applicant" : a.replace(/^agent:/, ""));

type Ev = { user_id: string; actor: string; action: string; application_id: string | null; created_at: string };

function Activity({ rows, apps, users, r, everyone, showUser = true }: { rows: Ev[]; apps: Map<string, AdminApp>; users: Map<string, AdminUser>; r: Range; everyone: boolean; showUser?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {rows.length ? (
        rows.map((e, i) => {
          const u = users.get(e.user_id);
          const app = e.application_id ? apps.get(e.application_id) : undefined;
          return (
            <li key={i} className="grid gap-x-3 gap-y-0.5 px-4 py-2 text-[13px] sm:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,12rem)]">
              <span className="text-[12px] text-muted" title={stamp(e.created_at)}>
                {ago(e.created_at)}
              </span>
              <span className="min-w-0">
                {eventLabel(e.action)}
                {app && <span className="text-muted">: {app.school}</span>}
                <span className="ml-2 text-[12px] text-muted">by {actorLabel(e.actor)}</span>
              </span>
              {showUser && <span className="truncate text-[12px] text-muted sm:text-right">{u ? <UserLink u={u} r={r} everyone={everyone} /> : "deleted account"}</span>}
            </li>
          );
        })
      ) : (
        <li className="px-4 py-3 text-[13px] text-muted">Nothing in this period.</li>
      )}
    </ul>
  );
}

async function recentEvents(ids: string[], r: Range, limit: number) {
  if (!ids.length) return [];
  const { data } = await admin()
    .from("events")
    .select("user_id, actor, action, application_id, created_at")
    .in("user_id", ids.slice(0, 200))
    .not("action", "in", `(${NOISE.join(",")})`)
    .gte("created_at", r.from)
    .lte("created_at", r.to)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Ev[];
}

// agent runs inside the period (runsSince reads from a date; the end is cut here)
async function runsIn<T extends { started_at: string }>(cols: string, r: Range, userId?: string) {
  const rows = await runsSince<T>(cols.includes("started_at") ? cols : `${cols}, started_at`, r.from, userId);
  return rows.filter((x) => x.started_at <= r.to);
}

function ScopeNote({ hidden, everyone, r, view }: { hidden: number; everyone: boolean; r: Range; view: string }) {
  if (everyone || !hidden) return null;
  return (
    <p className="text-[12.5px] text-muted">
      {hidden} team or test account{hidden === 1 ? "" : "s"} left out.{" "}
      <Link href={href(view, r, true)} className={linkCls}>
        Include them
      </Link>
    </p>
  );
}

// ---- overview ----

type Attention = { tone: Tone; title: string; detail?: ReactNode; href?: string };

export async function OverviewView({ range: r, everyone }: { range: Range; everyone: boolean }) {
  const db = admin();
  const dayAgo = new Date(Date.now() - DAY).toISOString();
  const [h, d, runs, { data: failedJobs }] = await Promise.all([
    health(),
    loadAdmin(),
    runsIn<{ user_id: string; cost_usd: number | null; started_at: string }>("user_id, cost_usd, started_at", r),
    db.from("jobs").select("user_id, agent, task, last_error").eq("status", "failed").gte("finished_at", dayAgo).limit(1000),
  ]);
  // gmail connections that failed (any account: a setup problem hits everyone)
  const { data: mailFails } = await db.from("events").select("user_id, context, created_at").eq("action", "mail.connect_failed").gte("created_at", dayAgo).order("created_at", { ascending: false }).limit(200);
  const { users, ids, apps, payments, hidden } = scope(d, everyone);
  const userMap = new Map(d.users.map((u) => [u.id, u]));
  const appMap = new Map(d.apps.map((a) => [a.id, a]));
  const feed = await recentEvents([...ids], r, 80);
  const within = (iso: string | null, ms: number) => !!iso && Date.now() - Date.parse(iso) < ms;

  // the bill is the bill: the headline is everything spent; the split says how much went on these users
  const spent = runs.reduce((s, x) => s + (Number(x.cost_usd) || 0), 0);
  const cost = runs.filter((x) => ids.has(x.user_id)).reduce((s, x) => s + (Number(x.cost_usd) || 0), 0);
  const joined = users.filter((u) => inRange(u.joined, r));
  const active = users.filter((u) => inRange(u.lastActive, r));
  const reachedIn = (key: string) => users.filter((u) => inRange(u.journey.at[key as keyof typeof u.journey.at] ?? null, r)).length;
  const submittedIn = apps.filter((a) => SUBMITTED.has(a.status) && inRange(a.submittedAt, r));
  const pays = payments.filter((p) => inRange(p.at, r));
  const cohort = r.allTime ? users : joined;
  const byStage = STAGES.map((s) => [s.label, cohort.filter((u) => u.stage === s.key).length] as [string, number]).filter(([, n]) => n);
  const statusRows = STATUS_ORDER.map((st) => [STATUS_LABEL[st], apps.filter((a) => a.status === st).length] as [string, number]).filter(([, n]) => n);
  const sources = new Map<string, number>();
  for (const u of cohort) sources.set(u.source, (sources.get(u.source) ?? 0) + 1);
  const stageLabel = (key: string) => STAGES.find((s) => s.key === key)?.label ?? key;

  // what to look at first: live, whatever the period
  const att: Attention[] = [];
  const workerStale = !h.lastLock || Date.now() - Date.parse(h.lastLock) > 20 * 60_000;
  if (h.credit) att.push({ tone: "stop", title: "The agents can't work: Anthropic credit is empty", detail: `Nothing has run since ${ago(h.lastOk)}. ${h.queued} job${h.queued === 1 ? "" : "s"} waiting. Top up at console.anthropic.com; the worker picks up within 15 minutes.` });
  else if (h.pausedUntil) att.push({ tone: "stop", title: "AI calls are paused", detail: `The circuit breaker tripped after repeated failures. It retries at ${new Date(h.pausedUntil).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC.` });
  if (mailFails?.length) {
    const why = String((mailFails[0].context as { error?: string } | null)?.error ?? "");
    const setup = /permission|api key|unauthori[sz]ed|403|401|auth config/i.test(why);
    const who = new Set(mailFails.map((m) => m.user_id)).size;
    att.push({ tone: "stop", title: `Gmail connection failed ${mailFails.length} time${mailFails.length === 1 ? "" : "s"} in 24 hours, for ${who} user${who === 1 ? "" : "s"}`, detail: setup ? `A setup problem, so nobody can connect: ${why.slice(0, 220)}` : `Latest: ${why.slice(0, 220)}` });
  }
  if (workerStale && h.queued) att.push({ tone: "stop", title: "The job worker has stopped", detail: `No job picked up for ${ago(h.lastLock)}, with ${h.queued} due.`, href: href("system", r, everyone) });
  const myFailed = (failedJobs ?? []).filter((j) => ids.has(j.user_id));
  if (myFailed.length) {
    const kinds = new Map<string, number>();
    for (const j of myFailed) kinds.set(`${j.agent}.${j.task}`, (kinds.get(`${j.agent}.${j.task}`) ?? 0) + 1);
    att.push({ tone: "stop", title: `${myFailed.length} job${myFailed.length === 1 ? "" : "s"} failed in 24 hours`, detail: [...kinds.entries()].map(([kk, n]) => `${kk}${n > 1 ? ` ×${n}` : ""}`).join(", "), href: href("system", r, everyone) });
  }
  const stopped = apps.filter((a) => a.runner === "needs_you" || a.runner === "failed");
  const reasons = new Map<string, number>();
  for (const a of stopped) reasons.set(a.reason ?? "other", (reasons.get(a.reason ?? "other") ?? 0) + 1);
  if (stopped.length) {
    const who = new Set(stopped.map((a) => a.userId)).size;
    att.push({ tone: "signal", title: `${stopped.length} application${stopped.length === 1 ? "" : "s"} stopped, across ${who} user${who === 1 ? "" : "s"}`, detail: [...reasons.entries()].sort((a, b) => b[1] - a[1]).map(([x, n]) => `${reasonLabel(x)} ${n}`).join(", "), href: href("portals", r, everyone) });
  }
  for (const u of users.filter((x) => within(x.joined, 2 * DAY)))
    att.push({ tone: undefined, title: `New sign-up: ${whoText(u)}`, detail: `Joined ${ago(u.joined)} from ${u.source}. Furthest step: ${stageLabel(u.stage).toLowerCase()}.`, href: href("user", r, everyone, { id: u.id }) });
  const stalled = users.filter((u) => !u.submitted && !within(u.lastActive, 3 * DAY) && !within(u.joined, 2 * DAY)).sort((a, b) => (b.lastActive ?? b.joined).localeCompare(a.lastActive ?? a.joined));
  for (const u of stalled.slice(0, 5))
    att.push({ tone: "signal", title: `${whoText(u)} has gone quiet`, detail: `Last active ${ago(u.lastActive ?? u.joined)}, stopped at "${stageLabel(u.stage).toLowerCase()}"${u.waiting ? `, ${u.waiting} application${u.waiting === 1 ? "" : "s"} waiting on them` : ""}.`, href: href("user", r, everyone, { id: u.id }) });
  if (stalled.length > 5) att.push({ tone: "signal", title: `${stalled.length - 5} more users have gone quiet`, href: href("users", r, everyone) });

  return (
    <div className="space-y-4">
      <HealthStrip h={h} />
      <Kpis>
        <Stat label="New accounts" value={`${joined.length}`} sub={`${users.length} in all`} />
        <Stat label="Active" value={`${active.length}`} sub="signed in or did something" />
        <Stat label="Signed a packet" value={`${reachedIn("signed")}`} sub={`${reachedIn("shortlist")} built a shortlist`} />
        <Stat label="Submitted" value={`${submittedIn.length}`} sub={`application${submittedIn.length === 1 ? "" : "s"} for ${new Set(submittedIn.map((a) => a.userId)).size} user${new Set(submittedIn.map((a) => a.userId)).size === 1 ? "" : "s"}`} tone={submittedIn.length ? "go" : undefined} />
        <Stat label="Revenue" value={pays.length ? money(pays) : "0"} sub={`${new Set(pays.map((p) => p.userId)).size} paying user${new Set(pays.map((p) => p.userId)).size === 1 ? "" : "s"}`} />
        <Stat label="AI cost" value={$(spent)} sub={`${$(cost)} on ${everyone ? "these" : "real"} users`} />
      </Kpis>
      <p className="text-[12.5px] text-muted">
        Numbers above are for {r.label}.{" "}
        {!everyone && hidden ? (
          <>
            {hidden} team or test account{hidden === 1 ? "" : "s"} left out.{" "}
            <Link href={href("overview", r, true)} className={linkCls}>
              Include them
            </Link>
          </>
        ) : null}
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Panel title="Needs your attention" note="Live, whatever the period." scroll="md">
            {att.length ? (
              <ul className="divide-y divide-line">
                {att.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                    <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${dot(a.tone)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium">{a.href ? <Link href={a.href} className="decoration-current/30 underline-offset-4 hover:underline">{a.title}</Link> : a.title}</p>
                      {a.detail && <p className="mt-0.5 text-[12.5px] text-muted">{a.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-[13px] text-muted">Nothing right now.</p>
            )}
          </Panel>
          <Panel title="Activity" note={`What applicants and agents did in ${r.label}, newest first (latest 80).`} scroll="lg">
            <Activity rows={feed} apps={appMap} users={userMap} r={r} everyone={everyone} />
          </Panel>
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <Panel title="Sign-ups" note={r.label}>
            <Daily values={byDay(users.map((u) => u.joined))} label="Sign-ups" range={r} />
          </Panel>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Panel title="Where they got to" note={r.allTime ? "Each account's furthest step." : "Accounts that joined in this period."}>
              <Bars rows={byStage} total={cohort.length} />
            </Panel>
            <Panel title="Where they came from" note={r.allTime ? "First-touch source." : "Sign-ups in this period."} action={<Link href={href("growth", r, everyone)} className={`text-muted ${linkCls}`}>Conversion</Link>}>
              <Bars rows={[...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)} total={cohort.length} />
            </Panel>
          </div>
          <Panel title="Applications by status" note={`${apps.length} across ${new Set(apps.map((a) => a.userId)).size} users, as they stand now.`}>
            <Bars rows={statusRows} total={apps.length} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ---- users ----

export async function UsersView({ range: r, everyone, q }: { range: Range; everyone: boolean; q: string }) {
  const [d, runs] = await Promise.all([loadAdmin(), runsIn<{ user_id: string; cost_usd: number | null; started_at: string }>("user_id, cost_usd, started_at", r)]);
  const spend = new Map<string, number>();
  for (const x of runs) spend.set(x.user_id, (spend.get(x.user_id) ?? 0) + (Number(x.cost_usd) || 0));
  const { users, hidden } = scope(d, everyone);
  const needle = q.trim().toLowerCase();
  // in the period: joined or did something in it (all time: everyone)
  const shown = users
    .filter((u) => r.allTime || inRange(u.joined, r) || inRange(u.lastActive, r))
    .filter((u) => !needle || [u.email, u.name, u.location, u.citizenship].some((x) => (x ?? "").toLowerCase().includes(needle)))
    .sort((a, b) => b.joined.localeCompare(a.joined));
  const stageLabel = (key: string) => STAGES.find((s) => s.key === key)?.label ?? key;
  const dash = <span className="text-muted">·</span>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="get" action="/admin" className="flex items-center gap-2" role="search">
          <input type="hidden" name="view" value="users" />
          {r.key === "custom" ? (
            <>
              <input type="hidden" name="from" value={r.from.slice(0, 10)} />
              <input type="hidden" name="to" value={r.to.slice(0, 10)} />
            </>
          ) : r.key !== "30d" ? (
            <input type="hidden" name="range" value={r.key} />
          ) : null}
          {everyone && <input type="hidden" name="all" value="1" />}
          <label htmlFor="user-q" className="sr-only">
            Find a user
          </label>
          <input id="user-q" name="q" defaultValue={q} placeholder="Find by name, email or country" className="w-64 max-w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-[13.5px]" />
          <button className="tap rounded-lg border border-line px-3 py-1.5 text-[13px] hover:border-foreground/40">Find</button>
          {q && (
            <Link href={href("users", r, everyone)} className={`text-[13px] text-muted ${linkCls}`}>
              Clear
            </Link>
          )}
        </form>
        <ScopeNote hidden={hidden} everyone={everyone} r={r} view="users" />
      </div>
      <Panel
        title={`Users (${shown.length})`}
        note={`${r.allTime ? "Every account" : `Joined or active in ${r.label}`}, newest first. AI spend is for the same period. Mark your own and test accounts as team so the numbers show real applicants.`}
        scroll="xl"
      >
        <Table head={["User", "Counted as", "Joined", "Source", "Last active", "Furthest step", "Apps", "Submitted", "Stopped", "Documents", "Gmail", "AI spend"]} min="82rem">
          {shown.length ? (
            shown.map((u) => (
              <tr key={u.id}>
                <td className="max-w-[16rem] px-4 py-2.5">
                  <span className="block">
                    <UserLink u={u} r={r} everyone={everyone} />
                  </span>
                  <span className="block truncate text-[12px] text-muted">{[u.name ? u.email : "no name yet", u.plan !== "free" ? u.plan : null].filter(Boolean).join(", ")}</span>
                  {u.deactivated && <Pill tone="stop">Deactivated</Pill>}
                </td>
                <td className="px-4 py-2.5">
                  <TeamToggle userId={u.id} team={u.team} admin={u.admin} />
                </td>
                <td className="px-4 py-2.5 text-muted">{date(u.joined)}</td>
                <td className="px-4 py-2.5 text-muted">{u.source}</td>
                <td className="px-4 py-2.5 text-muted">{ago(u.lastActive)}</td>
                <td className="px-4 py-2.5">{stageLabel(u.stage)}</td>
                <td className={td}>{u.appCount || dash}</td>
                <td className={`${td} ${u.submitted ? "font-medium text-go" : ""}`}>{u.submitted || dash}</td>
                <td className={`${td} ${u.waiting ? "text-signal" : ""}`}>{u.waiting || dash}</td>
                <td className="px-4 py-2.5">
                  <DocKinds kinds={u.docKinds} />
                </td>
                <td className="px-4 py-2.5">{u.gmail?.status === "active" ? <Pill tone="go">Connected</Pill> : dash}</td>
                <td className={td}>
                  {$(spend.get(u.id) ?? 0)}
                  <Bar share={(spend.get(u.id) ?? 0) / Math.max(0.01, u.budget)} tone={(spend.get(u.id) ?? 0) > u.budget * 0.9 ? "stop" : undefined} />
                </td>
              </tr>
            ))
          ) : (
            <Empty cols={12}>{needle ? `No user matches "${q}" in ${r.label}.` : `Nobody joined or was active in ${r.label}.`}</Empty>
          )}
        </Table>
      </Panel>
    </div>
  );
}

// ---- one user ----

export async function UserView({ id, range: r, everyone }: { id: string; range: Range; everyone: boolean }) {
  const db = admin();
  const d = await loadAdmin();
  const u = d.users.find((x) => x.id === id);
  if (!u) return <p className="text-muted">No account with that id. It may have been deleted.</p>;
  const [runs, { data: events }, { data: errors }, { data: jobs }, { data: docs }] = await Promise.all([
    runsIn<{ agent: string; cost_usd: number | null; status: string; started_at: string }>("agent, cost_usd, status, started_at", r, id),
    db.from("events").select("user_id, actor, action, application_id, created_at").eq("user_id", id).not("action", "in", `(${NOISE.join(",")})`).gte("created_at", r.from).lte("created_at", r.to).order("created_at", { ascending: false }).limit(150),
    db.from("agent_runs").select("agent, error, started_at").eq("user_id", id).eq("status", "failed").not("error", "is", null).gte("started_at", r.from).lte("started_at", r.to).order("started_at", { ascending: false }).limit(200),
    db.from("jobs").select("agent, task, status, last_error, attempts, run_at, finished_at").eq("user_id", id).in("status", ["queued", "running", "failed"]).order("created_at", { ascending: false }).limit(50),
    db.from("documents").select("id, kind, filename, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(200),
  ]);
  const mine = d.apps.filter((a) => a.userId === id).sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
  const appMap = new Map(d.apps.map((a) => [a.id, a]));
  const spent = runs.reduce((s, x) => s + (Number(x.cost_usd) || 0), 0);
  const cats: Record<Category, number> = { research: 0, writing: 0, core: 0 };
  for (const x of runs) cats[categoryOf(x.agent)] += Number(x.cost_usd) || 0;
  const errGroups = groupErrors(errors ?? []);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link href={href("users", r, everyone)} className={`text-[13px] text-muted ${linkCls}`}>
          All users
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-[26px] leading-tight">{u.name || u.email}</h2>
          <TeamToggle userId={u.id} team={u.team} admin={u.admin} />
          {u.deactivated && <Pill tone="stop">Deactivated: can&apos;t sign in, agents stopped</Pill>}
        </div>
        <p className="text-[13px] text-muted">
          {u.name ? `${u.email}. ` : ""}
          {u.location ?? "Location unknown"}
          {u.citizenship && u.citizenship !== u.location?.split(", ").pop() ? ` (${u.citizenship} citizen)` : ""}. Joined {stamp(u.joined)} from {u.source}
          {u.invited ? " (invited)" : ""}. Plan: {u.plan}. Last signed in {ago(u.lastSignIn)}, last active {ago(u.lastActive)}.
        </p>
        {!u.admin && <AccountActions userId={u.id} email={u.email} deactivated={u.deactivated} usersHref={href("users", r, everyone)} />}
      </div>

      <Kpis>
        <Stat label="Applications" value={`${u.appCount}`} sub={`${u.submitted} submitted`} tone={u.submitted ? "go" : undefined} />
        <Stat label="Stopped" value={`${u.waiting}`} sub="waiting on them or failed" tone={u.waiting ? "signal" : undefined} />
        <Stat label="Documents" value={`${u.docs}`} sub={Object.keys(u.docKinds).map((kk) => DOC_SHORT[kk] ?? docLabel(kk)).join(", ") || "none uploaded"} />
        <Stat label="Gmail" value={u.gmail?.status === "active" ? "On" : "Off"} sub={u.gmail ? `${u.gmail.email}${u.gmail.status !== "active" ? `, ${u.gmail.status}` : ""}` : "not connected"} />
        <Stat label={`AI, ${r.label}`} value={$(spent)} sub={`Research ${$(cats.research)}, writing ${$(cats.writing)}, core ${$(cats.core)}. Monthly budget ${$(u.budget)}`} tone={spent > u.budget * 0.9 ? "stop" : undefined} />
        <Stat label="Paid, all time" value={u.payments.length ? money(u.payments) : "0"} sub={`${u.payments.length} payment${u.payments.length === 1 ? "" : "s"}`} />
      </Kpis>

      <Panel title={`Applications (${mine.length})`} note="Most recently worked on first." scroll="md">
        <Table head={["School", "Status", "Agents", "What they said", "Portal", "Updated"]} min="58rem">
          {mine.length ? (
            mine.map((a) => (
              <tr key={a.id}>
                <td className="max-w-[16rem] px-4 py-2.5">
                  <span className="block truncate">{a.school}</span>
                  {a.program && <span className="block truncate text-[12px] text-muted">{a.program}</span>}
                </td>
                <td className="px-4 py-2.5">{STATUS_LABEL[a.status] ?? a.status}</td>
                <td className="px-4 py-2.5">
                  <Pill tone={runnerTone(a.runner)}>{RUNNER_LABEL[a.runner] ?? a.runner}</Pill>
                  {a.reason && a.reason !== "failed" && <span className="mt-1 block text-[12px] text-muted">{reasonLabel(a.reason)}</span>}
                </td>
                <td className="max-w-[22rem] px-4 py-2.5 text-[12.5px] text-muted">
                  <span className="line-clamp-2">{a.note || "·"}</span>
                </td>
                <td className="max-w-[10rem] truncate px-4 py-2.5 font-mono text-[12px] text-muted">{a.host ?? "·"}</td>
                <td className="px-4 py-2.5 text-muted">{ago(a.updated)}</td>
              </tr>
            ))
          ) : (
            <Empty cols={6}>No applications yet.</Empty>
          )}
        </Table>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="History" note={`What happened on this account in ${r.label} (latest 150).`} scroll="lg">
          <Activity rows={(events ?? []) as Ev[]} apps={appMap} users={new Map([[u.id, u]])} r={r} everyone={everyone} showUser={false} />
        </Panel>
        <div className="grid content-start gap-4">
          <Suspense fallback={<Panel title="Payment attempts" note="Asking Bachs…"><p className="px-4 py-3 text-[13px] text-muted">Loading…</p></Panel>}>
            <PaymentAttempts userId={u.id} />
          </Suspense>
          <Panel title={`Documents (${(docs ?? []).length})`} note="What they uploaded, newest first, and whether the agents have read it." scroll="sm">
            <Table head={["Type", "File", "Read", "Uploaded"]} min="30rem">
              {(docs ?? []).length ? (
                (docs ?? []).map((dd) => (
                  <tr key={dd.id}>
                    <td className="whitespace-nowrap px-4 py-2">{docLabel(dd.kind)}</td>
                    <td className="max-w-[14rem] truncate px-4 py-2 text-muted" title={dd.filename}>
                      {dd.filename}
                    </td>
                    <td className="px-4 py-2">
                      <Pill tone={dd.status === "extracted" ? "go" : dd.status === "failed" ? "stop" : undefined}>{dd.status === "extracted" ? "Read" : dd.status === "failed" ? "Couldn't read" : dd.status === "extracting" ? "Reading" : "Waiting"}</Pill>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted">{date(dd.created_at)}</td>
                  </tr>
                ))
              ) : (
                <Empty cols={4}>No documents uploaded.</Empty>
              )}
            </Table>
          </Panel>
          <Panel title="Journey" note="When this account first reached each step.">
            <Table head={["Step", "When", "After sign-up"]} min="26rem">
              {MILESTONES.map((m) => {
                const at = u.journey.at[m.key];
                return (
                  <tr key={m.key}>
                    <td className="px-4 py-2">{m.label}</td>
                    <td className="px-4 py-2 text-muted">{at ? stamp(at) : "not yet"}</td>
                    <td className="px-4 py-2 tabular-nums">{at ? duration(Date.parse(at) - Date.parse(u.joined)) : <span className="text-muted">·</span>}</td>
                  </tr>
                );
              })}
            </Table>
          </Panel>
          {(jobs ?? []).length > 0 && (
            <Panel title="Open and failed jobs" note="As they stand now." scroll="sm">
              <ul className="divide-y divide-line">
                {(jobs ?? []).map((j, i) => (
                  <li key={i} className="px-4 py-2 text-[13px]">
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
                ))}
              </ul>
            </Panel>
          )}
          {errGroups.length > 0 && (
            <Panel title="AI calls that failed" note={`In ${r.label}, grouped by cause.`} scroll="sm">
              <ErrorList groups={errGroups} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- submissions ----

export async function SubmissionsView({ range: r, everyone }: { range: Range; everyone: boolean }) {
  const d = await loadAdmin();
  const { users, apps, hidden } = scope(d, everyone);
  // the funnel follows the people who signed up in the period; the list, the applications submitted in it
  const cohort = (r.allTime ? users : users.filter((u) => inRange(u.joined, r))).map((u) => u.journey).sort((a, b) => b.signedUp.localeCompare(a.signedUp));
  const funnel = summarize(cohort);
  const done = apps.filter((a) => SUBMITTED.has(a.status) && (r.allTime || inRange(a.submittedAt, r))).sort((a, b) => (b.submittedAt ?? b.updated ?? "").localeCompare(a.submittedAt ?? a.updated ?? ""));
  const userMap = new Map(d.users.map((u) => [u.id, u]));
  return (
    <div className="space-y-4">
      <ScopeNote hidden={hidden} everyone={everyone} r={r} view="submissions" />
      <Kpis>
        <Stat label="Submitted in period" value={`${done.length}`} sub={`for ${new Set(done.map((a) => a.userId)).size} user${new Set(done.map((a) => a.userId)).size === 1 ? "" : "s"}`} tone={done.length ? "go" : undefined} />
        <Stat label="Sign-ups who submitted" value={`${funnel.submitted} of ${funnel.users}`} sub={r.allTime ? "all accounts" : `who joined in ${r.label}`} />
        <Stat label="Median time to submit" value={duration(funnel.medianToSubmitMs)} sub="from sign-up" />
        <Stat label="Within 24 hours" value={`${funnel.within24h}`} />
        <Stat label="Within 7 days" value={`${funnel.within7d}`} />
      </Kpis>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Submitted applications (${done.length})`} note={`Submitted in ${r.label}, newest first.`} scroll="md">
          <Table head={["School", "User", "Status", "Submitted"]} min="36rem">
            {done.length ? (
              done.map((a) => (
                <tr key={a.id}>
                  <td className="max-w-[16rem] px-4 py-2.5">
                    <span className="block truncate">{a.school}</span>
                    {a.program && <span className="block truncate text-[12px] text-muted">{a.program}</span>}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-2.5 text-muted">{userMap.get(a.userId) ? <UserLink u={userMap.get(a.userId)!} r={r} everyone={everyone} /> : a.email}</td>
                  <td className="px-4 py-2.5">{STATUS_LABEL[a.status] ?? a.status}</td>
                  <td className="px-4 py-2.5 text-muted">{a.submittedAt ? stamp(a.submittedAt) : "date not recorded"}</td>
                </tr>
              ))
            ) : (
              <Empty cols={4}>No submissions in {r.label}.</Empty>
            )}
          </Table>
        </Panel>
        <Panel title="Where people stop" note={`Of the ${funnel.users} who ${r.allTime ? "signed up" : `joined in ${r.label}`}: how many reached each step, and how long it took (medians).`} scroll="md">
          <Table head={["Step", "Reached it", "From sign-up", "From the step before"]} min="34rem">
            {funnel.steps.map((x) => (
              <tr key={x.key}>
                <td className="px-4 py-2.5">{x.label}</td>
                <td className={td}>
                  {x.users} <span className="text-muted">({pct(x.users, funnel.users)})</span>
                  <Bar share={funnel.users ? x.users / funnel.users : 0} />
                </td>
                <td className={td}>{duration(x.medianFromSignupMs)}</td>
                <td className={td}>{duration(x.medianFromPreviousMs)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
      <Panel title={`Each user (${cohort.length})`} note="Time from sign-up to each step." scroll="lg">
        <Table head={["User", "Signed up", ...MILESTONES.map((m) => m.label)]} min="64rem">
          {cohort.length ? (
            cohort.map((j) => (
              <tr key={j.userId}>
                <td className="max-w-[14rem] truncate px-4 py-2.5">
                  <UserLink u={userMap.get(j.userId) ?? { id: j.userId, email: j.email }} r={r} everyone={everyone} />
                </td>
                <td className={td}>{date(j.signedUp)}</td>
                {MILESTONES.map((m) => (
                  <td key={m.key} className={`${td} ${m.key === "submitted" && j.at.submitted ? "font-medium text-go" : ""}`}>
                    {j.at[m.key] ? duration(Date.parse(j.at[m.key]!) - Date.parse(j.signedUp)) : <span className="text-muted">·</span>}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <Empty cols={2 + MILESTONES.length}>Nobody signed up in {r.label}.</Empty>
          )}
        </Table>
      </Panel>
    </div>
  );
}

// ---- portals ----

export async function PortalsView({ range: r, everyone }: { range: Range; everyone: boolean }) {
  const d = await loadAdmin();
  const { apps, hidden } = scope(d, everyone);
  // applications the agents worked on in the period (their last run fell in it)
  const worked = apps.filter((a) => (a.runner !== "idle" || SUBMITTED.has(a.status)) && (r.allTime || inRange(a.updated ?? a.submittedAt, r)));
  const bySchool = new Map<string, { school: string; host: string | null; total: number; submitted: number; stopped: number; running: number; reasons: Map<string, number>; last: string | null }>();
  for (const a of worked) {
    const row = bySchool.get(a.school) ?? { school: a.school, host: a.host, total: 0, submitted: 0, stopped: 0, running: 0, reasons: new Map(), last: null };
    row.total++;
    if (SUBMITTED.has(a.status) || a.runner === "submitted") row.submitted++;
    else if (a.runner === "needs_you" || a.runner === "failed") {
      row.stopped++;
      const why = a.reason ?? "other";
      row.reasons.set(why, (row.reasons.get(why) ?? 0) + 1);
    } else if (a.runner === "running" || a.runner === "ready") row.running++;
    row.host ??= a.host;
    if (a.updated && (!row.last || a.updated > row.last)) row.last = a.updated;
    bySchool.set(a.school, row);
  }
  const rows = [...bySchool.values()].sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  const totals = rows.reduce((s, x) => ({ total: s.total + x.total, submitted: s.submitted + x.submitted, stopped: s.stopped + x.stopped, running: s.running + x.running }), { total: 0, submitted: 0, stopped: 0, running: 0 });
  const ids = [...worked].sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? "")).map((a) => a.id).slice(0, 150);
  const { data } = ids.length
    ? await admin().from("applications").select("id, user_id, runner_status, runner_note, portal_url, runner_state, runner_updated_at, programs(schools(name))").in("id", ids).order("runner_updated_at", { ascending: false })
    : { data: [] };
  const email = new Map(d.users.map((u) => [u.id, u as Who]));
  return (
    <div className="space-y-4">
      <ScopeNote hidden={hidden} everyone={everyone} r={r} view="portals" />
      <Kpis>
        <Stat label="Worked on" value={`${totals.total}`} sub={`at ${rows.length} school${rows.length === 1 ? "" : "s"} in ${r.label}`} />
        <Stat label="Submitted" value={`${totals.submitted}`} sub={`${pct(totals.submitted, totals.total)} of them`} tone={totals.submitted ? "go" : undefined} />
        <Stat label="Stopped" value={`${totals.stopped}`} sub="waiting on the applicant or failed" tone={totals.stopped ? "signal" : undefined} />
        <Stat label="In progress" value={`${totals.running}`} sub="running or queued" />
      </Kpis>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel title={`By school (${rows.length})`} note="Most recently worked on first." scroll="xl">
          <Table head={["School", "Apps", "Submitted", "Stopped", "Running", "Why they stopped", "Last run"]} min="46rem">
            {rows.length ? (
              rows.map((x) => (
                <tr key={x.school}>
                  <td className="max-w-[15rem] px-4 py-2.5">
                    <span className="block truncate">{x.school}</span>
                    <span className="block truncate font-mono text-[11.5px] text-muted">{x.host ?? "·"}</span>
                  </td>
                  <td className={td}>{x.total}</td>
                  <td className={`${td} ${x.submitted ? "font-medium text-go" : ""}`}>{x.submitted}</td>
                  <td className={`${td} ${x.stopped ? "text-signal" : ""}`}>{x.stopped}</td>
                  <td className={td}>{x.running}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted">{[...x.reasons.entries()].map(([why, n]) => `${reasonLabel(why)}${n > 1 ? ` ×${n}` : ""}`).join(", ") || "·"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{ago(x.last)}</td>
                </tr>
              ))
            ) : (
              <Empty cols={7}>The agents didn&apos;t work on any portal in {r.label}.</Empty>
            )}
          </Table>
        </Panel>
        <Panel title="Each run" note="Newest first, latest 150. Open one for what the page said, the last steps and the raw page details." scroll="xl">
          <div className="p-3">
            <RunList rows={(data ?? []) as Record<string, unknown>[]} email={email} r={r} everyone={everyone} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---- costs ----

export async function CostsView({ range: r, everyone }: { range: Range; everyone: boolean }) {
  type Run = { user_id: string; agent: string; model: string; cost_usd: number | null; input_tokens: number | null; output_tokens: number | null; started_at: string };
  const [d, all] = await Promise.all([loadAdmin(), runsIn<Run>("user_id, agent, model, cost_usd, input_tokens, output_tokens, started_at", r)]);
  const { ids } = scope(d, everyone);
  // a call the api turned away (no credit, overloaded) never reached the model and cost nothing: count it apart
  const billedRun = (x: Run) => x.cost_usd != null || (x.input_tokens ?? 0) > 0;
  const runs = all.filter(billedRun);
  const refused = all.length - runs.length;
  const perDay = new Map<string, number>();
  for (const x of runs) perDay.set(x.started_at.slice(0, 10), (perDay.get(x.started_at.slice(0, 10)) ?? 0) + (Number(x.cost_usd) || 0));

  type Row = { cost: number; cat: Record<Category, number>; calls: number };
  const perUser = new Map<string, Row>();
  const perAgent = new Map<string, { cost: number; calls: number; inTok: number; outTok: number }>();
  for (const x of runs) {
    const c = Number(x.cost_usd) || 0;
    const u = perUser.get(x.user_id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 };
    u.cost += c;
    u.cat[categoryOf(x.agent)] += c;
    u.calls++;
    perUser.set(x.user_id, u);
    const key = `${x.agent}|${x.model}`;
    const a = perAgent.get(key) ?? { cost: 0, calls: 0, inTok: 0, outTok: 0 };
    a.cost += c;
    a.calls++;
    a.inTok += x.input_tokens ?? 0;
    a.outTok += x.output_tokens ?? 0;
    perAgent.set(key, a);
  }
  const total = [...perUser.values()].reduce((s, u) => s + u.cost, 0);
  const real = [...perUser.entries()].filter(([id]) => !d.team.has(id)).reduce((s, [, u]) => s + u.cost, 0);
  const realUsers = d.users.filter((u) => !u.team).length;
  const agents = [...perAgent.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const top = agents[0]?.[1].cost || 1;
  const days = r.allTime ? Math.max(1, perDay.size) : r.days;
  const shown = d.users.filter((u) => ids.has(u.id) || perUser.has(u.id)).filter((u) => everyone || !u.team || (perUser.get(u.id)?.cost ?? 0) > 0).filter((u) => perUser.has(u.id));

  return (
    <div className="space-y-4">
      <Kpis>
        <Stat label="AI cost" value={$(total)} sub={`${r.label}. Real users ${$(real)}, team and test ${$(total - real)}`} />
        <Stat label="Per day" value={$(total / days)} sub={r.allTime ? "over the days with spend" : `over ${days} day${days === 1 ? "" : "s"}`} />
        <Stat label="Per real user" value={$(real / Math.max(1, realUsers))} sub={`${realUsers} real account${realUsers === 1 ? "" : "s"}`} />
        <Stat label="Billed calls" value={k(runs.length)} sub={`${$(total / Math.max(1, runs.length))} each${refused ? `. ${k(refused)} turned away, not billed` : ""}`} />
        <Stat label="Most expensive agent" value={agents[0]?.[0].split("|")[0] ?? "none"} sub={agents[0] ? `${$(agents[0][1].cost)}, ${pct(agents[0][1].cost, total)} of spend` : undefined} />
      </Kpis>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Spend per day" note={`Billed calls, every account, ${r.label}.`}>
          <Daily values={perDay} label="AI spend" range={r} fmt={$} />
        </Panel>
        <Panel title="By agent and model" note="Every account." scroll="sm">
          <Table head={["Agent", "Model", "Calls", "Tokens in / out", "Cost", "Per call"]} min="40rem">
            {agents.length ? (
              agents.map(([key, a]) => {
                const [agent, model] = key.split("|");
                return (
                  <tr key={key}>
                    <td className="px-4 py-2.5 font-medium">{agent}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-muted">{model}</td>
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
              <Empty cols={6}>No billed calls in {r.label}.</Empty>
            )}
          </Table>
        </Panel>
      </div>
      <Panel title={`By user (${shown.length})`} note="Spend in the period. The budget is monthly (plan, paid submissions and any override)." scroll="lg">
        <Table head={["User", "Plan", "Spent", "Research", "Writing", "Core", "Calls"]} min="50rem">
          {shown.length ? (
            shown
              .map((u) => ({ u, row: perUser.get(u.id)! }))
              .sort((a, b) => b.row.cost - a.row.cost)
              .map(({ u, row }) => {
                const share = u.budget ? row.cost / u.budget : 0;
                return (
                  <tr key={u.id}>
                    <td className="max-w-[14rem] truncate px-4 py-2.5">
                      <UserLink u={u} r={r} everyone={everyone} />
                      {u.team && <span className="ml-2 text-[12px] text-muted">team</span>}
                    </td>
                    <td className="px-4 py-2.5 capitalize">{u.admin ? "staff" : u.plan}</td>
                    <td className={td}>
                      <span className={share > 0.9 ? "font-medium text-stop" : ""}>
                        {$(row.cost)} <span className="text-muted">of {$(u.budget)}/mo</span>
                      </span>
                      <Bar share={share} tone={share > 0.9 ? "stop" : undefined} />
                    </td>
                    {(["research", "writing", "core"] as const).map((c) => (
                      <td key={c} className={td}>
                        {$(row.cat[c])} <span className="text-muted">of {$(u.budget * CATEGORY_SHARE[c])}</span>
                      </td>
                    ))}
                    <td className={td}>{k(row.calls)}</td>
                  </tr>
                );
              })
          ) : (
            <Empty cols={7}>No spend in {r.label}.</Empty>
          )}
        </Table>
      </Panel>
    </div>
  );
}

// ---- growth ----

export async function GrowthView({ range: r, everyone }: { range: Range; everyone: boolean }) {
  const db = admin();
  const [d, alerts, { data: ambassadors }] = await Promise.all([
    loadAdmin(),
    db.from("alert_subscribers").select("id", { count: "exact", head: true }).not("confirmed_at", "is", null).is("unsubscribed_at", null),
    db.from("ambassador_applications").select("name, email, country, institution, audience, channels, created_at").gte("created_at", r.from).lte("created_at", r.to).order("created_at", { ascending: false }).limit(100),
  ]);
  const { users, hidden } = scope(d, everyone);
  const cohort = r.allTime ? users : users.filter((u) => inRange(u.joined, r));
  const paying = cohort.filter((u) => u.payments.length).length;
  // how each source converts, step by step, for the people who joined in the period
  const bySource = new Map<string, AdminUser[]>();
  for (const u of cohort) bySource.set(u.source, [...(bySource.get(u.source) ?? []), u]);
  const steps = ["profile", "shortlist", "signed", "submitted"] as const;
  const rows = [...bySource.entries()].sort((a, b) => b[1].length - a[1].length);
  return (
    <div className="space-y-4">
      <ScopeNote hidden={hidden} everyone={everyone} r={r} view="growth" />
      <Kpis>
        <Stat label="Sign-ups" value={`${cohort.length}`} sub={`${users.length} accounts in all`} />
        <Stat label="By invite" value={`${cohort.filter((u) => u.invited).length}`} />
        <Stat label="Have an application" value={`${cohort.filter((u) => u.appCount).length}`} sub={`${pct(cohort.filter((u) => u.appCount).length, cohort.length)} of sign-ups`} />
        <Stat label="Submitted" value={`${cohort.filter((u) => u.submitted).length}`} sub={`${pct(cohort.filter((u) => u.submitted).length, cohort.length)} of sign-ups`} />
        <Stat label="Paying" value={`${paying}`} />
        <Stat label="Deadline alerts" value={alerts.error ? "n/a" : `${alerts.count ?? 0}`} sub="confirmed subscribers, now" />
      </Kpis>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Panel title="Sign-ups" note={r.label}>
            <Daily values={byDay(users.map((u) => u.joined))} label="Sign-ups" range={r} />
          </Panel>
          <Panel title="How each source converts" note={`Accounts that joined in ${r.label}, by first-touch source, and how many reached each step.`} scroll="md">
            <Table head={["Source", "Sign-ups", "Profile", "Shortlist", "Signed", "Submitted", "Paying"]} min="42rem">
              {rows.length ? (
                rows.map(([src, us]) => (
                  <tr key={src}>
                    <td className="px-4 py-2.5">{src}</td>
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
                <Empty cols={7}>No sign-ups in {r.label}.</Empty>
              )}
            </Table>
          </Panel>
        </div>
        <Panel title={`Ambassador applications (${(ambassadors ?? []).length})`} note={`Received in ${r.label}, newest first.`} scroll="xl">
          <ul className="divide-y divide-line text-[13.5px]">
            {(ambassadors ?? []).length ? (
              (ambassadors ?? []).map((a) => (
                <li key={a.email + a.created_at} className="px-4 py-2.5">
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
              <li className="px-4 py-3 text-muted">None in this period.</li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

// ---- learning ----

export async function LearningView() {
  // the rules' score is computed here and now; the models' scores are the last runs kept in events
  const sheet = sampleSheet();
  const rules = QUESTIONS.map((q) => scoreRules(q, sheet));
  const { data: runs } = await admin().from("events").select("context, created_at").eq("action", "eval.model").order("created_at", { ascending: false }).limit(10);
  type R = { tier: string; total: number; correct: number; wrong: number; asked_ok: number; filled_should_ask: number; left: number; detail: { id: string; stage: string; got?: string; ok: boolean }[] };
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <Panel title="Evals" note="Questions real portals asked, answered for a made-up applicant. The rules run in every test; the model runs are kept here." scroll="xl">
        <div className="space-y-3 border-b border-line px-4 py-3 text-[13.5px]">
          <p>
            Rules: <b>{rules.filter((x) => PASS.includes(x.verdict)).length}</b> of {QUESTIONS.length} handled, {rules.filter((x) => x.verdict === "unresolved").length} left for the model,{" "}
            <b className={rules.some((x) => ["wrong", "filled_should_ask", "shown_should_hide"].includes(x.verdict)) ? "text-stop" : ""}>{rules.filter((x) => ["wrong", "filled_should_ask", "shown_should_hide"].includes(x.verdict)).length} harmful</b>.
          </p>
          <RunEval />
        </div>
        <ul className="divide-y divide-line">
          {(runs ?? []).map((e) => {
            const x = e.context as R;
            return (
              <li key={e.created_at} className="px-4 py-2.5 text-[12.5px]">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={x.wrong || x.filled_should_ask ? "stop" : "go"}>{x.tier === "expert" ? "Opus" : "Sonnet"}</Pill>
                  <span>
                    {x.correct} right · {x.wrong} wrong · {x.filled_should_ask} filled that should be asked · {x.left} left to the applicant · {x.asked_ok} rightly asked (of {x.total})
                  </span>
                  <span className="text-muted">{ago(e.created_at)}</span>
                </div>
                {x.detail.some((dd) => !dd.ok) && (
                  <p className="mt-1 text-muted">
                    Missed: {x.detail.filter((dd) => !dd.ok).map((dd) => `${dd.id}${dd.got ? ` (${dd.got})` : ""}`).join(", ")}
                  </p>
                )}
              </li>
            );
          })}
          {!runs?.length && <li className="px-4 py-3 text-[13px] text-muted">No model runs yet.</li>}
        </ul>
      </Panel>
      <Panel title="Lessons" note="What the agents learned from stuck runs and edits. Portal notes apply at once; general lessons wait for your approval." scroll="xl">
        <div className="p-4">
          <LessonsAdmin {...await lessonData()} />
        </div>
      </Panel>
    </div>
  );
}

// ---- system ----

export async function SystemView({ range: r }: { range: Range }) {
  const db = admin();
  const [h, failedRuns, open, failedJobs] = await Promise.all([
    health(),
    every<{ agent: string; error: string | null; started_at: string }>((a, b) => db.from("agent_runs").select("agent, error, started_at").eq("status", "failed").gte("started_at", r.from).lte("started_at", r.to).order("started_at", { ascending: false }).range(a, b), 20_000),
    every<{ agent: string; task: string; status: string; run_at: string }>((a, b) => db.from("jobs").select("agent, task, status, run_at").in("status", ["queued", "running"]).order("id").range(a, b)),
    every<{ agent: string; task: string; last_error: string | null; finished_at: string }>((a, b) => db.from("jobs").select("agent, task, last_error, finished_at").eq("status", "failed").gte("finished_at", r.from).lte("finished_at", r.to).order("finished_at", { ascending: false }).range(a, b), 5_000),
  ]);
  const byJob = new Map<string, { queued: number; due: number; running: number; oldest: string | null }>();
  const now = new Date().toISOString();
  for (const j of open) {
    const key = `${j.agent}.${j.task}`;
    const row = byJob.get(key) ?? { queued: 0, due: 0, running: 0, oldest: null };
    if (j.status === "running") row.running++;
    else {
      row.queued++;
      if (j.run_at <= now) {
        row.due++;
        if (!row.oldest || j.run_at < row.oldest) row.oldest = j.run_at;
      }
    }
    byJob.set(key, row);
  }
  const jobErrors = groupErrors(failedJobs.map((j) => ({ agent: `${j.agent}.${j.task}`, error: j.last_error, started_at: j.finished_at })));
  return (
    <div className="space-y-4">
      <HealthStrip h={h} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Job queue" note="Waiting or running now. Due means its start time has passed." scroll="lg">
          <Table head={["Job", "Waiting", "Due", "Oldest due", "Running"]} min="30rem">
            {byJob.size ? (
              [...byJob.entries()]
                .sort((a, b) => b[1].due - a[1].due || b[1].queued - a[1].queued)
                .map(([key, row]) => (
                  <tr key={key}>
                    <td className="px-4 py-2.5 font-mono text-[12px]">{key}</td>
                    <td className={td}>{row.queued}</td>
                    <td className={`${td} ${row.due ? "text-signal" : ""}`}>{row.due}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{row.oldest ? ago(row.oldest) : "·"}</td>
                    <td className={td}>{row.running}</td>
                  </tr>
                ))
            ) : (
              <Empty cols={5}>The queue is empty.</Empty>
            )}
          </Table>
        </Panel>
        <Panel title={`Failed jobs (${failedJobs.length})`} note={`In ${r.label}, grouped by cause.`} scroll="lg">
          <ErrorList groups={jobErrors} />
        </Panel>
        <Panel title={`Failed AI calls (${k(failedRuns.length)})`} note={`In ${r.label}, grouped by cause.`} scroll="lg">
          <ErrorList groups={groupErrors(failedRuns)} />
        </Panel>
      </div>
    </div>
  );
}


function RunList({ rows, email, r, everyone }: { rows: Record<string, unknown>[]; email: Map<string, Who>; r: Range; everyone: boolean }) {
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="px-1 text-[13px] text-muted">No runs in this period.</p>}
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
                <span className="block truncate text-[12px] text-muted">{email.get(uid) ? whoText(email.get(uid)!) : "deleted account"}</span>
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
                  <dd className="inline">{email.get(uid) ? <UserLink u={email.get(uid)!} r={r} everyone={everyone} /> : "deleted account"}</dd>
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

// ---- errors ----

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

// ---- credit: who gets AI first, and the asks to pay ----

const TIER_LABEL: Record<Tier, string> = { paid: "Paying", staff: "Staff and team", engaged: "Engaged (docs, Gmail or signed)", starter: "Starters" };

function tierOfUser(u: AdminUser): Tier {
  const signed = Object.entries(u.apps).some(([s, n]) => n > 0 && (s === "packet_approved" || SUBMITTED.has(s)));
  return tierOf({ staff: u.admin || u.team, paid: u.payments.length > 0 || u.plan === "pro", documents: u.docs, gmail: !!u.gmail, signed });
}

export async function CreditView({ range: r, everyone }: { range: Range; everyone: boolean }) {
  const db = admin();
  const [d, policy, today, spendIn, waiting, nudgeEvents] = await Promise.all([
    loadAdmin(),
    creditPolicy(true),
    runsSince<{ user_id: string; cost_usd: number | null }>("user_id, cost_usd", dayStartUTC()),
    runsIn<{ user_id: string; cost_usd: number | null; started_at: string }>("user_id, cost_usd, started_at", r),
    every<{ user_id: string; last_error: string | null }>((a, b) => db.from("jobs").select("user_id, last_error").eq("status", "queued").or('last_error.like."budget: starter%",last_error.like."hold:%"').range(a, b)),
    every<{ user_id: string; action: string; context: { angle?: string } | null; created_at: string }>((a, b) =>
      db.from("events").select("user_id, action, context, created_at").in("action", ["nudge.clicked", "nudge.emailed"]).gte("created_at", r.from).lte("created_at", r.to).range(a, b),
    ),
  ]);
  const { users } = scope(d, true);
  const tierBy = new Map(users.map((u) => [u.id, tierOfUser(u)]));
  const spentToday = today.reduce((a, x) => a + (Number(x.cost_usd) || 0), 0);
  const limit = policy.dailyLimitUsd;
  const state = !limit ? "No daily limit" : spentToday >= limit * policy.runawayMultiple ? "Only paying and staff run" : spentToday >= limit ? "Limit reached" : spentToday >= limit * policy.starterShareOfDay ? "Starters waiting" : "Everyone runs";
  const tone: Tone = !limit ? undefined : spentToday >= limit ? "stop" : spentToday >= limit * policy.starterShareOfDay ? "signal" : "go";

  const shown = (id: string) => everyone || !d.team.has(id);
  const tiers: Tier[] = ["paid", "engaged", "starter", "staff"];
  const rows = tiers.map((t) => {
    const ids = users.filter((u) => tierBy.get(u.id) === t && shown(u.id)).map((u) => u.id);
    const set = new Set(ids);
    const sum = (xs: { user_id: string; cost_usd: number | null }[]) => xs.filter((x) => set.has(x.user_id)).reduce((a, x) => a + (Number(x.cost_usd) || 0), 0);
    return { t, n: ids.length, range: sum(spendIn), today: sum(today) };
  });
  const totalRange = rows.reduce((a, x) => a + x.range, 0);

  const starterWait = waiting.filter((j) => j.last_error?.startsWith("budget: starter")).length;
  const busy = waiting.filter((j) => j.last_error?.startsWith("hold: busy")).length;
  const away = waiting.filter((j) => j.last_error?.startsWith("hold: paused")).length;
  const engagedUnpaid = rows.find((x) => x.t === "engaged")?.n ?? 0;

  const byAngle = new Map<string, { emailed: number; clicked: number }>();
  for (const e of nudgeEvents) {
    if (!shown(e.user_id)) continue;
    const a = e.context?.angle ?? "?";
    const v = byAngle.get(a) ?? { emailed: 0, clicked: 0 };
    if (e.action === "nudge.emailed") v.emailed++;
    else v.clicked++;
    byAngle.set(a, v);
  }
  const clickers = new Set(nudgeEvents.filter((e) => e.action === "nudge.clicked").map((e) => e.user_id));
  const paidAfter = users.filter((u) => clickers.has(u.id) && u.payments.some((p) => inRange(p.at, r))).length;

  return (
    <div className="space-y-4">
      <Kpis>
        <Stat label="AI spend today (UTC)" value={$(spentToday)} sub={limit ? `of ${$(limit)} · ${state}` : state} tone={tone} />
        <Stat label="Starter work waiting" value={String(starterWait)} sub="until they upload or connect Gmail" />
        <Stat label="Held until tomorrow" value={String(busy)} sub="busy day" />
        <Stat label="Paused, applicant away" value={String(away)} sub={policy.inactiveDays ? `no visit in ${policy.inactiveDays} days` : "switched off"} />
        <Stat label="Engaged, not paying" value={String(engagedUnpaid)} sub="who the asks to pay go to" />
        <Stat label="Paid after an ask" value={String(paidAfter)} sub={`tapped one, then paid · ${r.label}`} tone={paidAfter ? "go" : undefined} />
      </Kpis>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Accounts and AI spend by tier" note={`${r.label}; today is UTC. ${everyone ? "Every account." : "Team accounts left out except under Staff."}`}>
          <Table head={["Tier", "Accounts", "Spend in period", "Share", "Today"]} min="30rem">
            {rows.map((x) => (
              <tr key={x.t}>
                <td className="px-4 py-3">{TIER_LABEL[x.t]}</td>
                <td className={td}>{x.n}</td>
                <td className={td}>{$(x.range)}</td>
                <td className={td}>
                  {pct(x.range, totalRange)}
                  <Bar share={totalRange ? x.range / totalRange : 0} />
                </td>
                <td className={td}>{$(x.today)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Asks to pay" note={`Emails sent and taps on the dashboard card, by angle · ${r.label}`}>
          <Table head={["Angle", "Emails", "Taps"]} min="20rem">
            {byAngle.size ? (
              [...byAngle.entries()]
                .sort((a, b) => b[1].clicked - a[1].clicked || b[1].emailed - a[1].emailed)
                .map(([a, v]) => (
                  <tr key={a}>
                    <td className="px-4 py-3">{a}</td>
                    <td className={td}>{v.emailed}</td>
                    <td className={td}>{v.clicked}</td>
                  </tr>
                ))
            ) : (
              <Empty cols={3}>No asks sent or tapped in this period yet.</Empty>
            )}
          </Table>
        </Panel>
      </div>

      <CreditEditor initial={policy} defaults={DEFAULT_POLICY} />
    </div>
  );
}

// checkouts that never completed, as Bachs sees them: opened and left, declined (and why), or still open
async function PaymentAttempts({ userId }: { userId: string }) {
  const { mode, attempts } = await paymentAttempts(userId).catch((e: Error) => ({ mode: "off" as const, attempts: [], error: e.message }));
  return (
    <Panel title={`Payment attempts (${attempts.length})`} note={mode === "off" ? "Payments aren't switched on." : `Checkouts that didn't complete, from Bachs (${mode === "live" ? "live" : "SANDBOX: test payments only, real cards can't pay"}).`} scroll="sm">
      <Table head={["Started", "What", "Bachs status", "Payment", "Amount", "Why"]} min="40rem">
        {attempts.length ? (
          attempts.map((a) => (
            <tr key={a.ref}>
              <td className="px-4 py-3 text-muted">{a.at ? stamp(a.at) : "?"}</td>
              <td className={td}>{a.kind}</td>
              <td className={td}>{a.status}</td>
              <td className={td}>{a.payment}</td>
              <td className={td}>{a.amount}</td>
              <td className="px-4 py-3 text-[12.5px] text-muted">{a.detail.join(" · ") || "no reason given"}</td>
            </tr>
          ))
        ) : (
          <Empty cols={6}>No unfinished checkouts.</Empty>
        )}
      </Table>
    </Panel>
  );
}
