import { CircleCheck, CircleDashed, FileText, LoaderCircle, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader, Section, Empty } from "@/components/ui/page";
import { Uploader } from "./uploader";
import { DOC_KINDS } from "@/lib/doc-kinds";
import { RetryButton } from "./retry-button";
import { AutoRefresh } from "../shortlist/controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

const KIND_LABEL: Record<string, string> = Object.fromEntries(DOC_KINDS);
const NEEDED: [string, string, string][] = [
  ["cv", "CV or résumé", "Every portal asks for one"],
  ["transcript", "Transcript", "Most portals ask for unofficial copies first"],
  ["degree_certificate", "Degree certificate", "Needed for master's and PhD"],
  ["test_score", "Test scores", "Only if your schools want them"],
];

export default async function Documents() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data: docs } = await auth.sb.from("documents").select("id, kind, filename, status, extracted, created_at").order("created_at", { ascending: false });
  const list = docs ?? [];
  const reading = list.some((d) => d.status === "uploaded" || d.status === "extracting");
  const has = (k: string) => list.some((d) => (d.kind === k || (k === "degree_certificate" && d.kind === "degree_cert")) && d.status !== "failed");

  return (
    <div className="mx-auto max-w-4xl">
      {reading && <AutoRefresh every={10000} />}
      <PageHeader title="Documents" description="Upload once. The agents read each file into your profile and attach the right ones to every application. Don't upload your passport; nothing needs it." />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-8">
          <Uploader userId={auth.user.id} />

          <Section title={list.length ? `Your files (${list.length})` : "Your files"}>
            {list.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
                {list.map((d) => {
                  const ex = (d.extracted ?? {}) as { summary?: string; issues?: string[]; error?: string };
                  const busy = d.status === "uploaded" || d.status === "extracting";
                  return (
                    <li key={d.id} className="flex gap-3 px-4 py-3.5 text-sm sm:px-5">
                      <FileText className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{d.filename}</span>
                            <span className="text-xs text-muted">{KIND_LABEL[d.kind] ?? KIND_LABEL[d.kind === "degree_cert" ? "degree_certificate" : "other"]}</span>
                          </span>
                          <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${d.status === "failed" ? "text-stop" : d.status === "extracted" ? "text-go" : "text-muted"}`}>
                            {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : d.status === "extracted" ? <CircleCheck className="size-3.5" aria-hidden /> : d.status === "failed" ? <TriangleAlert className="size-3.5" aria-hidden /> : null}
                            {busy ? "Reading" : d.status === "extracted" ? "Read" : d.status === "failed" ? "Couldn't read" : d.status}
                          </span>
                        </div>
                        {ex.summary && <p className="leading-relaxed text-muted">{ex.summary}</p>}
                        {ex.issues?.length ? (
                          <ul className="space-y-0.5 text-foreground">
                            {ex.issues.map((i) => (
                              <li key={i} className="flex gap-1.5">
                                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden />
                                {i}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {d.status === "failed" && (
                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <span className="text-xs text-muted">
                              {/credit|budget|rate.?limit|overloaded/i.test(ex.error ?? "") ? "Reading is paused for a moment. Try again shortly." : (ex.error ?? "").slice(0, 160) || "Something went wrong reading this file."}
                            </span>
                            <RetryButton id={d.id} />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="Nothing uploaded yet" body="Start with your CV. It fills most of your profile in one go." />
            )}
          </Section>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold">What portals ask for</h2>
          <ul className="space-y-3 rounded-3xl border border-line bg-surface shadow-card p-4 text-sm">
            {NEEDED.map(([k, label, hint]) => (
              <li key={k} className="flex gap-2.5">
                {has(k) ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-go" aria-hidden /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
                <span>
                  <span className={`block ${has(k) ? "" : "font-medium"}`}>{label}</span>
                  <span className="text-xs text-muted">{hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
