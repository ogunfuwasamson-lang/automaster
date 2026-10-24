import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Clock, Inbox, Mail } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/ui/page";
import { SchoolTile } from "@/components/home/app-list";
import { CancelEmail } from "../dashboard/controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

interface Msg {
  id: string;
  direction: "in" | "out";
  subject: string | null;
  body: string;
  status: string;
  to_email: string | null;
  purpose: string | null;
  send_after: string | null;
  sent_at: string | null;
  created_at: string;
}
interface Thread {
  id: string;
  subject: string | null;
  created_at: string;
  application_id: string | null;
  contacts: { name: string | null; email: string } | null;
  applications: { programs: { schools: { name: string } } } | null;
  messages: Msg[];
}

const FILTERS: [string, string][] = [
  ["all", "All"],
  ["replies", "Replies"],
  ["sent", "Sent"],
  ["waiting", "Drafts and scheduled"],
];
const STATUS: Record<string, [string, string]> = {
  sent: ["Sent", "text-go"],
  scheduled: ["Sending soon", "text-accent"],
  draft: ["Draft", "text-muted"],
  pending_approval: ["Waiting for you", "text-signal"],
  failed: ["Didn't send", "text-stop"],
  cancelled: ["Cancelled", "text-muted"],
};

const at = (m: Msg) => m.sent_at ?? m.created_at;
function when(iso: string, long = false) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (!long && mins < 60) return mins < 1 ? "now" : `${mins}m`;
  if (!long && mins < 24 * 60) return `${Math.round(mins / 60)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(long ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

export default async function Messages({ searchParams }: { searchParams: Promise<{ t?: string; f?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { t, f = "all" } = await searchParams;
  const { data } = await auth.sb
    .from("threads")
    .select("id, subject, created_at, application_id, contacts(name, email), applications(programs(schools(name))), messages(id, direction, subject, body, status, to_email, purpose, send_after, sent_at, created_at)")
    .order("created_at", { ascending: false })
    .limit(200);

  const threads = ((data ?? []) as unknown as Thread[])
    .map((th) => ({ ...th, messages: [...(th.messages ?? [])].filter((m) => m.status !== "cancelled").sort((a, b) => at(a).localeCompare(at(b))) }))
    .filter((th) => th.messages.length)
    .sort((a, b) => at(b.messages[b.messages.length - 1]).localeCompare(at(a.messages[a.messages.length - 1])));

  const shown = threads.filter((th) =>
    f === "replies" ? th.messages.some((m) => m.direction === "in") : f === "sent" ? th.messages.some((m) => m.direction === "out" && m.status === "sent") : f === "waiting" ? th.messages.some((m) => ["draft", "scheduled", "pending_approval"].includes(m.status)) : true,
  );
  const open = threads.find((th) => th.id === t) ?? (t ? undefined : shown[0]);
  const school = (th: Thread) => th.applications?.programs?.schools?.name ?? th.contacts?.name ?? th.contacts?.email ?? "School";
  const counts = { replies: threads.filter((x) => x.messages.some((m) => m.direction === "in")).length, sent: threads.reduce((n, x) => n + x.messages.filter((m) => m.direction === "out" && m.status === "sent").length, 0) };

  return (
    <div>
      <PageHeader
        title="Messages"
        description={
          threads.length
            ? `${counts.sent} email${counts.sent === 1 ? "" : "s"} sent for you, ${counts.replies} conversation${counts.replies === 1 ? "" : "s"} with replies. Everything goes out from your own Gmail.`
            : "Emails your agents send for you, and every reply from your schools, in one place."
        }
      />
      {threads.length ? (
        <div className="grid min-h-[60vh] overflow-hidden rounded-[28px] border border-line bg-surface shadow-card lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className={`border-line lg:border-r ${t ? "hidden lg:block" : ""}`}>
            <nav className="flex gap-1 overflow-x-auto border-b border-line p-2.5" aria-label="Filter">
              {FILTERS.map(([k, label]) => (
                <Link
                  key={k}
                  href={`/messages?f=${k}`}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${f === k ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <ul className="max-h-[70vh] overflow-y-auto p-2">
              {shown.map((th) => {
                const last = th.messages[th.messages.length - 1];
                const replied = th.messages.some((m) => m.direction === "in");
                const on = open?.id === th.id;
                return (
                  <li key={th.id}>
                    <Link
                      href={`/messages?f=${f}&t=${th.id}`}
                      className={`flex gap-3 rounded-2xl p-3 transition-colors ${on ? "bg-accent/[0.07] ring-1 ring-accent/20" : "hover:bg-neutral-50 dark:hover:bg-neutral-900"}`}
                    >
                      <SchoolTile name={school(th)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13.5px] font-bold">{school(th)}</span>
                          <span className="shrink-0 text-[11px] text-muted">{when(at(last))}</span>
                        </span>
                        <span className="block truncate text-[12.5px] font-medium">{th.subject ?? last.subject ?? "(no subject)"}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                          {last.direction === "in" ? <ArrowDownLeft className="size-3 text-go" aria-hidden /> : <ArrowUpRight className="size-3 text-accent" aria-hidden />}
                          <span className="truncate">{last.body.replace(/\s+/g, " ").slice(0, 70)}</span>
                        </span>
                        {replied && <span className="mt-1 inline-block rounded-full bg-go/10 px-2 py-0.5 text-[10.5px] font-bold text-go">Replied</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {!shown.length && <li className="p-6 text-center text-sm text-muted">Nothing here.</li>}
            </ul>
          </aside>

          <section className={`flex min-w-0 flex-col ${t ? "" : "hidden lg:flex"}`}>
            {open ? (
              <>
                <header className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
                  <Link href={`/messages?f=${f}`} className="grid size-8 place-items-center rounded-xl text-muted hover:bg-neutral-100 lg:hidden dark:hover:bg-neutral-800" aria-label="Back to messages">
                    <ChevronLeft className="size-4" />
                  </Link>
                  <SchoolTile name={school(open)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold tracking-[-0.01em]">{open.subject ?? open.messages[0].subject ?? "(no subject)"}</h2>
                    <p className="truncate text-[12.5px] text-muted">
                      {school(open)}
                      {open.contacts?.email ? `, ${open.contacts.email}` : ""}
                    </p>
                  </div>
                  {open.application_id && (
                    <Link href={`/applications/${open.application_id}`} className="hidden shrink-0 text-[12.5px] font-bold text-accent hover:underline sm:block">
                      Open application
                    </Link>
                  )}
                </header>
                <ol className="flex-1 space-y-4 overflow-y-auto bg-background/50 px-4 py-6 sm:px-6">
                  {open.messages.map((m) => {
                    const mine = m.direction === "out";
                    const [label, tone] = STATUS[m.status] ?? ["", "text-muted"];
                    return (
                      <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <article
                          className={`max-w-[44rem] rounded-3xl px-5 py-4 text-[14px] leading-relaxed shadow-card ${
                            mine ? "rounded-br-lg border border-accent/20 bg-[color-mix(in_oklab,var(--accent)_7%,var(--surface))]" : "rounded-bl-lg border border-line bg-surface"
                          }`}
                        >
                          <header className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                            <span className="inline-flex items-center gap-1.5 font-bold">
                              {mine ? <Mail className="size-3.5 text-accent" aria-hidden /> : <Inbox className="size-3.5 text-go" aria-hidden />}
                              {mine ? `You, to ${m.to_email ?? open.contacts?.email ?? "the school"}` : school(open)}
                            </span>
                            <span className="text-muted">{when(at(m), true)}</span>
                            {mine && label && <span className={`font-bold ${tone}`}>{label}</span>}
                          </header>
                          {m.subject && m.subject !== open.subject && <p className="mb-1 font-semibold">{m.subject}</p>}
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          {m.status === "scheduled" && (
                            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                              <Clock className="size-3.5" aria-hidden />
                              <CancelEmail id={m.id} sendAfter={m.send_after} />
                            </div>
                          )}
                          {(m.status === "draft" || m.status === "pending_approval") && open.application_id && (
                            <Link href={`/applications/${open.application_id}`} className="mt-3 inline-block text-xs font-bold text-accent hover:underline">
                              Review and send from the application
                            </Link>
                          )}
                        </article>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-10 text-sm text-muted">Pick a conversation.</div>
            )}
          </section>
        </div>
      ) : (
        <Empty
          icon={<Mail className="size-5" />}
          title="No emails yet"
          body="When agents email a school for you (fee waivers, funding questions) or a school replies, the whole conversation shows up here. Connect Gmail in settings so replies come in."
        />
      )}
    </div>
  );
}
