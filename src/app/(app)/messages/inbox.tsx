"use client";
import Link from "next/link";
import { useMounted } from "@/components/use-mounted";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  ArrowLeft,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Clock,
  ExternalLink,
  LoaderCircle,
  Mail,
  PenLine,
  Search,
  Send,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SchoolTile } from "@/components/home/app-list";

export interface InboxMsg {
  id: string;
  threadId: string;
  direction: "in" | "out";
  subject: string | null;
  body: string;
  summary: string | null;
  status: string;
  to_email: string | null;
  from_email: string | null;
  from_name: string | null;
  purpose: string | null;
  action_needed: string | null;
  due_date: string | null;
  read_at: string | null | undefined; // undefined before the inbox migration: treat as read
  send_after: string | null;
  sent_at: string | null;
  created_at: string;
  last_error: string | null;
}
export interface InboxThread {
  id: string;
  threadIds: string[]; // every email thread with this school, merged into one conversation
  replyThreadId: string; // replies continue the most recent one
  subject: string | null;
  applicationId: string | null;
  school: string;
  contactEmail: string | null;
  messages: InboxMsg[];
}

export interface SchoolDetail {
  program: string;
  status: string;
  runner: string | null;
  runnerNote: string | null;
  deadline: string | null;
  fee: number | null;
  waiver: string | null;
  portalUrl: string | null;
  hasLogin: boolean;
  followups: { title: string; kind: string; status: string; at: string | null }[];
  timeline: { at: string; text: string }[];
}

const KIND: Record<string, [string, string]> = {
  decision_admit: ["Admitted", "bg-go/10 text-go"],
  decision_reject: ["Decision", "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"],
  decision_waitlist: ["Waitlist", "bg-signal/10 text-signal"],
  interview_invite: ["Interview", "bg-accent/10 text-accent"],
  document_request: ["Documents requested", "bg-signal/10 text-signal"],
  action_required: ["Action needed", "bg-signal/10 text-signal"],
  aid_offer: ["Funding offer", "bg-go/10 text-go"],
  fee_waiver_reply: ["Fee waiver", "bg-go/10 text-go"],
  account_or_verification: ["Account", "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"],
  submission_receipt: ["Received", "bg-go/10 text-go"],
  info_or_marketing: ["Info", "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"],
  fee_waiver: ["Fee waiver request", "bg-accent/10 text-accent"],
  aid_reconsideration: ["Aid reconsideration", "bg-accent/10 text-accent"],
  assistantship_inquiry: ["Assistantship", "bg-accent/10 text-accent"],
  scholarship_inquiry: ["Scholarship", "bg-accent/10 text-accent"],
  supervisor_intro: ["Supervisor intro", "bg-accent/10 text-accent"],
};

const at = (m: InboxMsg) => m.sent_at ?? m.created_at;
const unread = (m: InboxMsg) => m.direction === "in" && m.read_at === null;
const waiting = (m: InboxMsg) => ["draft", "pending_approval", "failed"].includes(m.status) && m.direction === "out";
const DAY = 86_400_000;

function short(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  if (new Date().toDateString() === d.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff < 6 * DAY) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
// times depend on the viewer's clock and time zone: render them only in the browser
function When({ iso, f }: { iso: string; f: (iso: string) => string }) {
  const mounted = useMounted();
  return <>{mounted ? f(iso) : ""}</>;
}
const long = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error ?? "Something went wrong"), { payment: json.payment ?? null });
  return json;
}

type Payment = { kind: "request" | "pro" | "submission" | "limit"; label: string; note: string };

