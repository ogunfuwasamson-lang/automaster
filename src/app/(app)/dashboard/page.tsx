import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  ChevronDown,
  Compass,
  FilePenLine,
  FileSignature,
  Globe,
  Inbox,
  Layers,
  Mail,
  PenLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { userPlan } from "@/lib/budget";
import { loadProfile } from "@/lib/profile";
import { describe, actorLabel } from "@/lib/activity";
import { Decisions, type Decision } from "@/components/decisions";
import { daysUntil, sentence } from "@/components/ui/status";
import { Card, Notice, Empty } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";
import { Count } from "@/components/motion/count";
import { Stagger, Rise } from "@/components/motion/reveal";
import { DeadlineCard } from "@/components/home/deadline-card";
import { AskBox } from "@/components/home/ask-box";
import { CampusInk } from "@/components/landing/campus-ink";
import { AppList, SchoolTile, type AppRow } from "@/components/home/app-list";
import { StopButton, RetryRunner } from "./controls";
import { ShortlistProgress, type ShortlistRun } from "@/components/home/shortlist-progress";
import { openQuestions } from "@/lib/portal-questions";
import { waitingList, type WaitItem } from "@/lib/waiting";
import { ourSide } from "@/lib/portal-progress";
import { LocalTime } from "@/components/ui/local-time";
import { ReportButton, WeeklyReportDialog, type WeeklyReport } from "@/components/home/weekly-report";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { dashboardNudge } from "@/lib/nudge";
import { NudgeCard } from "@/components/billing/nudge-card";
import { UpgradeLink } from "@/components/billing/pay";
import { billingState } from "@/lib/billing";
import { NewForYou, type FreshAward, type FreshProgram } from "@/components/home/new-for-you";
import { TodayCard } from "@/components/home/today-card";
import { JourneyMap } from "@/components/home/journey-map";
import { loadToday } from "@/lib/today-data";
import { calendarAccount, gcalReady } from "@/lib/gcal";
import { WhatsAppChannel } from "@/components/growth/whatsapp-channel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

type Prog = { name: string; schools: { name: string; country: string | null } };
type Art = { kind: string; current_version: number; artifact_versions: { version: number; user_approved_at: string | null }[] };
const NOT_ESSAYS = ["strategy", "fee_plan", "funding_plan", "video_or_interview"];

