import { QuestionsCard } from "@/components/questions/questions-card";
import { toAsk } from "@/lib/ask";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Mail } from "lucide-react";
import { StatusPill, daysUntil } from "@/components/ui/status";
import { Empty, Notice, Section } from "@/components/ui/page";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { EssayTabs, type EssayData } from "./essay-editor";
import { AngleCard } from "./angle";
import { AutoRefresh } from "../../shortlist/controls";
import { PrepareButton } from "./prepare-button";
import { Milestones } from "./milestones";
import { admin } from "@/lib/supabase/admin";
import { RunnerPanel } from "./runner-panel";
import { DeleteApplication } from "./delete-application";
import { PayToSubmit } from "@/components/billing/pay";
import { confirmReturn, paymentNeeded } from "@/lib/billing";
import { loadSheet } from "@/lib/runner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Application" };

const JOURNEY = ["Plan", "Essays", "Sign", "Submit", "Decision"];
const JOURNEY_STEP: Record<string, number> = {
  shortlisted: 0,
  preparing: 1,
  ready_for_review: 1,
  packet_approved: 3,
  submitted: 4,
  under_review: 4,
  interview: 4,
  waitlisted: 4,
  admitted: 5,
  rejected: 5,
};

interface Version {
  id: string;
  version: number;
  content: string;
  author: string;
  critique: Record<string, unknown> | null;
  user_approved_at: string | null;
  created_at: string;
}
interface Art {
  id: string;
  kind: string;
  title: string;
  prompt: string | null;
  word_limit: number | null;
  current_version: number;
  artifact_versions: Version[];
}

