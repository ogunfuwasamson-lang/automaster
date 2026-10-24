import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/ui/page";
import { StatusPill, daysUntil } from "@/components/ui/status";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications" };

interface Row {
  id: string;
  status: string;
  runner_status: string | null;
  target_deadline: string | null;
  programs: { name: string; degree: string; schools: { name: string; country: string | null } };
  artifacts: { kind: string; current_version: number; artifact_versions: { version: number; critique: { status?: string } | null; user_approved_at: string | null }[] }[];
}

const GROUPS: [string, string[]][] = [
  ["In progress", ["preparing", "ready_for_review", "packet_approved"]],
  ["Waiting on schools", ["submitted", "under_review", "interview", "waitlisted"]],
  ["Decided", ["admitted", "rejected", "withdrawn"]],
];
const NOT_ESSAYS = ["strategy", "fee_plan", "funding_plan", "video_or_interview"];

function Deadline({ date, urgent }: { date: string | null; urgent: boolean }) {
  if (!date) return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-dashed border-line text-xs text-muted">TBD</span>;
  const d = new Date(date + "T00:00:00Z");
  return (
    <span className={`grid h-12 w-12 shrink-0 place-content-center rounded-lg text-center leading-none ${urgent ? "bg-stop text-white" : "bg-board text-flap"}`}>
      <span className="font-display text-xl font-bold tabular">{d.getUTCDate()}</span>
      <span className="mt-0.5 text-[10px]">{d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}</span>
    </span>
  );
}

export default async function Applications() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await auth.sb
    .from("applications")
    .select("id, status, runner_status, target_deadline, programs(name, degree, schools(name, country)), artifacts(kind, current_version, artifact_versions(version, critique, user_approved_at))")
    .not("status", "in", "(researching,shortlisted,dropped)")
    .order("target_deadline", { ascending: true, nullsFirst: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Applications"
        description="Everything you're preparing or waiting on, soonest deadline first."
        actions={<ButtonLink href="/shortlist" variant="secondary">Add from shortlist</ButtonLink>}
      />
      {rows.length ? (
        <div className="space-y-8">
          {GROUPS.map(([title, statuses]) => {
            const group = rows.filter((r) => statuses.includes(r.status));
            if (!group.length) return null;
            return (
              <section key={title} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted">
                  {title} <span className="font-normal tabular">({group.length})</span>
                </h2>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {group.map((r) => {
                    const essays = r.artifacts.filter((a) => !NOT_ESSAYS.includes(a.kind));
                    const cur = (a: Row["artifacts"][number]) => a.artifact_versions.find((v) => v.version === a.current_version);
                    const approved = essays.filter((a) => cur(a)?.user_approved_at).length;
                    const ready = essays.filter((a) => !cur(a)?.user_approved_at && cur(a)?.critique?.status === "ready").length;
                    const days = daysUntil(r.target_deadline);
                    const writing = ["preparing", "ready_for_review"].includes(r.status);
                    const urgent = writing && days !== null && days >= 0 && days <= 7;
                    return (
                      <li key={r.id}>
                        <Link href={`/applications/${r.id}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                          <Deadline date={r.target_deadline} urgent={urgent} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{r.programs.schools.name}</span>
                            <span className="block truncate text-sm text-muted">{r.programs.name}</span>
                            {writing && (
                              <span className="mt-2 flex items-center gap-2 text-xs text-muted">
                                <span className="h-1 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                  <span className="block h-full rounded-full bg-foreground" style={{ width: essays.length ? `${(approved / essays.length) * 100}%` : "0%" }} />
                                </span>
                                {essays.length ? `${approved} of ${essays.length} approved` : "Planning"}
                                {ready ? <span className="font-medium text-foreground">, {ready} ready for you</span> : null}
                              </span>
                            )}
                          </span>
                          <span className="hidden flex-col items-end gap-1 sm:flex">
                            <StatusPill status={r.status} runner={r.runner_status} />
                            {days !== null && days >= 0 && writing ? <span className={`text-xs tabular ${urgent ? "font-medium text-stop" : "text-muted"}`}>{days === 0 ? "Due today" : `${days} days left`}</span> : null}
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Nothing in preparation yet"
          body="Pick programs on your shortlist and choose Prepare. The agents plan each one and start drafting."
          action={<ButtonLink href="/shortlist">Open shortlist</ButtonLink>}
        />
      )}
    </div>
  );
}
