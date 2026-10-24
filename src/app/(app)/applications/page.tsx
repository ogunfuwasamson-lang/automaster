import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  status: string;
  target_deadline: string | null;
  programs: { name: string; degree: string; schools: { name: string; country: string | null } };
  artifacts: { kind: string; current_version: number; artifact_versions: { version: number; critique: { status?: string } | null; user_approved_at: string | null }[] }[];
}

export default async function Applications() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await auth.sb
    .from("applications")
    .select("id, status, target_deadline, programs(name, degree, schools(name, country)), artifacts(kind, current_version, artifact_versions(version, critique, user_approved_at))")
    .not("status", "in", "(researching,shortlisted,dropped)")
    .order("target_deadline", { ascending: true, nullsFirst: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">applications</h1>
        <p className="mt-1 text-sm text-neutral-500">
          programs you&apos;re preparing. start one from the shortlist with &quot;prepare application&quot;.
        </p>
      </header>
      {rows.length ? (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {rows.map((r) => {
            const essays = r.artifacts.filter((a) => !["strategy", "fee_plan", "funding_plan", "video_or_interview"].includes(a.kind));
            const cur = (a: Row["artifacts"][number]) => a.artifact_versions.find((v) => v.version === a.current_version);
            const ready = essays.filter((a) => cur(a)?.critique?.status === "ready").length;
            const approved = essays.filter((a) => cur(a)?.user_approved_at).length;
            return (
              <li key={r.id}>
                <Link href={`/applications/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.programs.schools.name}</p>
                    <p className="truncate text-sm text-neutral-500">{r.programs.name} · {r.programs.degree}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{essays.length ? `${approved}/${essays.length} approved · ${ready} ready for you` : "planning…"}</p>
                    <p className="text-xs text-neutral-500">{r.status.replace(/_/g, " ")}{r.target_deadline ? ` · due ${r.target_deadline}` : ""}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">nothing in preparation yet.</p>
      )}
    </main>
  );
}
