import Link from "next/link";
import { ChevronDown, ChevronLeft, ExternalLink, LoaderCircle } from "lucide-react";
import { StatusPill, daysUntil } from "@/components/ui/status";
import { Empty, Notice, Section } from "@/components/ui/page";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { EssayEditor, type EssayData } from "./essay-editor";
import { AutoRefresh } from "../../shortlist/controls";
import { PrepareButton } from "./prepare-button";
import { Milestones } from "./milestones";
import { OutreachDraft, type Draft } from "./outreach";
import { admin } from "@/lib/supabase/admin";
import { gmailConfigured } from "@/lib/gmail";
import { RunnerPanel } from "./runner-panel";
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

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { id } = await params;
  const [{ data: app }, { data: jobs }, { data: threads }, { data: mailAcct }, { count: logins }] = await Promise.all([
    auth.sb
      .from("applications")
      .select("id, status, target_deadline, angle, portal_url, attested_at, runner_status, runner_note, runner_updated_at, runner_live_url, programs(name, degree, url, app_fee_usd, schools(name, country)), artifacts(id, kind, title, prompt, word_limit, current_version, artifact_versions(id, version, content, author, critique, user_approved_at, created_at))")
      .eq("id", id)
      .maybeSingle(),
    auth.sb.from("jobs").select("agent, status, payload").in("agent", ["strategist", "writer", "redteam", "closer"]).in("status", ["queued", "running"]),
    auth.sb.from("threads").select("id, messages(id, purpose, to_email, subject, body, status, created_at, send_after, last_error)").eq("application_id", id).order("created_at"),
    admin().from("mail_accounts").select("email, status").eq("user_id", auth.user.id).maybeSingle(),
    admin().from("portal_accounts").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).eq("application_id", id),
  ]);
  const mail = gmailConfigured() && mailAcct?.status === "active" ? mailAcct.email : null;
  if (!app) notFound();
  const sheet = app.status === "packet_approved" ? await loadSheet(auth.user.id, id).catch(() => null) : null;
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
  const drafts = ((threads ?? []) as unknown as { messages: (Draft & { created_at: string })[] }[])
    .flatMap((t) => t.messages)
    .filter((m) => m.status !== "cancelled")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

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
      <header className="space-y-4">
        <Link href="/applications" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden />
          Applications
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-tight sm:text-5xl">{p.schools.name}</h1>
            <p className="mt-2 text-[15px] text-muted">
              {p.name}
              {p.degree && !p.name.toLowerCase().includes(p.degree.toLowerCase()) ? `, ${p.degree}` : ""}
              {p.schools.country ? ` in ${p.schools.country}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={app.status} runner={app.runner_status} />
            {["shortlisted", "preparing", "ready_for_review"].includes(app.status) && <PrepareButton id={id} replan={!!brief} busy={strategizing} size="sm" />}
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
              <span className={`block h-1 rounded-full ${i < step ? "bg-foreground" : i === step ? "bg-signal" : "bg-neutral-200 dark:bg-neutral-800"}`} />
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
        />
      )}

      {briefText && (
        <details className="group rounded-3xl border border-line bg-surface shadow-card">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-5 py-4 font-medium">
            <span>
              Your angle for this school
              <span className="block text-sm font-normal text-muted">The strategist&apos;s brief that the writer works from</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="whitespace-pre-wrap border-t border-line px-5 py-4 text-sm leading-relaxed">{briefText}</div>
        </details>
      )}

      {(essayData.length > 0 || !busy.length) && (
        <Section
          title="Essays and answers"
          description={
            essayData.length ? (
              <>
                Drafts are a starting point. Many schools ask you to certify your essays are your own work, and some ban AI-written ones. Rewrite in your own words, then approve. Approving means
                &ldquo;this is mine and every fact in it is true.&rdquo;
              </>
            ) : undefined
          }
        >
          {essayData.length ? (
            <div className="space-y-5">{essayData.map((e) => <EssayEditor key={`${e.id}:${e.version}`} e={e} />)}</div>
          ) : (
            <Empty
              title="No essays yet"
              body="Prepare this application and the strategist finds out what it asks for: essays, short answers, documents."
              action={<PrepareButton id={id} replan={false} busy={strategizing} />}
            />
          )}
        </Section>
      )}

      {(feePlan || fundingPlan || drafts.length > 0) && (
        <Section title="Fees and funding" description="Plans and emails from the funding agent. Nothing sends without your approval.">
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
          {drafts.map((d) => <OutreachDraft key={`${d.id}:${d.status}`} d={d} mail={mail} />)}
        </Section>
      )}
    </div>
  );
}