const ACTOR_ICON: Record<string, [typeof Mail, string]> = {
  inbox: [Mail, "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
  writer: [PenLine, "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
  redteam: [ShieldCheck, "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
  runner: [Globe, "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
  recon: [Search, "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
  strategist: [Compass, "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
  closer: [Banknote, "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
  you: [UserRound, "text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
};

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// what the agents found in the last day, and how much is still to come on later mornings (lib/drop)
async function loadFresh(sb: NonNullable<Awaited<ReturnType<typeof requireUser>>>["sb"]): Promise<{ programs: FreshProgram[]; awards: FreshAward[]; upcoming: number }> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [{ data: apps }, awardsQ, { count: upcoming }] = await Promise.all([
    sb.from("applications").select("id, fit_score, target_deadline, created_at, programs(name, degree, schools(name, country))").gte("created_at", since).in("status", ["shortlisted", "researching", "preparing"]).order("fit_score", { ascending: false, nullsFirst: false }).limit(12),
    sb.from("user_funding").select("id, created_at, funding_opportunities(name, amount_note, deadline)").gte("created_at", since).limit(40),
    sb.from("jobs").select("id", { count: "exact", head: true }).eq("agent", "recon").eq("task", "research_program").eq("status", "queued").gt("run_at", new Date(Date.now() + 15 * 60_000).toISOString()),
  ]);
  const programs = ((apps ?? []) as unknown as { id: string; fit_score: number | null; target_deadline: string | null; programs: { name: string; degree: string | null; schools: { name: string; country: string | null } } | null }[])
    .filter((a) => a.programs && a.programs.degree !== "Scholarship")
    .map((a) => ({ id: a.id, school: a.programs!.schools.name, program: a.programs!.name.split(" (")[0], country: a.programs!.schools.country, deadline: a.target_deadline, fit: a.fit_score == null ? null : Number(a.fit_score) }));
  const awards = ((awardsQ.error ? [] : awardsQ.data ?? []) as unknown as { id: string; funding_opportunities: { name: string; amount_note: string | null; deadline: string | null } | null }[])
    .filter((a) => a.funding_opportunities)
    .map((a) => ({ id: a.id, name: a.funding_opportunities!.name, amount: a.funding_opportunities!.amount_note, deadline: a.funding_opportunities!.deadline }));
  return { programs, awards, upcoming: upcoming ?? 0 };
}

function greeting() {
  // the server runs in UTC; most applicants are a few hours either side, so keep it broad
  const h = new Date().getUTCHours() + 1;
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

// the shortlist run in progress, if any: the latest planner job and the recon jobs queued since
async function loadShortlistRun(sb: NonNullable<Awaited<ReturnType<typeof requireUser>>>["sb"]): Promise<ShortlistRun | null> {
  const { data: jobs } = await sb.from("jobs").select("task, status, created_at, run_at, result").eq("agent", "recon").neq("task", "scholarships").order("created_at", { ascending: false }).limit(80);
  const soon = new Date(Date.now() + 15 * 60_000).toISOString();
  // research waiting for a later morning (lib/drop) isn't part of today's run
  const list = ((jobs ?? []) as { task: string; status: string; created_at: string; run_at: string; result: { regions?: string[] } | null }[]).filter((j) => j.status !== "queued" || j.run_at <= soon);
  const plan = list.find((j) => j.task === "discover");
  if (!plan) return null;
  const run = list.filter((j) => j.created_at >= plan.created_at);
  const open = (j: { status: string }) => j.status === "queued" || j.status === "running";
  if (!run.some(open)) return null;
  const regionJobs = run.filter((j) => j.task === "discover_region");
  const programs = run.filter((j) => j.task === "research_program");
  return {
    planning: open(plan),
    regions: plan.result?.regions?.length ?? (regionJobs.length || 1),
    regionsLeft: regionJobs.filter(open).length,
    programsTotal: programs.length,
    programsDone: programs.filter((j) => !open(j)).length,
  };
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ calendar?: string; dates?: string }> }) {
  const sp = await searchParams;
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
    { count: draftMails },
    { data: events },
    { data: cords },
    { data: waitingJobs },
    { data: billing },
    { count: working },
  ] = await Promise.all([
    sb.from("profiles").select("profile, portal_details, is_admin").single(),
    sb.from("documents").select("id", { count: "exact", head: true }),
    sb.from("approvals").select("id, title, kind, summary, payload").eq("status", "pending").order("urgency", { ascending: false }).limit(12),
    sb
      .from("applications")
      .select("id, status, target_deadline, attested_at, runner_status, runner_note, reason:runner_state->>reason, resting:runner_state->>resting, programs(name, app_fee_usd, schools(name, country)), artifacts(kind, current_version, artifact_versions(version, user_approved_at))")
      .not("status", "in", "(researching,dropped,withdrawn)")
      .order("target_deadline", { ascending: true, nullsFirst: false }),
    sb.from("events").select("id, application_id, context, created_at").eq("action", "artifact.ready_for_user").order("created_at", { ascending: false }).limit(4),
    sb.from("messages").select("id, subject, to_email, send_after").eq("status", "scheduled").order("send_after"),
    sb.from("messages").select("id", { count: "exact", head: true }).eq("direction", "out").in("status", ["draft", "pending_approval", "failed"]),
    sb.from("events").select("id, actor, action, created_at, context").not("action", "like", "guard.%").order("created_at", { ascending: false }).limit(8),
    sb.from("ripcords").select("id").eq("active", true).eq("scope_kind", "all").limit(1),
    sb.from("jobs").select("last_error").eq("status", "queued").or('last_error.ilike."budget:%",last_error.ilike."hold:%"').limit(500),
    sb.from("jobs").select("id").eq("status", "queued").ilike("last_error", "%credit balance%").limit(1),
    // what the agents are doing now: running, or due now (not work parked for a later day)
    sb.from("jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]).lte("run_at", new Date().toISOString()),
  ]);

  const [shortlistRun, fresh, today] = await Promise.all([loadShortlistRun(sb), loadFresh(sb).catch(() => ({ programs: [], awards: [], upcoming: 0 })), loadToday(user.id).catch(() => null)]);
  const setupQ = await sb.from("notifications").select("id, title, body, href, action_label, urgent, dedupe_key").eq("kind", "setup").is("resolved_at", null).order("urgent", { ascending: false }).limit(6);
  // the calendar ask isn't something waiting on them: the deadline card offers it, the bell and one email carry it
  const setupTodo = setupQ.error ? [] : (setupQ.data ?? []).filter((n) => n.dedupe_key !== "calendar:connect");
  // follow-ups from school emails: events coming up, and forms the agents are doing or need help with
  const upQ = await sb.from("followups").select("id, title, school, kind, status, event_start, deadline, url, why, result_note, application_id").or(`event_start.gte.${new Date().toISOString()},status.in.(queued,working,needs_you)`).order("event_start", { ascending: true, nullsFirst: false }).limit(6);
  const upcoming = upQ.error ? [] : (upQ.data ?? []);
  const { data: weekly } = await sb.from("digests").select("id, content, created_at").eq("content->>kind", "weekly").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const report = weekly && (weekly.content as { kind?: string }).kind === "weekly" ? weekly : null;
  const unreadQ = await sb.from("messages").select("id", { count: "exact", head: true }).eq("direction", "in").is("read_at", null);
  const unread = unreadQ.error ? 0 : (unreadQ.count ?? 0);
  const p = loadProfile(prof?.profile);
  if (!p.goals.study_level && !docCount && !apps?.length) redirect("/onboarding");

  // the name they asked to be called on forms wins; otherwise the first word of their name
  const first = ((prof?.portal_details as { preferred_name?: string } | null)?.preferred_name || p.identity.full_name?.split(" ")[0] || "").trim();
  const paused = !!cords?.length;
  // work waiting: for a submission credit (free accounts), for next month's research, for a check by the team (one
  // application past its ceiling), or on the monthly backstop (lib/credit-rules)
  const waitingErr = (waitingJobs ?? []).map((j) => String(j.last_error ?? ""));
  const forCredit = (e: string) => /^budget: (the agents|starter|this month's free allowance)/.test(e);
  const lockedWait = waitingErr.filter(forCredit).length;
  const researchWait = waitingErr.filter((e) => e.startsWith("budget: this month's programme research")).length;
  const ceilingWait = waitingErr.filter((e) => e.startsWith("budget: this application is waiting")).length;
  const parked = waitingErr.filter((e) => e.startsWith("budget:") && !forCredit(e) && !e.startsWith("budget: this month's programme research") && !e.startsWith("budget: this application is waiting")).length;
  const heldToday = waitingErr.filter((e) => e.startsWith("hold: busy")).length;
  const list = apps ?? [];
  const isAdmin = !!(prof as { is_admin?: boolean } | null)?.is_admin;
  const pending = (approvals ?? []) as Decision[];
  const schoolOf = (a: (typeof list)[number]) => (a.programs as unknown as Prog).schools.name;
  const essaysOf = (a: (typeof list)[number]) => {
    const essays = ((a.artifacts ?? []) as unknown as Art[]).filter((x) => !NOT_ESSAYS.includes(x.kind));
    return { total: essays.length, done: essays.filter((x) => x.artifact_versions.find((v) => v.version === x.current_version)?.user_approved_at).length };
  };
  // stops on our side: the operator has them; the applicant sees "Ivyward on it", not a task
  const view = (a: (typeof list)[number]) => ({ status: a.status, runnerStatus: a.runner_status, reason: (a as { reason?: string | null }).reason ?? null, note: a.runner_note });
  const oursIds = new Set(list.filter((a) => ourSide(view(a))).map((a) => a.id));
  const asks = await openQuestions(auth.user.id).catch(() => []);
  const asked = new Map<string, number>();
  for (const q of asks) if (q.application_id) asked.set(q.application_id, (asked.get(q.application_id) ?? 0) + 1);
  // the one list of what's waiting on the applicant, each with one button
  const waiting: WaitItem[] = waitingList(
    list.map((a) => {
      const e = essaysOf(a);
      return { id: a.id, school: schoolOf(a), status: a.status, runnerStatus: a.runner_status, reason: (a as { reason?: string | null }).reason ?? null, note: a.runner_note, essaysTotal: e.total, essaysApproved: e.done, attested: !!(a as { attested_at?: string | null }).attested_at, fee: (a.programs as unknown as { app_fee_usd?: number | null }).app_fee_usd ?? null, questions: asked.get(a.id) ?? 0 };
    }),
    setupTodo,
  );
  // new drafts on applications that aren't already on the list
  for (const d of drafts ?? []) {
    const a = list.find((x) => x.id === d.application_id);
    if (!a || waiting.some((w) => w.key.endsWith(`:${a.id}`))) continue;
    waiting.push({ key: `draft:${a.id}`, school: schoolOf(a), title: `Read a new draft for ${schoolOf(a)}: ${(d.context as { title?: string })?.title ?? "essay"}`, body: `Ready ${when(d.created_at)}`, href: `/applications/${a.id}#essays`, action: "Read" });
  }
  const waitingIds = new Set(waiting.map((w) => w.key.split(":")[1]));
  const needsCount = pending.length + waiting.length;

  const rows: AppRow[] = list
    .filter((a) => a.status !== "rejected")
    .map((a) => {
      const pr = a.programs as unknown as Prog;
      const essays = ((a.artifacts ?? []) as unknown as Art[]).filter((x) => !NOT_ESSAYS.includes(x.kind));
      const done = essays.filter((x) => x.artifact_versions.find((v) => v.version === x.current_version)?.user_approved_at).length;
      const isStuck = waitingIds.has(a.id) && a.status === "packet_approved";
      return {
        id: a.id,
        school: pr.schools.name,
        program: pr.name,
        status: a.status,
        runner: oursIds.has(a.id) ? "ours" : (a as { resting?: string | null }).resting && a.runner_status === "ready" ? "resting" : a.runner_status,
        deadline: a.target_deadline,
        days: daysUntil(a.target_deadline),
        done,
        total: essays.length,
        group: isStuck || a.status === "ready_for_review" ? "needs" : a.status === "preparing" ? "writing" : a.status === "packet_approved" ? "signed" : "other",
      };
    });

  const next = list.find((a) => (daysUntil(a.target_deadline) ?? -1) >= 0 && ["shortlisted", "preparing", "ready_for_review", "packet_approved"].includes(a.status));
  const nextDays = next ? daysUntil(next.target_deadline) : null;
  // deadlines still to come on the list, and whether they're on google calendar (null: calendar isn't set up here)
  const dated = list.filter((a) => (daysUntil(a.target_deadline) ?? -1) >= 0 && ["shortlisted", "preparing", "ready_for_review", "packet_approved"].includes(a.status)).length;
  const calendar = gcalReady() && dated ? { on: !!(await calendarAccount(user.id).catch(() => null)), dates: dated } : null;
  const calNotice = sp.calendar === "connected" ? `Google Calendar connected. Ivyward is adding your ${Number(sp.dates) > 0 ? `${Number(sp.dates)} ` : ""}dates now, each with reminders a week, two days and a day before.` : sp.calendar === "declined" ? "You cancelled on Google's screen, so nothing was connected." : sp.calendar === "error" || sp.calendar === "expired" ? "Couldn't connect Google Calendar. Try again." : null;
  const count = (sts: string[]) => list.filter((a) => sts.includes(a.status)).length;
  // label, and a one-word form for a phone, where the four sit on one row so "Needs you" stays near the top
  const stats: [typeof Layers, string, string, number, string][] = [
    [Layers, "Programs tracked", "Tracked", list.length, "text-muted"],
    [FilePenLine, "Essays in progress", "Writing", count(["preparing", "ready_for_review"]), "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
    [FileSignature, "Packets signed", "Signed", count(["packet_approved"]), "text-muted"],
    [Send, "Submitted", "Sent", count(["submitted", "under_review", "interview", "waitlisted", "admitted"]), "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"],
  ];

  const snooze = Number((await cookies()).get("iw_nudge_snooze")?.value) || null;
  const payNudge = await dashboardNudge(user.id, snooze).catch(() => null);
  // "Upgrade" on the limit notice opens the payment page itself: a pack where packs are sold, Pro elsewhere
  const payKind: "pack" | "pro" = parked && plan.id === "free" ? ((await billingState(user.id).catch(() => null))?.pricing.model === "pack" ? "pack" : "pro") : "pro";

  return (
    <Stagger className="relative space-y-6">
      {report && (
        <Suspense>
          <WeeklyReportDialog id={report.id} r={report.content as WeeklyReport} created={report.created_at} />
        </Suspense>
      )}
      <CampusInk className="pointer-events-none absolute -top-10 left-1/2 h-[500px] w-screen max-w-none -translate-x-1/2 opacity-60" />
      <Rise>
        <header className="relative mx-auto max-w-2xl pb-4 pt-4 text-center sm:pt-8">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[13px]">
            {needsCount ? (
              <a href="#needs-you" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1 font-medium text-signal shadow-[0_1px_2px_rgb(9_9_11/0.04)] transition-colors hover:border-signal/40">
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {needsCount} {needsCount === 1 ? "thing needs" : "things need"} you
                <ChevronDown className="size-3.5 opacity-70" aria-hidden />
              </a>
            ) : null}
            <ReportButton hasReport={!!report} />
            <span className={`inline-flex items-center gap-2 rounded-full border bg-surface/90 px-3 py-1 shadow-[0_1px_2px_rgb(9_9_11/0.04)] ${paused ? "border-stop/25 text-stop" : "border-line text-muted"}`}>
              <span className={`size-1.5 rounded-full ${paused ? "bg-stop" : working ? "animate-pulse bg-go" : "bg-neutral-400"}`} aria-hidden />
              {paused ? "Agents are paused" : working ? `Agents are on ${working} task${working === 1 ? "" : "s"}` : "Agents are standing by"}
              <span className="h-3 w-px bg-line" aria-hidden />
              <StopButton paused={paused} compact />
            </span>
          </div>
          <h1 className="mt-5 text-[42px] leading-[1.05] sm:text-[60px]">
            {greeting()}
            {first ? `, ${first}` : ""}.
          </h1>
          <p className="mt-3 text-[16px] text-muted">
            {next && nextDays !== null
              ? `${(next.programs as unknown as Prog).schools.name.split(",")[0]} closes ${nextDays === 0 ? "today" : `in ${nextDays} day${nextDays === 1 ? "" : "s"}`}.`
              : "No deadlines coming up yet."}
          </p>
          <div className="mt-8 text-left">
            <AskBox />
          </div>
        </header>
      </Rise>

      {calNotice && (
        <Rise>
          <Notice tone={sp.calendar === "connected" ? "go" : "stop"}>{calNotice}</Notice>
        </Rise>
      )}

      {today && (
        <Rise>
          <TodayCard task={today.task} journey={today.journey} hideJourney />
        </Rise>
      )}

      {today && (
        <Rise>
          <JourneyMap map={today.map} userId={user.id} />
        </Rise>
      )}


      {payNudge && (
        <Rise>
          <NudgeCard angle={payNudge.angle} headline={payNudge.headline} body={payNudge.body} cta={payNudge.cta} kind={payNudge.kind} href={payNudge.href} />
        </Rise>
      )}

      {shortlistRun && (
        <Rise>
          <ShortlistProgress run={shortlistRun.planning ? { ...shortlistRun, regions: p.preferences.regions?.length || 1 } : shortlistRun} />
        </Rise>
      )}

      {(fresh.programs.length > 0 || fresh.awards.length > 0 || (fresh.upcoming > 0 && !shortlistRun)) && (
        <Rise>
          <NewForYou programs={fresh.programs} awards={fresh.awards} upcoming={fresh.upcoming} />
        </Rise>
      )}

      {(paused || !!parked || !!lockedWait || !!researchWait || !!ceilingWait || !!heldToday || !!billing?.length) && (
        <Rise className="space-y-2">
          {paused && <Notice tone="stop">Agents are paused. Nothing runs, sends or submits until you resume. Emails you approved yourself still go out.</Notice>}
          {parked ? (
            <Notice>
              You&apos;ve reached this month&apos;s limit for some agent work. {parked} task{parked > 1 ? "s" : ""} pick up again on the 1st.
              {plan.id === "free" ? (
                <>
                  {" "}
                  <UpgradeLink kind={payKind} />{" "}
                  to continue now.
                </>
              ) : null}
            </Notice>
          ) : null}
          {lockedWait ? (
            <Notice>
              Your free shortlist is ready. For the agents to prepare and submit an application, you need a submission credit:{" "}
              <Link href="/unlock" className="font-semibold underline underline-offset-4">
                buy a pack, or invite a friend
              </Link>{" "}
              and you both get one free.
            </Notice>
          ) : null}
          {researchWait ? <Notice tone="plain">This month&apos;s programme research is done. {researchWait} more programme{researchWait > 1 ? "s are" : " is"} checked next month; your applications carry on.</Notice> : null}
          {ceilingWait ? <Notice tone="plain">One of your applications is waiting for a quick check by the Ivyward team. Nothing is lost; it carries on after.</Notice> : null}
          {heldToday ? <Notice tone="plain">The agents are busy today. {heldToday} task{heldToday > 1 ? "s" : ""} pick up again tomorrow; nothing is lost.</Notice> : null}
          {billing?.length ? <Notice tone="plain">Agents are briefly paused on our side. Your queued work is saved and resumes on its own.</Notice> : null}
        </Rise>
      )}

      <Rise>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            {next && next.target_deadline ? (
              <DeadlineCard
                id={next.id}
                school={(next.programs as unknown as Prog).schools.name}
                program={(next.programs as unknown as Prog).name}
                deadline={next.target_deadline}
                blocker={waiting.find((w) => w.key.endsWith(`:${next.id}`))?.title ?? null}
                calendar={calendar}
              />
            ) : (
              <div className="flex h-full flex-col justify-between rounded-2xl border border-line bg-surface p-6 shadow-card">
                <p className="label-mono">Next deadline</p>
                <div>
                  <p className="mt-6 font-serif text-[26px] leading-tight">Build your shortlist to start the clock.</p>
                  <ButtonLink href="/shortlist" className="mt-5">
                    Open shortlist <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-4 lg:col-span-6">
            {stats.map(([Icon, label, short, n, tone]) => (
              <Link key={label} href="/applications" aria-label={`${label}: ${n}`} className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-3 shadow-card transition-colors hover:border-neutral-300 sm:rounded-2xl sm:p-5 dark:hover:border-neutral-700">
                <span className="flex items-center justify-between">
                  <span className="label-mono hidden sm:inline">{label}</span>
                  <span className="text-[11.5px] font-medium text-muted sm:hidden">{short}</span>
                  <Icon className={`hidden size-4 sm:block ${tone}`} aria-hidden />
                </span>
                <Count value={n} className="mt-2 block font-serif text-[28px] leading-none tabular sm:mt-8 sm:text-[48px]" />
              </Link>
            ))}
          </div>
        </div>
      </Rise>

      {needsCount > 0 && (
        <Rise>
          <Card className="scroll-mt-24 p-5 sm:p-6" id="needs-you">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.02em]">
                Waiting for you
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-signal/12 px-2 text-xs font-bold text-signal tabular">{needsCount}</span>
              </h2>
              {isAdmin && <RetryRunner count={oursIds.size} />}
            </div>
            <div className="space-y-3">
              {waiting.length ? (
                <ul className="divide-y divide-dashed divide-line rounded-2xl border border-line">
                  {waiting.map((w) => (
                    <li key={w.key} className="flex items-center gap-3 p-3.5">
                      {/* the school's tile only where there's room for it */}
                      <span className="hidden shrink-0 sm:block">{w.school ? <SchoolTile name={w.school} size="sm" /> : <span className={`ml-1 block size-2 rounded-full ${w.urgent ? "bg-signal" : "bg-neutral-300 dark:bg-neutral-600"}`} aria-hidden />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold leading-snug">{w.title}</span>
                        {w.body && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted">{w.body}</span>}
                      </span>
                      <ButtonLink href={w.href} size="sm" variant={w.urgent ? "primary" : "secondary"} className="shrink-0">
                        {w.action}
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Decisions items={pending} />
            </div>
          </Card>
        </Rise>
      )}

      <Rise>
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="p-5 sm:p-6 lg:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-[-0.02em]">Your applications</h2>
              <Link href="/applications" className="tap text-[13px] font-bold text-brand hover:underline">
                See all
              </Link>
            </div>
            {rows.length ? (
              <AppList rows={rows} />
            ) : (
              <Empty title="No applications yet" body="Build your shortlist, then prepare the programs you like." action={<ButtonLink href="/shortlist">Open shortlist</ButtonLink>} />
            )}
          </Card>

          <div className="space-y-4 lg:col-span-4">
            <WhatsAppChannel variant="compact" />
            {upcoming.length > 0 && (
              <Card className="p-5 sm:p-6">
                <h2 className="mb-1 text-lg font-bold tracking-[-0.02em]">Coming up</h2>
                <p className="mb-2 text-[12.5px] text-muted">From your schools&apos; emails. Ivyward AI handles these and reminds you.</p>
                <ul>
                  {upcoming.map((f) => {
                    const state = f.status === "working" || f.status === "queued" ? "Agents on it" : f.status === "needs_you" ? "Needs you" : f.result_note ? sentence(f.result_note) : "Done";
                    return (
                      <li key={f.id} className="border-b border-dashed border-line py-3 last:border-0">
                        <a href={f.status === "needs_you" && f.url ? f.url : f.application_id ? `/applications/${f.application_id}` : "/messages"} target={f.status === "needs_you" && f.url ? "_blank" : undefined} rel="noreferrer" className="group block">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 text-[13.5px] font-medium leading-snug group-hover:underline">{f.school ? `${f.school}: ` : ""}{f.title}</span>
                            <span className={`shrink-0 text-[11.5px] font-medium ${f.status === "needs_you" ? "text-signal" : f.status === "done" ? "text-go" : "text-muted"}`}>{state}</span>
                          </span>
                          <span className="mt-0.5 block text-[12px] text-muted">
                            {f.event_start ? <LocalTime iso={f.event_start} /> : f.deadline ? `Due ${new Date(`${f.deadline}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}` : ""}
                            {f.why ? `${f.event_start || f.deadline ? ". " : ""}${f.why}` : ""}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
            <Card className="p-5 sm:p-6">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-[-0.02em]">Agent activity</h2>
                <Link href="/settings" className="text-[13px] font-bold text-brand hover:underline">
                  Autonomy
                </Link>
              </div>
              {events?.length ? (
                <ul>
                  {events.map((e) => {
                    const text = describe(e);
                    if (!text) return null;
                    const who = actorLabel(e.actor);
                    const [Icon, tone] = ACTOR_ICON[who] ?? [Sparkles, "text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"];
                    return (
                      <li key={e.id} className="flex gap-3 border-b border-dashed border-line py-3 last:border-0">
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-medium leading-snug">{sentence(text)}</span>
                          <span className="text-xs text-muted">
                            {who === "you" ? "You" : `${sentence(who)} agent`}, {when(e.created_at)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted">Nothing yet. Activity shows up here as agents work.</p>
              )}
            </Card>

            <Link href="/messages" className="group block rounded-3xl border border-line bg-surface p-5 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift sm:p-6">
              <div className="flex items-center gap-3">
                <span className="bg-hero-gradient relative grid size-11 shrink-0 place-items-center rounded-2xl text-white">
                  <Inbox className="size-5" aria-hidden />
                  {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1 text-[10.5px] font-bold ring-2 ring-surface">{unread}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold tracking-[-0.02em]">Messages</span>
                  <span className="block text-[13px] text-muted">
                    {unread || outgoing?.length || draftMails
                      ? [unread && `${unread} new ${unread === 1 ? "reply" : "replies"}`, outgoing?.length && `${outgoing.length} sending soon`, draftMails && `${draftMails} to review`].filter(Boolean).join(", ")
                      : "Emails to and from your schools"}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
            </Link>
          </div>
        </div>
      </Rise>
    </Stagger>
  );
}