// a funding request waiting on payment: pay for it (or subscribe) and it sends straight after
function PayToSend({ messageId, pay }: { messageId: string; pay: Payment }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-3.5">
      <p className="min-w-0 flex-1 text-[13.5px]">
        {pay.kind === "request" ? `Funding requests are ${pay.label} each. Pay and it sends straight away.` : `Your free sends are used. Pro (${pay.label}) covers this request and every other one.`}
      </p>
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const j = await post("/api/billing/checkout", pay.kind === "request" ? { kind: "request", messageId } : { kind: "pro" });
            window.location.assign(j.url);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn't open the payment page");
            setBusy(false);
          }
        }}
      >
        {busy && <LoaderCircle className="size-3.5 animate-spin" />}
        {pay.kind === "request" ? `Pay ${pay.label} and send` : "Subscribe"}
      </Button>
    </div>
  );
}

const FILTERS = [
  ["all", "All"],
  ["unread", "Unread"],
  ["action", "Needs action"],
  ["drafts", "Drafts"],
  ["awaiting", "No reply yet"],
  ["replies", "Replies"],
  ["sent", "Sent"],
] as const;
type Filter = (typeof FILTERS)[number][0];

export function MessagesApp({ threads: initial, initialId, canSend, email, details = {} }: { threads: InboxThread[]; initialId: string | null; canSend: boolean; email: string | null; details?: Record<string, SchoolDetail> }) {
  const router = useRouter();
  const [threads, setThreads] = useState(initial);
  useEffect(() => {
    setThreads(initial);
  }, [initial]);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialId);

  const last = (t: InboxThread) => t.messages[t.messages.length - 1];
  const sorted = useMemo(() => [...threads].sort((a, b) => at(last(b)).localeCompare(at(last(a)))), [threads]);
  const counts = useMemo(
    () => ({
      unread: threads.filter((t) => t.messages.some(unread)).length,
      action: threads.filter((t) => t.messages.some((m) => m.direction === "in" && m.action_needed) || t.messages.some(waiting)).length,
      replies: threads.filter((t) => t.messages.some((m) => m.direction === "in")).length,
      sent: threads.filter((t) => t.messages.some((m) => m.direction === "out" && m.status === "sent")).length,
      drafts: threads.filter((t) => t.messages.some(waiting)).length,
      sending: threads.reduce((n, t) => n + t.messages.filter((m) => m.status === "scheduled").length, 0),
      awaiting: threads.filter((t) => {
        const l = last(t);
        return l.direction === "out" && l.status === "sent" && Date.now() - Date.parse(at(l)) > 5 * DAY;
      }).length,
    }),
    [threads],
  );

  const shown = sorted.filter((t) => {
    const ok =
      filter === "unread"
        ? t.messages.some(unread)
        : filter === "action"
          ? t.messages.some((m) => m.direction === "in" && m.action_needed) || t.messages.some(waiting)
          : filter === "replies"
            ? t.messages.some((m) => m.direction === "in")
            : filter === "sent"
              ? t.messages.some((m) => m.direction === "out" && m.status === "sent")
              : filter === "drafts"
                ? t.messages.some(waiting)
                : filter === "awaiting"
                  ? last(t).direction === "out" && last(t).status === "sent" && Date.now() - Date.parse(at(last(t))) > 5 * DAY
                  : true;
    if (!ok) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [t.school, t.subject ?? "", t.contactEmail ?? "", ...t.messages.map((m) => `${m.subject ?? ""} ${m.summary ?? ""} ${m.body}`)].join(" ").toLowerCase().includes(needle);
  });

  // group the list by when the conversation last moved
  const groups: [string, InboxThread[]][] = [];
  for (const t of shown) {
    const age = Date.now() - Date.parse(at(last(t)));
    const label = new Date(at(last(t))).toDateString() === new Date().toDateString() ? "Today" : age < 7 * DAY ? "This week" : age < 31 * DAY ? "This month" : "Earlier";
    const g = groups.find((x) => x[0] === label);
    if (g) g[1].push(t);
    else groups.push([label, [t]]);
  }

  const open = threads.find((t) => t.id === openId) ?? null;

  function select(id: string | null) {
    setOpenId(id);
    try {
      const u = new URL(window.location.href);
      if (id) u.searchParams.set("t", id);
      else u.searchParams.delete("t");
      window.history.replaceState(null, "", u);
    } catch {}
    const t = threads.find((x) => x.id === id);
    if (t?.messages.some(unread)) {
      setThreads((ts) => ts.map((x) => (x.id === id ? { ...x, messages: x.messages.map((m) => (unread(m) ? { ...m, read_at: new Date().toISOString() } : m)) } : x)));
      const ids = [...new Set(t.messages.filter(unread).map((m) => m.threadId))];
      void Promise.all(ids.map((tid) => post(`/api/threads/${tid}`, { action: "read" })))
        .then(() => router.refresh())
        .catch(() => {});
    }
  }

  // opening a thread from a link (?t=) marks it read too
  const marked = useRef(false);
  useEffect(() => {
    if (!marked.current && initialId) {
      marked.current = true;
      select(initialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="grid h-[calc(100dvh-12.5rem)] min-h-[34rem] grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:h-[calc(100dvh-12.5rem)] lg:min-h-[40rem] lg:grid-cols-[23rem_minmax(0,1fr)] xl:grid-cols-[21rem_minmax(0,1fr)_17.5rem]">
        {/* list */}
        <aside className={`flex min-h-0 flex-col border-line lg:border-r ${open ? "hidden lg:flex" : "flex"}`}>
          <div className="space-y-2.5 border-b border-line p-3">
            <label className="flex items-center gap-2 rounded-xl border border-line bg-background px-3 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/12">
              <Search className="size-4 shrink-0 text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search schools and emails" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search messages" />
              {q && (
                <button onClick={() => setQ("")} aria-label="Clear search" className="text-muted hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </label>
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
              {FILTERS.map(([k, label]) => {
                const n = k === "all" ? 0 : k === "awaiting" ? counts.awaiting : counts[k as keyof typeof counts];
                if (k !== "all" && k !== "replies" && k !== "sent" && !n && filter !== k) return null;
                return (
                  <button key={k} onClick={() => setFilter(k)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${filter === k ? "bg-accent/10 text-accent" : "text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"}`}>
                    {label}
                    {n ? <span className={`rounded-full px-1.5 text-[10.5px] tabular ${filter === k ? "bg-ink text-on-ink" : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"}`}>{n}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {groups.map(([label, list]) => (
              <div key={label} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold text-muted">{label}</p>
                <ul>
                  {list.map((t) => {
                    const l = last(t);
                    const isUnread = t.messages.some(unread);
                    const latestIn = [...t.messages].reverse().find((m) => m.direction === "in");
                    const kind = latestIn?.purpose ? KIND[latestIn.purpose] : null;
                    const on = openId === t.id;
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => select(t.id)}
                          className={`relative flex w-full gap-3 rounded-2xl p-3 text-left transition-colors ${on ? "bg-accent/[0.08] ring-1 ring-accent/20" : "hover:bg-neutral-50 dark:hover:bg-neutral-900"}`}
                        >
                          {isUnread && <span className="absolute left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-brand" aria-label="Unread" />}
                          <SchoolTile name={t.school} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={`truncate text-[13.5px] ${isUnread ? "font-extrabold" : "font-bold"}`}>{t.school}</span>
                              <span className={`shrink-0 text-[11px] tabular ${isUnread ? "font-bold text-accent" : "text-muted"}`}><When iso={at(l)} f={short} /></span>
                            </span>
                            <span className={`block truncate text-[12.5px] ${isUnread ? "font-bold" : "font-medium"}`}>{t.subject ?? l.subject ?? "(no subject)"}</span>
                            <span className="mt-0.5 block truncate text-[12px] text-muted">
                              {l.direction === "out" ? (l.status === "sent" ? "You: " : l.status === "scheduled" ? "Sending: " : "Draft: ") : ""}
                              {(l.direction === "in" ? l.summary ?? l.body : l.body).replace(/\s+/g, " ").slice(0, 90)}
                            </span>
                            <span className="mt-1.5 flex flex-wrap gap-1">
                              {kind && <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${kind[1]}`}>{kind[0]}</span>}
                              {t.messages.some(waiting) && <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Draft</span>}
                              {t.messages.some((m) => m.status === "scheduled") && <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Sending soon</span>}
                              {t.messages.length > 1 && <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-bold text-muted dark:bg-neutral-800">{t.messages.length}</span>}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {!shown.length && (
              <div className="px-6 py-14 text-center">
                <p className="font-bold">{q ? "No matches" : "Nothing here"}</p>
                <p className="mt-1 text-sm text-muted">{q ? "Try a school name or a word from the email." : "Pick another filter."}</p>
              </div>
            )}
          </div>
        </aside>

        {/* conversation */}
        <section className={`min-h-0 min-w-0 flex-col ${open ? "flex" : "hidden lg:flex"}`}>
          {open ? (
            <Conversation key={open.id} t={open} canSend={canSend} email={email} onBack={() => select(null)} onChange={() => router.refresh()} />
          ) : (
            <div className="grid flex-1 place-items-center p-10 text-center">
              <div>
                <span className="bg-hero-gradient mx-auto grid size-16 place-items-center rounded-3xl text-white">
                  <Mail className="size-7" aria-hidden />
                </span>
                <p className="mt-4 font-bold">Pick a conversation</p>
                <p className="mt-1 text-sm text-muted">Every email your agents sent and every reply, by school.</p>
              </div>
            </div>
          )}
        </section>

        {/* the school, beside the conversation (wide screens) */}
        <aside className="hidden min-h-0 overflow-y-auto border-l border-line xl:block">
          {open ? <SchoolPanel t={open} d={open.applicationId ? details[open.applicationId] : undefined} /> : <p className="p-6 text-[13px] text-muted">The school&apos;s details show here.</p>}
        </aside>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  shortlisted: "On your shortlist",
  preparing: "Essays being written",
  ready_for_review: "Essays ready for you",
  packet_approved: "Signed, submitting",
  submitted: "Submitted",
  under_review: "Under review",
  interview: "Interview",
  waitlisted: "Waitlisted",
  admitted: "Admitted",
  rejected: "Not admitted",
  accepted: "Accepted",
};

function SchoolPanel({ t, d }: { t: InboxThread; d?: SchoolDetail }) {
  const days = d?.deadline ? Math.round((Date.parse(`${d.deadline}T00:00:00Z`) - Date.now()) / DAY) : null;
  const ask = `/dashboard?chat=open&say=${encodeURIComponent(`About ${t.school}: what should I do next?`)}`;
  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-col items-center text-center">
        <SchoolTile name={t.school} />
        <p className="mt-3 font-serif text-[18px] leading-snug">{t.school}</p>
        {d && <p className="mt-0.5 text-[12.5px] text-muted">{d.program}</p>}
        <div className="mt-3 flex gap-2">
          <Link href={ask} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-medium hover:border-neutral-300 dark:hover:border-neutral-700">
            <Sparkles className="size-3.5 text-brand" aria-hidden /> Ask Ivyward AI
          </Link>
          {t.applicationId && (
            <Link href={`/applications/${t.applicationId}`} className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-[12.5px] font-medium hover:border-neutral-300 dark:hover:border-neutral-700">
              Application
            </Link>
          )}
        </div>
      </div>

      {d ? (
        <dl className="space-y-3 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Status</dt>
            <dd className="text-right font-medium">{d.status === "packet_approved" && d.runner === "needs_you" ? "Needs you on the portal" : STATUS_LABEL[d.status] ?? d.status.replace(/_/g, " ")}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Deadline</dt>
            <dd className={`text-right font-medium ${days !== null && days >= 0 && days <= 7 ? "text-stop" : ""}`}>
              {d.deadline ? new Date(`${d.deadline}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" }) : "Not found"}
              {days !== null && days >= 0 ? <span className="font-normal text-muted"> ({days}d)</span> : null}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Fee</dt>
            <dd className="text-right font-medium">{d.fee ? `$${d.fee}` : d.fee === 0 ? "None" : "Unknown"}</dd>
          </div>
          {d.waiver && (
            <div>
              <dt className="text-muted">Fee waiver</dt>
              <dd className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed">{d.waiver}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Portal login</dt>
            <dd className="text-right font-medium">{d.hasLogin ? <Link href="/logins" className="text-brand hover:underline">Saved</Link> : "Not yet"}</dd>
          </div>
          {d.runner === "needs_you" && d.runnerNote && <p className="rounded-lg bg-signal/10 px-3 py-2 text-[12.5px] leading-snug text-signal">{d.runnerNote}</p>}
        </dl>
      ) : (
        <p className="text-[13px] text-muted">This school isn&apos;t linked to one of your applications.</p>
      )}

      {d && d.followups.length > 0 && (
        <section>
          <h3 className="mb-2 text-[12px] font-semibold text-muted">From their emails</h3>
          <ul className="space-y-2">
            {d.followups.map((f, i) => (
              <li key={i} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
                <span className="block font-medium leading-snug">{f.title}</span>
                <span className={`text-[11.5px] ${f.status === "needs_you" ? "text-signal" : f.status === "done" ? "text-go" : "text-muted"}`}>
                  {f.status === "done" ? "Done" : f.status === "needs_you" ? "Needs you" : "Agents on it"}
                  {f.at ? <span className="text-muted">, <When iso={f.at} f={long} /></span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d && d.timeline.length > 0 && (
        <section>
          <h3 className="mb-2 text-[12px] font-semibold text-muted">Timeline</h3>
          <ol className="relative space-y-3 border-l border-line pl-4">
            {d.timeline.map((e, i) => (
              <li key={i} className="relative text-[12.5px] leading-snug">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-neutral-300 ring-4 ring-surface dark:bg-neutral-600" aria-hidden />
                <span className="block">{e.text.charAt(0).toUpperCase() + e.text.slice(1)}</span>
                <span className="text-[11px] text-muted">
                  <When iso={e.at} f={short} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Conversation({ t, canSend, email, onBack, onChange }: { t: InboxThread; canSend: boolean; email: string | null; onBack: () => void; onChange: () => void }) {
  const sent = t.messages.filter((m) => !waiting(m));
  const drafts = t.messages.filter(waiting);
  const [showOld, setShowOld] = useState(false);
  const older = sent.length > 3 && !showOld ? sent.slice(0, sent.length - 2) : [];
  const recent = sent.slice(older.length);
  const latestIn = [...t.messages].reverse().find((m) => m.direction === "in");
  const l = t.messages[t.messages.length - 1];
  const quiet = l.direction === "out" && l.status === "sent" ? Math.floor((Date.now() - Date.parse(at(l))) / DAY) : 0;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, []);
  const topics = new Set(t.messages.map((m) => (m.subject ?? "").replace(/^\s*((re|fwd?)\s*:\s*)+/i, "").trim().toLowerCase())).size;
  const replyTo = latestIn?.from_email ?? t.contactEmail ?? [...t.messages].reverse().find((m) => m.direction === "out")?.to_email ?? "";

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-6">
        <button onClick={onBack} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-neutral-100 lg:hidden dark:hover:bg-neutral-800" aria-label="Back to messages">
          <ArrowLeft className="size-4" />
        </button>
        <SchoolTile name={t.school} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold tracking-[-0.01em]">{t.school}</h2>
          <p className="truncate text-[12.5px] text-muted">
            {topics > 1 ? `${topics} topics, ${t.messages.length} emails` : (t.subject ?? l.subject ?? "(no subject)")}
            {replyTo ? `, ${replyTo}` : ""}
          </p>
        </div>
        {t.applicationId && (
          <Link href={`/applications/${t.applicationId}`} className="hidden shrink-0 items-center gap-1 rounded-xl border border-line px-3 py-1.5 text-[12.5px] font-bold hover:border-neutral-300 sm:inline-flex dark:hover:border-neutral-700">
            Application <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-background/60 px-3 py-5 sm:px-6">
        {latestIn && (latestIn.summary || latestIn.action_needed) && (
          <div className="rounded-3xl border border-accent/20 bg-[color-mix(in_oklab,var(--accent)_5%,var(--surface))] p-4">
            <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-bold text-accent">
              <Sparkles className="size-3.5" aria-hidden /> What this means
            </p>
            {latestIn.summary && <p className="text-[13.5px] leading-relaxed">{latestIn.summary}</p>}
            {(latestIn.action_needed || latestIn.due_date) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {latestIn.action_needed && <span className="rounded-lg bg-signal/10 px-2.5 py-1 text-xs font-bold text-signal">To do: {latestIn.action_needed}</span>}
                {latestIn.due_date && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-stop/10 px-2.5 py-1 text-xs font-bold text-stop">
                    <CalendarDays className="size-3.5" aria-hidden />
                    By {new Date(latestIn.due_date + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {older.length > 0 && (
          <button onClick={() => setShowOld(true)} className="mx-auto flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-muted shadow-card hover:text-foreground">
            <ChevronDown className="size-3.5" aria-hidden /> {older.length} earlier message{older.length === 1 ? "" : "s"}
          </button>
        )}
        {recent.map((m, i) => {
          const base = (x?: InboxMsg) => (x?.subject ?? "").replace(/^\s*((re|fwd?)\s*:\s*)+/i, "").trim().toLowerCase();
          const prev = i > 0 ? recent[i - 1] : older[older.length - 1];
          const newTopic = topics > 1 && (!prev || base(prev) !== base(m));
          return (
            <div key={m.id} className="space-y-3">
              {newTopic && (
                <p className="flex items-center gap-3 pt-1 text-[11.5px] font-bold text-muted">
                  <span className="h-px flex-1 bg-line" aria-hidden />
                  <span className="max-w-[70%] truncate">{m.subject?.replace(/^\s*((re|fwd?)\s*:\s*)+/i, "") || "No subject"}</span>
                  <span className="h-px flex-1 bg-line" aria-hidden />
                </p>
              )}
              <MessageCard m={m} school={t.school} me={email} defaultOpen={i === recent.length - 1 || m.direction === "in" || m.status === "scheduled"} onChange={onChange} />
            </div>
          );
        })}
        {drafts.map((m) => (
          <DraftCard key={m.id} m={m} canSend={canSend} onChange={onChange} />
        ))}
        {quiet >= 5 && !drafts.length && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-signal/40 bg-signal/[0.05] p-3.5 text-[13px]">
            <AlarmClock className="size-4 text-signal" aria-hidden />
            <span className="flex-1">No reply in {quiet} days. A short, polite follow-up usually helps.</span>
          </div>
        )}
        <div ref={end} />
      </div>

      <Composer threadId={t.replyThreadId} canSend={canSend} replyTo={replyTo} intent={quiet >= 5 ? "follow_up" : "reply"} onChange={onChange} />
    </>
  );
}

function MessageCard({ m, school, me, defaultOpen, onChange }: { m: InboxMsg; school: string; me: string | null; defaultOpen: boolean; onChange: () => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const mine = m.direction === "out";
  const who = mine ? "You" : m.from_name || school;
  const kind = m.purpose ? KIND[m.purpose] : null;
  return (
    <article className={`rounded-3xl border shadow-card transition-colors ${mine ? "border-accent/15 bg-[color-mix(in_oklab,var(--accent)_4%,var(--surface))]" : "border-line bg-surface"}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5" aria-expanded={open}>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-[12px] font-bold ${mine ? "bg-hero-gradient text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}>
          {mine ? "You" : who.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="text-[13.5px] font-bold">{who}</span>
            {kind && <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${kind[1]}`}>{kind[0]}</span>}
            {m.status === "scheduled" && <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Sending soon</span>}
            {mine && m.status === "sent" && <CheckCheck className="size-3.5 text-go" aria-label="Sent" />}
          </span>
          <span className="block truncate text-[12px] text-muted">
            {open ? (mine ? `to ${m.to_email ?? "the school"}${me ? `, from ${me}` : ""}` : m.from_email ? `from ${m.from_email}` : "") : (m.direction === "in" ? m.summary ?? m.body : m.body).replace(/\s+/g, " ").slice(0, 120)}
          </span>
        </span>
        <span className="shrink-0 text-[11.5px] text-muted"><When iso={at(m)} f={long} /></span>
      </button>
      {open && (
        <div className="border-t border-line/70 px-4 pb-4 pt-3 sm:px-5">
          {m.subject && <p className="mb-2 text-[13px] font-bold">{m.subject}</p>}
          <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.7]">{m.body}</div>
          {m.status === "scheduled" && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-muted">
              <Clock className="size-3.5" aria-hidden />
              {m.send_after && Date.parse(m.send_after) > Date.now() ? `Sends at ${new Date(m.send_after).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Sending now"}
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                className="ml-auto"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await post(`/api/messages/${m.id}`, { action: "cancel" });
                    toast.success("Held back. It's a draft again.");
                    onChange();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Too late");
                  }
                  setBusy(false);
                }}
              >
                <Undo2 className="size-3.5" aria-hidden /> Undo
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function DraftCard({ m, canSend, onChange }: { m: InboxMsg; canSend: boolean; onChange: () => void }) {
  const [to, setTo] = useState(m.to_email ?? "");
  const [subject, setSubject] = useState(m.subject ?? "");
  const [body, setBody] = useState(m.body);
  const [busy, setBusy] = useState<string | null>(null);
  const [pay, setPay] = useState<Payment | null>(null);
  const dirty = to !== (m.to_email ?? "") || subject !== (m.subject ?? "") || body !== m.body;
  const kind = m.purpose ? KIND[m.purpose] : null;

  async function run(label: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(label);
    try {
      await fn();
      toast.success(ok);
      onChange();
    } catch (e) {
      const p = (e as { payment?: Payment | null }).payment;
      if (p) setPay(p);
      else toast.error(e instanceof Error ? e.message : "Couldn't do that");
    }
    setBusy(null);
  }
  const save = () => post(`/api/messages/${m.id}`, { action: "save", subject, body, to_email: to });

  return (
    <article className="rounded-3xl border-2 border-dashed border-line bg-surface p-4 shadow-card sm:p-5 dark:border-neutral-700">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-1 text-[11.5px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          <PenLine className="size-3.5" aria-hidden /> {m.status === "failed" ? "Didn't send" : "Draft for you to review"}
        </span>
        {kind && <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${kind[1]}`}>{kind[0]}</span>}
      </div>
      {m.last_error && <p className="mb-2 text-xs text-stop">{m.last_error}</p>}
      <div className="space-y-2">
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To (the school's official address)" aria-label="To" className="h-10 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-accent" />
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject" className="h-10 w-full rounded-xl border border-line bg-background px-3 text-sm font-semibold outline-none focus:border-accent" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(14, Math.max(6, Math.ceil(body.length / 85)))} aria-label="Message" className="w-full resize-y rounded-xl border border-line bg-background px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-accent" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canSend ? (
          <Button
            disabled={!!busy || !to.trim()}
            onClick={() =>
              run(
                "send",
                async () => {
                  if (dirty) await save();
                  await post(`/api/messages/${m.id}`, { action: "send" });
                },
                "Sending in a few minutes. You can still undo.",
              )
            }
          >
            {busy === "send" ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" aria-hidden />}
            Approve and send
          </Button>
        ) : (
          <a href={`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-on-ink">
            <Mail className="size-4" aria-hidden /> Open in my email
          </a>
        )}
        <Button variant="secondary" disabled={!dirty || !!busy} onClick={() => run("save", save, "Saved")}>
          Save
        </Button>
        {!canSend && (
          <Button variant="secondary" disabled={!!busy || dirty} onClick={() => run("mark", () => post(`/api/messages/${m.id}`, { action: "mark_sent" }), "Marked as sent")}>
            I sent it
          </Button>
        )}
        <Button variant="ghost" className="ml-auto" disabled={!!busy} onClick={() => run("discard", () => post(`/api/messages/${m.id}`, { action: "discard" }), "Discarded")}>
          <Trash2 className="size-3.5" aria-hidden /> Discard
        </Button>
      </div>
      {pay && <PayToSend messageId={m.id} pay={pay} />}
    </article>
  );
}

function Composer({ threadId, canSend, replyTo, intent, onChange }: { threadId: string; canSend: boolean; replyTo: string; intent: "reply" | "follow_up"; onChange: () => void }) {
  const [body, setBody] = useState("");
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [asking, setAsking] = useState(false);

  async function draft() {
    setBusy("ai");
    try {
      const r = await post(`/api/threads/${threadId}`, { action: "draft_ai", intent, notes: notes || undefined });
      setBody(r.body);
      setSubject(r.subject);
      setAsking(false);
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't draft it");
    }
    setBusy(null);
  }
  async function submit(send: boolean) {
    setBusy(send ? "send" : "save");
    try {
      const r = await post(`/api/threads/${threadId}`, { action: "reply", body, subject, to: replyTo, send });
      if (send && !r.sent) toast.error(r.error ?? "Saved as a draft; it couldn't send");
      else toast.success(send ? "Sending in a few minutes. You can still undo." : "Saved as a draft");
      setBody("");
      setSubject(undefined);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save it");
    }
    setBusy(null);
  }

  return (
    <footer className="border-t border-line bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
      {asking && (
        <div className="mb-2 flex gap-2">
          <input autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} onKeyDown={(e) => e.key === "Enter" && draft()} placeholder="What should it say? (optional) e.g. ask if the deadline can move" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-accent" />
          <Button variant="accent" disabled={busy === "ai"} onClick={draft}>
            {busy === "ai" ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" aria-hidden />}
            Write it
          </Button>
        </div>
      )}
      <div className="rounded-2xl border border-line bg-background p-1.5 transition-shadow focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/12">
        {subject && <p className="truncate px-2.5 pt-1.5 text-xs font-semibold text-muted">{subject}</p>}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={body ? Math.min(8, Math.max(3, Math.ceil(body.length / 80))) : composing ? 3 : 1}
          onFocus={() => setComposing(true)}
          onBlur={() => setComposing(false)}
          placeholder={intent === "follow_up" ? "Write a follow-up…" : `Reply${replyTo ? ` to ${replyTo}` : ""}…`}
          aria-label="Your reply"
          className="w-full resize-none bg-transparent px-2.5 py-2 text-[14px] leading-relaxed outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 px-1 pb-0.5">
          <button onClick={() => setAsking(!asking)} disabled={busy === "ai"} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-bold text-accent hover:bg-accent/10">
            {busy === "ai" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" aria-hidden />}
            {intent === "follow_up" ? "Draft a follow-up" : "Draft a reply"}
          </button>
          <span className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={!body.trim() || !!busy} onClick={() => submit(false)}>
              Save draft
            </Button>
            {canSend ? (
              <Button size="sm" disabled={!body.trim() || !!busy} onClick={() => submit(true)}>
                {busy === "send" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" aria-hidden />}
                Send
              </Button>
            ) : (
              <Link href="/settings" className="text-[12px] font-bold text-brand hover:underline">
                Connect Gmail to send
              </Link>
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}
