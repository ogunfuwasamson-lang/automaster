import Link from "next/link";
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
  const [{ data: app }, { data: jobs }, { data: threads }, { data: mailAcct }] = await Promise.all([
    auth.sb
      .from("applications")
      .select("id, status, target_deadline, angle, portal_url, attested_at, runner_status, runner_note, runner_updated_at, programs(name, degree, url, app_fee_usd, schools(name, country)), artifacts(id, kind, title, prompt, word_limit, current_version, artifact_versions(id, version, content, author, critique, user_approved_at, created_at))")
      .eq("id", id)
      .maybeSingle(),
    auth.sb.from("jobs").select("agent, status, payload").in("agent", ["strategist", "writer", "redteam", "closer"]).in("status", ["queued", "running"]),
    auth.sb.from("threads").select("id, messages(id, purpose, to_email, subject, body, status, created_at, send_after, last_error)").eq("application_id", id).order("created_at"),
    admin().from("mail_accounts").select("email, status").eq("user_id", auth.user.id).maybeSingle(),
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

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      {busy.length > 0 && <AutoRefresh every={15000} />}
      <header className="space-y-1">
        <Link href="/applications" className="text-sm text-neutral-500 underline">applications</Link>
        <h1 className="text-2xl font-semibold tracking-tight">{p.schools.name}</h1>
        <p className="text-sm text-neutral-500">
          {p.name} · {p.degree}{p.schools.country ? ` · ${p.schools.country}` : ""}{app.target_deadline ? ` · due ${app.target_deadline}` : ""}
          {p.url && <> · <a href={p.url} target="_blank" rel="noreferrer" className="underline">program page</a></>}
        </p>
        <div className="pt-2"><PrepareButton id={id} replan={!!brief} busy={busy.some((j) => j.agent === "strategist")} /></div>
      </header>

      {busy.length > 0 && (
        <p className="rounded-md border border-neutral-200 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          {busy.some((j) => j.agent === "strategist") ? "the strategist is reading the program's application pages and planning your angle…" : `the writer and red team are working on ${new Set(busy.map((j) => j.agent)).size > 1 ? "drafts" : "a draft"}. drafts go through up to 3 rounds before they reach you.`} this page updates on its own.
        </p>
      )}

      <p className="rounded-md border border-amber-300 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        these drafts are a starting point. many schools ask you to certify that your essays are your own work, and some ban ai-written essays. rewrite them in your own words before you approve. approving means &quot;this is mine and every fact in it is true&quot;.
      </p>

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
          missing={sheet?.missing ?? []}
        />
      )}

      {briefText && (
        <details className="rounded-md border border-neutral-200 dark:border-neutral-800">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">positioning brief</summary>
          <div className="whitespace-pre-wrap border-t border-neutral-200 px-4 py-3 text-sm leading-relaxed dark:border-neutral-800">{briefText}</div>
        </details>
      )}

      {(feePlan || fundingPlan || drafts.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">money: fees and funding</h2>
          {([["funding plan (after admission)", fundingPlan], ["application fee", feePlan]] as [string, string | null][]).map(([title, text]) =>
            text ? (
              <details key={title} className="rounded-md border border-neutral-200 dark:border-neutral-800" open={title.startsWith("funding")}>
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{title}</summary>
                <div className="whitespace-pre-wrap border-t border-neutral-200 px-4 py-3 text-sm leading-relaxed dark:border-neutral-800">{text}</div>
              </details>
            ) : null,
          )}
          {drafts.map((d) => <OutreachDraft key={`${d.id}:${d.status}`} d={d} mail={mail} />)}
        </section>
      )}

      <section className="space-y-6">
        {essayData.map((e) => <EssayEditor key={`${e.id}:${e.version}`} e={e} />)}
        {!essays.length && !busy.length && <p className="text-sm text-neutral-500">no essays yet. click &quot;prepare&quot; to have the strategist find what this application asks for.</p>}
      </section>
    </main>
  );
}
