import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Inbox, FilePenLine, Send } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { userPlan } from "@/lib/budget";
import { loadProfile } from "@/lib/profile";
import { describe, actorLabel } from "@/lib/activity";
import { Decisions, type Decision } from "@/components/decisions";
import { DeparturesBoard, type BoardRow } from "@/components/ui/board";
import { APP_STATUS, RUNNER_STATUS, daysUntil, sentence } from "@/components/ui/status";
import { Notice, Section, Empty } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";
import { StopButton, CancelEmail, RetryRunner } from "./controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

type Prog = { name: string; schools: { name: string; country: string | null } };

const STAGES: [string, string[]][] = [
  ["Shortlisted", ["shortlisted"]],
  ["Writing", ["preparing", "ready_for_review"]],
  ["Signed", ["packet_approved"]],
  ["Submitted", ["submitted", "under_review", "interview", "waitlisted"]],
  ["Admitted", ["admitted"]],
];

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function Dashboard() {
  const auth = await requireUser();
  if (!auth) return null;
  const { sb, user } = auth;
  const { plan } = await userPlan(user.id);

  const [
    { data: prof },
    { count: docCount },
    { data: approvals },
    { data: apps },
    { data: drafts },
    { data: outgoing },
    { data: inbound },
    { data: events },
    { data: cords },
    { count: parked },
    { data: billing },
  ] = await Promise.all([
    sb.from("profiles").select("profile").single(),
    sb.from("documents").select("id", { count: "exact", head: true }),
    sb.from("approvals").select("id, title, kind, summary, payload").eq("status", "pending").order("urgency", { ascending: false }).limit(12),
    sb.from("applications").select("id, status, target_deadline, runner_status, runner_note, programs(name, schools(name, country))").not("status", "in", "(researching,dropped,withdrawn)").order("target_deadline", { ascending: true, nullsFirst: false }),
    sb.from("events").select("id, application_id, context, created_at").eq("action", "artifact.ready_for_user").order("created_at", { ascending: false }).limit(4),
    sb.from("messages").select("id, subject, to_email, send_after").eq("status", "scheduled").order("send_after"),
    sb.from("messages").select("id, subject, body, purpose, sent_at, threads(application_id)").eq("direction", "in").order("sent_at", { ascending: false }).limit(5),
    sb.from("events").select("id, actor, action, created_at, context").not("action", "like", "guard.%").order("created_at", { ascending: false }).limit(14),
    sb.from("ripcords").select("id").eq("active", true).eq("scope_kind", "all").limit(1),
    sb.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued").ilike("last_error", "budget:%"),
    sb.from("jobs").select("id").eq("status", "queued").ilike("last_error", "%credit balance%").limit(1),
  ]);

  const p = loadProfile(prof?.profile);
  // brand-new accounts start with setup
  if (!p.goals.study_level && !docCount && !apps?.length) redirect("/onboarding");

  const first = p.identity.full_name?.split(" ")[0];
  const paused = !!cords?.length;
  const list = apps ?? [];
  const stuck = list.filter((a) => a.status === "packet_approved" && (a.runner_status === "needs_you" || a.runner_status === "failed"));
  const pending = (approvals ?? []) as Decision[];
  const needsCount = pending.length + stuck.length + (drafts?.length ?? 0);

  const board: BoardRow[] = list
    .filter((a) => a.status !== "rejected")
    .slice(0, 10)
    .map((a) => {
      const pr = a.programs as unknown as Prog;
      const r = a.status === "packet_approved" && a.runner_status !== "idle" ? RUNNER_STATUS[a.runner_status] : null;
      const s = r ?? APP_STATUS[a.status] ?? { label: a.status, tone: "plain" as const };
      const days = daysUntil(a.target_deadline);
      const late = days !== null && days <= 7 && ["shortlisted", "preparing", "ready_for_review"].includes(a.status);
      return { id: a.id, href: `/applications/${a.id}`, departs: a.target_deadline, school: pr.schools.name, program: pr.name, status: s.label, tone: late && s.tone !== "signal" ? "stop" : s.tone };
    });

  const next = list.find((a) => (daysUntil(a.target_deadline) ?? -1) >= 0 && ["shortlisted", "preparing", "ready_for_review", "packet_approved"].includes(a.status));
  const nextDays = next ? daysUntil(next.target_deadline) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-bold leading-none tracking-tight">{first ? `Hello, ${first}` : "Hello"}</h1>
          <p className="mt-3 text-[15px] text-muted">
            {needsCount ? `${needsCount} ${needsCount === 1 ? "thing needs" : "things need"} you.` : "Nothing needs you right now."}
            {next && nextDays !== null ? ` Next deadline: ${(next.programs as unknown as Prog).schools.name.split(",")[0]} in ${nextDays} day${nextDays === 1 ? "" : "s"}.` : ""}
          </p>
        </div>
        <StopButton paused={paused} />
      </header>

      {paused && <Notice tone="stop">Agents are paused. Nothing runs, sends or submits until you resume. Emails you approved yourself still go out.</Notice>}
      {parked ? (
        <Notice>
          You&apos;ve reached this month&apos;s limit for some agent work. {parked} task{parked > 1 ? "s" : ""} will pick up again on the 1st.
          {plan.id === "free" ? <> <Link href="/pricing" className="font-medium underline underline-offset-4">Upgrade</Link> to continue now.</> : null}
        </Notice>
      ) : null}
      {billing?.length ? <Notice tone="plain">Agents are briefly paused on our side. Your queued work is saved and resumes on its own.</Notice> : null}

      <DeparturesBoard
        rows={board}
        title="Your departures"
        empty={
          <span>
            No applications yet. <Link href="/shortlist" className="text-signal underline underline-offset-4">Build your shortlist</Link> and start preparing the ones you like.
          </span>
        }
      />

      <div className="grid grid-cols-5 gap-2 text-center sm:gap-3">
        {STAGES.map(([label, sts]) => {
          const n = list.filter((a) => sts.includes(a.status)).length;
          return (
            <Link key={label} href="/applications" className="rounded-xl border border-line bg-surface px-1 py-3 hover:border-neutral-400">
              <span className="block font-display text-3xl font-bold leading-none tabular">{n}</span>
              <span className="mt-1 block text-[11px] text-muted sm:text-xs">{label}</span>
            </Link>
          );
        })}
      </div>

      <Section title="Needs you" action={<RetryRunner count={stuck.length} />}>
        {needsCount ? (
          <div className="space-y-3">
            {stuck.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-signal/60 bg-signal/8">
                {stuck.map((a) => {
                  const pr = a.programs as unknown as Prog;
                  return (
                    <li key={a.id}>
                      <Link href={`/applications/${a.id}`} className="flex items-start gap-3 p-4 hover:bg-signal/10">
                        <Send className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{pr.schools.name}: submission stopped</span>
                          <span className="mt-0.5 block text-sm text-muted">{sentence(a.runner_note)}</span>
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-muted" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <Decisions items={pending} />
            {drafts?.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {drafts.map((d) => (
                  <li key={d.id}>
                    <Link href={`/applications/${d.application_id}`} className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <FilePenLine className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">Review a draft: {(d.context as { title?: string })?.title ?? "essay"}</span>
                        <span className="text-sm text-muted">Ready {when(d.created_at)}</span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <Empty title="You're all caught up" body="Agents are working. New decisions, drafts and anything a school asks for will show up here." />
        )}
      </Section>

      {outgoing?.length ? (
        <Section title="Emails about to send" description="Agents wait a few minutes before sending, so you can take one back.">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {outgoing.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.subject}</span>
                  <span className="text-sm text-muted">To {m.to_email}</span>
                </span>
                <CancelEmail id={m.id} sendAfter={m.send_after} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="From your schools" description="New emails, read and sorted by your agents.">
          {inbound?.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {inbound.map((m) => (
                <li key={m.id} className="flex gap-3 p-4">
                  <Inbox className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.subject}</span>
                    <span className="mt-0.5 block text-sm text-muted">{m.body}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{m.sent_at ? when(m.sent_at) : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No school emails yet" body={<>Connect Gmail in <Link href="/settings" className="underline underline-offset-4">settings</Link> and replies from your schools appear here.</>} />
          )}
        </Section>

        <Section title="What your agents did" action={<Link href="/settings" className="text-sm text-muted underline-offset-4 hover:underline">Autonomy settings</Link>}>
          {events?.length ? (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {events.map((e) => {
                const text = describe(e);
                if (!text) return null;
                return (
                  <li key={e.id} className="relative">
                    <span className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-background ${e.actor === "user" ? "bg-neutral-400" : "bg-foreground"}`} aria-hidden />
                    <p className="text-sm">{text}</p>
                    <p className="text-xs text-muted">{actorLabel(e.actor) === "you" ? "You" : `${actorLabel(e.actor).replace(/^\w/, (c) => c.toUpperCase())} agent`}, {when(e.created_at)}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty title="No activity yet" action={<ButtonLink href="/onboarding" variant="secondary" size="sm">Finish setup</ButtonLink>} />
          )}
        </Section>
      </div>
    </div>
  );
}
