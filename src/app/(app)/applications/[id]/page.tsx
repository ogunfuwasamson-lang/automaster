import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { EssayEditor, type EssayData } from "./essay-editor";
import { AutoRefresh } from "../../shortlist/controls";
import { PrepareButton } from "./prepare-button";

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
  const [{ data: app }, { data: jobs }] = await Promise.all([
    auth.sb
      .from("applications")
      .select("id, status, target_deadline, angle, programs(name, degree, url, schools(name, country)), artifacts(id, kind, title, prompt, word_limit, current_version, artifact_versions(id, version, content, author, critique, user_approved_at, created_at))")
      .eq("id", id)
      .maybeSingle(),
    auth.sb.from("jobs").select("agent, status, payload").in("agent", ["strategist", "writer", "redteam"]).in("status", ["queued", "running"]),
  ]);
  if (!app) notFound();
  const p = app.programs as unknown as { name: string; degree: string; url: string | null; schools: { name: string; country: string | null } };
  const arts = (app.artifacts ?? []) as unknown as Art[];
  const brief = arts.find((a) => a.kind === "strategy");
  const briefText = brief?.artifact_versions.find((v) => v.version === brief.current_version)?.content;
  const essays = arts.filter((a) => a.kind !== "strategy").sort((a, b) => a.title.localeCompare(b.title));
  const busy = (jobs ?? []).filter((j) => {
    const pl = (j.payload ?? {}) as { applicationId?: string; artifactId?: string; versionId?: string };
    return pl.applicationId === id || essays.some((e) => e.id === pl.artifactId || e.artifact_versions.some((v) => v.id === pl.versionId));
  });

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

      {briefText && (
        <details className="rounded-md border border-neutral-200 dark:border-neutral-800">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">positioning brief</summary>
          <div className="whitespace-pre-wrap border-t border-neutral-200 px-4 py-3 text-sm leading-relaxed dark:border-neutral-800">{briefText}</div>
        </details>
      )}

      <section className="space-y-6">
        {essayData.map((e) => <EssayEditor key={`${e.id}:${e.version}`} e={e} />)}
        {!essays.length && !busy.length && <p className="text-sm text-neutral-500">no essays yet. click &quot;prepare&quot; to have the strategist find what this application asks for.</p>}
      </section>
    </main>
  );
}