export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pay?: string; paid?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { id } = await params;
  const sp = await searchParams;
  // back from paying for this submission: confirm with Bachs now (the agents restart on it)
  if (sp.paid) await confirmReturn(auth.user.id, sp.paid).catch(() => null);
  const [{ data: app }, { data: jobs }, { data: threads }, { count: logins }, { data: asked }] = await Promise.all([
    auth.sb
      .from("applications")
      .select("id, status, target_deadline, angle, portal_url, attested_at, runner_status, runner_note, runner_updated_at, runner_live_url, runner_state, runner_mode, programs(name, degree, url, app_fee_usd, schools(name, country)), artifacts(id, kind, title, prompt, word_limit, current_version, artifact_versions(id, version, content, author, critique, user_approved_at, created_at))")
      .eq("id", id)
      .maybeSingle(),
    auth.sb.from("jobs").select("agent, status, payload").in("agent", ["strategist", "writer", "redteam", "closer"]).in("status", ["queued", "running"]),
    auth.sb.from("threads").select("id, subject, messages(id, direction, subject, status, created_at, sent_at)").eq("application_id", id).order("created_at"),
    admin().from("portal_accounts").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).eq("application_id", id),
    // portal questions this application is waiting on (missing table before its migration: none)
    admin().from("portal_questions").select("id, question, options, field_type").eq("user_id", auth.user.id).eq("application_id", id).eq("status", "open").order("created_at"),
  ]);
  if (!app) notFound();
  const sheet = app.status === "packet_approved" ? await loadSheet(auth.user.id, id).catch(() => null) : null;
  const pay = app.status === "packet_approved" ? await paymentNeeded(auth.user.id, id).catch(() => null) : null;
  const p = app.programs as unknown as { name: string; degree: string; url: string | null; app_fee_usd: number | null; schools: { name: string; country: string | null } };
  const arts = (app.artifacts ?? []) as unknown as Art[];
  const brief = arts.find((a) => a.kind === "strategy");
  const briefText = brief?.artifact_versions.find((v) => v.version === brief.current_version)?.content;
  const NOT_ESSAYS = new Set(["strategy", "fee_plan", "funding_plan"]);
  const essays = arts.filter((a) => !NOT_ESSAYS.has(a.kind)).sort((a, b) => a.title.localeCompare(b.title));
  const busy = (jobs ?? []).filter((j) => {
    const pl = (j.payload ?? {}) as { applicationId?: string; artifactId?: string; versionId?: string };
    return pl.applicationId === id || essays.some((e) => e.id === pl.artifactId || e.artifact_versions.some((v) => v.id === pl.versionId));
  });

  const planText = (kind: string) => {
    const a = arts.find((x) => x.kind === kind);
    return a?.artifact_versions.find((v) => v.version === a.current_version)?.content ?? null;
  };
  const feePlan = planText("fee_plan");
  const fundingPlan = planText("funding_plan");
  // emails live in Messages; here, only how this school's conversation stands
  type Mini = { id: string; direction: "in" | "out"; subject: string | null; status: string; created_at: string; sent_at: string | null };
  const convos = ((threads ?? []) as unknown as { id: string; subject: string | null; messages: Mini[] }[])
    .map((t) => ({ ...t, messages: t.messages.filter((m) => m.status !== "cancelled").sort((a, b) => (a.sent_at ?? a.created_at).localeCompare(b.sent_at ?? b.created_at)) }))
    .filter((t) => t.messages.length)
    .sort((a, b) => (b.messages.at(-1)!.sent_at ?? b.messages.at(-1)!.created_at).localeCompare(a.messages.at(-1)!.sent_at ?? a.messages.at(-1)!.created_at));
  const allMsgs = convos.flatMap((t) => t.messages);
  const mailStats = {
    sent: allMsgs.filter((m) => m.direction === "out" && m.status === "sent").length,
    replies: allMsgs.filter((m) => m.direction === "in").length,
    drafts: allMsgs.filter((m) => m.direction === "out" && ["draft", "pending_approval", "failed"].includes(m.status)).length,
    sending: allMsgs.filter((m) => m.status === "scheduled").length,
  };

  const essayData: EssayData[] = essays.map((e) => {
    const cur = e.artifact_versions.find((v) => v.version === e.current_version) ?? null;
    return {
      id: e.id,
      title: e.title,
      kind: e.kind,
      prompt: e.prompt,
      wordLimit: e.word_limit,
      version: e.current_version,
      content: cur?.content ?? "",
      author: cur?.author ?? "",
      critique: (cur?.critique ?? null) as EssayData["critique"],
      approved: !!cur?.user_approved_at,
      versions: e.artifact_versions.length,
      working: busy.some((j) => {
        const pl = (j.payload ?? {}) as { artifactId?: string; versionId?: string };
        return pl.artifactId === e.id || e.artifact_versions.some((v) => v.id === pl.versionId);
      }),
    };
  });

  const step = JOURNEY_STEP[app.status] ?? 0;
  const days = daysUntil(app.target_deadline);
  const strategizing = busy.some((j) => j.agent === "strategist");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {busy.length > 0 && <AutoRefresh every={15000} />}
      <header className="space-y-3">
        <Link href="/applications" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden />
          Applications
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {p.degree === "Scholarship" && <p className="label-mono mb-2 !text-brand">Scholarship application</p>}
            <h1 className="text-[26px] font-bold leading-tight tracking-[-0.04em] sm:text-[30px]">{p.degree === "Scholarship" ? p.name : p.schools.name}</h1>
            <p className="mt-2 text-[15px] text-muted">
              {p.degree === "Scholarship" ? (
                <>Awarded by {p.schools.name}</>
              ) : (
                <>
                  {p.name}
                  {p.degree && !p.name.toLowerCase().includes(p.degree.toLowerCase()) ? `, ${p.degree}` : ""}
                  {p.schools.country ? ` in ${p.schools.country}` : ""}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={app.status} runner={app.runner_status === "idle" && ((app as { runner_state?: { paused?: boolean } }).runner_state ?? {}).paused ? "paused" : app.runner_status} />
            {["shortlisted", "preparing", "ready_for_review"].includes(app.status) && <PrepareButton id={id} replan={!!brief} busy={strategizing} size="sm" />}
            <DeleteApplication id={id} school={p.degree === "Scholarship" ? p.name : p.schools.name} status={app.status} />
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Deadline</dt>
            <dd className={`font-medium tabular ${days !== null && days >= 0 && days <= 7 && step < 3 ? "text-stop" : ""}`}>
              {app.target_deadline ? new Date(app.target_deadline + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Not found yet"}
              {days !== null && days >= 0 ? <span className="font-normal text-muted"> ({days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} left`})</span> : null}
            </dd>
          </div>
          {p.app_fee_usd != null && (
            <div>
              <dt className="text-xs text-muted">Application fee</dt>
              <dd className="font-medium tabular">{p.app_fee_usd ? `$${p.app_fee_usd}` : "None"}</dd>
            </div>
          )}
          {p.url && (
            <div>
              <dt className="text-xs text-muted">Program</dt>
              <dd>
                <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
                  Program page <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </dd>
            </div>
          )}
        </dl>
        <ol className="grid grid-cols-5 gap-1.5" aria-label="Application progress">
          {JOURNEY.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <span className={`block h-1.5 rounded-full ${i < step ? "bg-bar-gradient" : i === step ? "bg-accent/35 animate-pulse" : "bg-neutral-200 dark:bg-neutral-800"}`} />
              <span className={`mt-1.5 block text-xs ${i === step ? "font-semibold text-foreground" : i < step ? "text-foreground" : "text-muted"}`}>{label}</span>
            </li>
          ))}
        </ol>
      </header>

      {busy.length > 0 && (
        <Notice tone="plain">
          <span className="flex items-start gap-2">
            <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
            <span>
              {strategizing
                ? "The strategist is reading the program's application pages and planning your angle."
                : `The writer and reviewer are working on ${new Set(busy.map((j) => j.agent)).size > 1 ? "drafts" : "a draft"}. Each draft goes through up to 3 rounds before it reaches you.`}{" "}
              This page updates on its own.
            </span>
          </span>
        </Notice>
      )}

      <Milestones
        id={id}
        status={app.status}
        essaysTotal={essayData.filter((e) => e.kind !== "video_or_interview").length}
        essaysApproved={essayData.filter((e) => e.kind !== "video_or_interview" && e.approved).length}
      />

      {pay && pay.kind !== "request" && <PayToSubmit applicationId={id} kind={pay.kind} label={pay.label} school={p.degree === "Scholarship" ? p.name : p.schools.name} highlight={!!sp.pay} note={pay.note.replace(/^ready to submit: /, "")} />}

      {["packet_approved", "submitted"].includes(app.status) && (
        <RunnerPanel
          id={id}
          status={app.status}
          runnerStatus={app.runner_status}
          note={app.runner_note}
          portalUrl={app.portal_url ?? p.url}
          fee={p.app_fee_usd}
          attested={!!app.attested_at}
          liveUrl={app.runner_live_url}
          hasLogin={!!logins}
          missing={sheet?.missing ?? []}
          reason={((app as { runner_state?: { reason?: string } }).runner_state ?? {}).reason ?? null}
          mode={(app as { runner_mode?: string }).runner_mode ?? "cloud"}
          paused={app.runner_status === "idle" && !!((app as { runner_state?: { paused?: boolean } }).runner_state ?? {}).paused}
          school={p.schools.name}
          questions={(asked ?? []).map((q) => q.question as string)}
        />
      )}

      {(asked ?? []).length > 0 && (
        <QuestionsCard
          title={`${p.schools.name} is asking`}
          questions={(asked ?? []).map((q) => toAsk({ id: q.id as string, question: q.question as string, options: (q.options as string[]) ?? [], field_type: q.field_type as string | null, school: p.schools.name, application_id: id }))}
        />
      )}

      {briefText && <AngleCard angle={(app as { angle?: string | null }).angle ?? null} brief={briefText} school={p.schools.name} />}

      {(essayData.length > 0 || !busy.length) && (
        <Section
          title="Essays and answers"
          description={
            essayData.length ? (
              <>Drafts are a starting point: make them your own words, then approve. Approving means &ldquo;this is mine and every fact in it is true.&rdquo;</>
            ) : undefined
          }
        >
          {essayData.length ? (
            <EssayTabs essays={essayData} />
          ) : (
            <Empty
              title="No essays yet"
              body="Prepare this application and the strategist finds out what it asks for: essays, short answers, documents."
              action={<PrepareButton id={id} replan={false} busy={strategizing} />}
            />
          )}
        </Section>
      )}

      {convos.length > 0 && (
        <Link href={`/messages?t=${convos[0].id}`} className="group flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift">
          <span className="bg-hero-gradient grid size-11 shrink-0 place-items-center rounded-2xl text-white">
            <Mail className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Emails with {p.schools.name.split(",")[0]}</span>
            <span className="block truncate text-[13px] text-muted">Latest: {convos[0].subject ?? convos[0].messages.at(-1)!.subject ?? "(no subject)"}</span>
          </span>
          <span className="flex flex-wrap gap-1.5 text-[11.5px] font-bold">
            {mailStats.sent > 0 && <span className="rounded-lg bg-accent/10 px-2 py-1 text-accent">{mailStats.sent} sent</span>}
            {mailStats.replies > 0 && <span className="rounded-lg bg-go/10 px-2 py-1 text-go">{mailStats.replies} {mailStats.replies === 1 ? "reply" : "replies"}</span>}
            {mailStats.drafts > 0 && <span className="rounded-lg bg-neutral-100 px-2 py-1 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{mailStats.drafts} to review</span>}
            {mailStats.sending > 0 && <span className="rounded-lg bg-neutral-100 px-2 py-1 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{mailStats.sending} sending</span>}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-accent">
            Open in Messages <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      )}

      {(feePlan || fundingPlan) && (
        <Section title="Fees and funding" description="Plans from the funding agent. Any emails it drafts wait for you in Messages.">
          {([["Funding plan after admission", fundingPlan], ["Application fee", feePlan]] as [string, string | null][]).map(([title, text]) =>
            text ? (
              <details key={title} className="group rounded-3xl border border-line bg-surface shadow-card" open={title.startsWith("Funding")}>
                <summary className="flex cursor-pointer select-none items-center justify-between px-5 py-4 font-medium">
                  {title}
                  <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="whitespace-pre-wrap border-t border-line px-5 py-4 text-sm leading-relaxed">{text}</div>
              </details>
            ) : null,
          )}
        </Section>
      )}
    </div>
  );
}
