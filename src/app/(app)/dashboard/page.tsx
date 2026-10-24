import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Compass,
  FilePenLine,
  FileSignature,
  Globe,
  Inbox,
  Layers,
  Mail,
  PenLine,
  Plus,
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
import { AppList, SchoolTile, type AppRow } from "@/components/home/app-list";
import { StopButton, RetryRunner } from "./controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

type Prog = { name: string; schools: { name: string; country: string | null } };
type Art = { kind: string; current_version: number; artifact_versions: { version: number; user_approved_at: string | null }[] };
const NOT_ESSAYS = ["strategy", "fee_plan", "funding_plan", "video_or_interview"];

const ACTOR_ICON: Record<string, [typeof Mail, string]> = {
  inbox: [Mail, "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300"],
  writer: [PenLine, "text-pink-600 bg-pink-50 dark:bg-pink-500/15 dark:text-pink-300"],
  redteam: [ShieldCheck, "text-violet-600 bg-violet-50 dark:bg-violet-500/15 dark:text-violet-300"],
  runner: [Globe, "text-cyan-700 bg-cyan-50 dark:bg-cyan-500/15 dark:text-cyan-300"],
  recon: [Search, "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300"],
  strategist: [Compass, "text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300"],
  closer: [Banknote, "text-teal-600 bg-teal-50 dark:bg-teal-500/15 dark:text-teal-300"],
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

function greeting() {
  // the server runs in UTC; most applicants are a few hours either side, so keep it broad
  const h = new Date().getUTCHours() + 1;
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
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
    { count: draftMails },
    { data: events },
    { data: cords },
    { count: parked },
    { data: billing },
    { count: working },
  ] = await Promise.all([
    sb.from("profiles").select("profile").single(),
    sb.from("documents").select("id", { count: "exact", head: true }),
    sb.from("approvals").select("id, title, kind, summary, payload").eq("status", "pending").order("urgency", { ascending: false }).limit(12),
    sb
      .from("applications")
      .select("id, status, target_deadline, runner_status, runner_note, programs(name, schools(name, country)), artifacts(kind, current_version, artifact_versions(version, user_approved_at))")
      .not("status", "in", "(researching,dropped,withdrawn)")
      .order("target_deadline", { ascending: true, nullsFirst: false }),
    sb.from("events").select("id, application_id, context, created_at").eq("action", "artifact.ready_for_user").order("created_at", { ascending: false }).limit(4),
    sb.from("messages").select("id, subject, to_email, send_after").eq("status", "scheduled").order("send_after"),
    sb.from("messages").select("id", { count: "exact", head: true }).eq("direction", "out").in("status", ["draft", "pending_approval", "failed"]),
    sb.from("events").select("id, actor, action, created_at, context").not("action", "like", "guard.%").order("created_at", { ascending: false }).limit(8),
    sb.from("ripcords").select("id").eq("active", true).eq("scope_kind", "all").limit(1),
    sb.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued").ilike("last_error", "budget:%"),
    sb.from("jobs").select("id").eq("status", "queued").ilike("last_error", "%credit balance%").limit(1),
    sb.from("jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
  ]);

  const unreadQ = await sb.from("messages").select("id", { count: "exact", head: true }).eq("direction", "in").is("read_at", null);
  const unread = unreadQ.error ? 0 : (unreadQ.count ?? 0);
  const p = loadProfile(prof?.profile);
  if (!p.goals.study_level && !docCount && !apps?.length) redirect("/onboarding");

  const first = p.identity.full_name?.split(" ")[0];
  const paused = !!cords?.length;
  const list = apps ?? [];
  const stuck = list.filter((a) => a.status === "packet_approved" && (a.runner_status === "needs_you" || a.runner_status === "failed"));
  const pending = (approvals ?? []) as Decision[];
  const needsCount = pending.length + stuck.length + (drafts?.length ?? 0);

  const rows: AppRow[] = list
    .filter((a) => a.status !== "rejected")
    .map((a) => {
      const pr = a.programs as unknown as Prog;
      const essays = ((a.artifacts ?? []) as unknown as Art[]).filter((x) => !NOT_ESSAYS.includes(x.kind));
      const done = essays.filter((x) => x.artifact_versions.find((v) => v.version === x.current_version)?.user_approved_at).length;
      const isStuck = stuck.some((s) => s.id === a.id);
      return {
        id: a.id,
        school: pr.schools.name,
        program: pr.name,
        status: a.status,
        runner: a.runner_status,
        deadline: a.target_deadline,
        days: daysUntil(a.target_deadline),
        done,
        total: essays.length,
        group: isStuck || a.status === "ready_for_review" ? "needs" : a.status === "preparing" ? "writing" : a.status === "packet_approved" ? "signed" : "other",
      };
    });

  const next = list.find((a) => (daysUntil(a.target_deadline) ?? -1) >= 0 && ["shortlisted", "preparing", "ready_for_review", "packet_approved"].includes(a.status));
  const nextDays = next ? daysUntil(next.target_deadline) : null;
  const count = (sts: string[]) => list.filter((a) => sts.includes(a.status)).length;
  const stats: [typeof Layers, string, number, string][] = [
    [Layers, "Programs tracked", list.length, "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300"],
    [FilePenLine, "Essays in progress", count(["preparing", "ready_for_review"]), "text-pink-600 bg-pink-50 dark:bg-pink-500/15 dark:text-pink-300"],
    [FileSignature, "Packets signed", count(["packet_approved"]), "text-cyan-700 bg-cyan-50 dark:bg-cyan-500/15 dark:text-cyan-300"],
    [Send, "Submitted", count(["submitted", "under_review", "interview", "waitlisted", "admitted"]), "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300"],
  ];

  return (
    <Stagger className="space-y-6">
      <Rise>
        <header className="flex flex-wrap items-end justify-between gap-5 pb-2">
          <div>
            <span className="glass inline-flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-[12.5px] font-semibold shadow-card">
              {paused ? (
                <span className="rounded-full bg-stop px-2 py-0.5 text-[11px] font-bold text-white">Paused</span>
              ) : (
                <span className="bg-accent-gradient rounded-full px-2 py-0.5 text-[11px] font-bold text-white">Live</span>
              )}
              {paused ? "Agents are paused" : working ? `Agents are on ${working} task${working === 1 ? "" : "s"} right now` : "Agents are standing by"}
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-[46px]">
              {greeting()}
              {first ? `, ${first}` : ""}.
              <br />
              {needsCount ? (
                <>
                  <span className="text-gradient">
                    {needsCount} {needsCount === 1 ? "thing" : "things"}
                  </span>{" "}
                  {needsCount === 1 ? "needs" : "need"} you.
                </>
              ) : (
                <span className="text-gradient">You&apos;re all caught up.</span>
              )}
            </h1>
            <p className="mt-3 text-base text-muted">
              {next && nextDays !== null
                ? `${(next.programs as unknown as Prog).schools.name.split(",")[0]} closes ${nextDays === 0 ? "today" : `in ${nextDays} day${nextDays === 1 ? "" : "s"}`}.`
                : "No deadlines coming up yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StopButton paused={paused} />
            <ButtonLink href="/shortlist">
              <Plus className="size-4" aria-hidden /> Add a program
            </ButtonLink>
          </div>
        </header>
      </Rise>

      {(paused || !!parked || !!billing?.length) && (
        <Rise className="space-y-2">
          {paused && <Notice tone="stop">Agents are paused. Nothing runs, sends or submits until you resume. Emails you approved yourself still go out.</Notice>}
          {parked ? (
            <Notice>
              You&apos;ve reached this month&apos;s limit for some agent work. {parked} task{parked > 1 ? "s" : ""} pick up again on the 1st.
              {plan.id === "free" ? (
                <>
                  {" "}
                  <Link href="/pricing" className="font-semibold underline underline-offset-4">
                    Upgrade
                  </Link>{" "}
                  to continue now.
                </>
              ) : null}
            </Notice>
          ) : null}
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
                blocker={stuck.find((s) => s.id === next.id)?.runner_note ? sentence(stuck.find((s) => s.id === next.id)!.runner_note).split(". ")[0] : null}
              />
            ) : (
              <div className="bg-hero-gradient flex h-full flex-col justify-between rounded-3xl p-6 text-white shadow-[0_24px_48px_-20px_rgb(79_70_229/0.65)]">
                <p className="text-[13px] font-semibold text-white/80">Next deadline</p>
                <div>
                  <p className="mt-6 text-2xl font-bold tracking-[-0.02em]">Build your shortlist to start the clock.</p>
                  <Link href="/shortlist" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0f1222]">
                    Open shortlist <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 lg:col-span-6">
            {stats.map(([Icon, label, n, tone]) => (
              <Link key={label} href="/applications" className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <Count value={n} className="mt-6 block text-[34px] font-bold leading-none tracking-[-0.045em]" />
                <span className="mt-1.5 text-[12.5px] font-semibold text-muted">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </Rise>

      {needsCount > 0 && (
        <Rise>
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.02em]">
                Needs you
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-signal/12 px-2 text-xs font-bold text-signal tabular">{needsCount}</span>
              </h2>
              <RetryRunner count={stuck.length} />
            </div>
            <div className="space-y-3">
              {stuck.length ? (
                <ul className="grid gap-2 md:grid-cols-2">
                  {stuck.map((a) => {
                    const pr = a.programs as unknown as Prog;
                    return (
                      <li key={a.id}>
                        <Link href={`/applications/${a.id}`} className="group flex h-full items-start gap-3 rounded-2xl border border-line p-3.5 transition-colors hover:border-signal/40 hover:bg-signal/[0.04]">
                          <SchoolTile name={pr.schools.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{pr.schools.name}</span>
                            <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{sentence(a.runner_note)}</span>
                          </span>
                          <ArrowRight className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <Decisions items={pending} />
              {drafts?.length ? (
                <ul className="grid gap-2 md:grid-cols-2">
                  {drafts.map((d) => (
                    <li key={d.id}>
                      <Link href={`/applications/${d.application_id}`} className="group flex items-center gap-3 rounded-2xl border border-line p-3.5 transition-colors hover:border-accent/40 hover:bg-accent/[0.04]">
                        <span className="grid size-9 place-items-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                          <PenLine className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">Review a draft: {(d.context as { title?: string })?.title ?? "essay"}</span>
                          <span className="text-[12.5px] text-muted">Ready {when(d.created_at)}</span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Card>
        </Rise>
      )}


      <Rise>
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="p-5 sm:p-6 lg:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-[-0.02em]">Your applications</h2>
              <Link href="/applications" className="text-[13px] font-bold text-accent hover:underline">
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
            <Card className="p-5 sm:p-6">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-[-0.02em]">Agent activity</h2>
                <Link href="/settings" className="text-[13px] font-bold text-accent hover:underline">
                  Autonomy
                </Link>
              </div>
              {events?.length ? (
                <ul>
                  {events.map((e) => {
                    const text = describe(e);
                    if (!text) return null;
                    const who = actorLabel(e.actor);
                    const [Icon, tone] = ACTOR_ICON[who] ?? [Sparkles, "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300"];
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
