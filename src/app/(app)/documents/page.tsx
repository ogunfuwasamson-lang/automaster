import { requireUser } from "@/lib/supabase/server";
import { Uploader } from "./uploader";
import { RetryButton } from "./retry-button";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  uploaded: "queued",
  extracting: "reading…",
  extracted: "done",
  failed: "failed",
};

export default async function Documents() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data: docs } = await auth.sb
    .from("documents")
    .select("id, kind, filename, status, extracted, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">documents</h1>
        <p className="mt-1 text-sm text-neutral-500">
          upload once. CV, transcripts, degree certificate, test scores, old essays. pdf, docx, images or text, 10MB max.
          don&apos;t upload your passport; nothing needs it yet.
        </p>
      </header>

      <Uploader userId={auth.user.id} />

      <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {docs?.length ? (
          docs.map((d) => {
            const ex = (d.extracted ?? {}) as { summary?: string; issues?: string[]; error?: string };
            return (
              <li key={d.id} className="space-y-1 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{d.filename}</span>
                  <span className={`shrink-0 text-xs ${d.status === "failed" ? "text-red-600" : d.status === "extracted" ? "text-green-600" : "text-neutral-500"}`}>
                    {STATUS[d.status] ?? d.status}
                  </span>
                </div>
                {ex.summary && <p className="text-neutral-500">{ex.summary}</p>}
                {ex.issues?.length ? (
                  <ul className="list-disc pl-5 text-amber-700 dark:text-amber-400">
                    {ex.issues.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                ) : null}
                {d.status === "failed" && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-red-600">
                      {/credit|budget|rate.?limit|overloaded/i.test(ex.error ?? "") ? "couldn't read it right now. retry in a bit." : (ex.error ?? "").slice(0, 160)}
                    </span>
                    <RetryButton id={d.id} />
                  </div>
                )}
              </li>
            );
          })
        ) : (
          <li className="px-4 py-6 text-sm text-neutral-500">nothing uploaded yet. start with your CV.</li>
        )}
      </ul>
    </main>
  );
}
