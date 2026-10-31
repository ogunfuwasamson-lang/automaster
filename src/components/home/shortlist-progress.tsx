import { Search } from "lucide-react";
import { AutoRefresh } from "@/app/(app)/shortlist/controls";

export interface ShortlistRun {
  planning: boolean; // the planner hasn't split the run into regions yet
  regionsLeft: number;
  programsDone: number;
  programsTotal: number;
  regions: number;
}

// rough minutes left: a region search takes ~3 minutes, a program check ~1.2, and checks run about three at a time
export function minutesLeft(r: ShortlistRun): number {
  const programsLeft = Math.max(0, r.programsTotal - r.programsDone);
  const expectedPrograms = r.planning || r.regionsLeft ? Math.max(programsLeft, 5 * Math.max(r.regions, 1)) : programsLeft;
  const m = (r.planning ? 1 : 0) + (r.regionsLeft || (r.planning ? Math.max(r.regions, 1) : 0)) * 3 + Math.ceil((expectedPrograms * 1.2) / 3);
  return Math.max(2, Math.round(m));
}

// home page, while the first shortlist is being built: what's happening, how long, and that a notice will follow.
// it disappears on its own when the last recon job finishes.
export function ShortlistProgress({ run }: { run: ShortlistRun }) {
  const mins = minutesLeft(run);
  const pct = run.programsTotal ? Math.round((run.programsDone / run.programsTotal) * 100) : run.planning ? 4 : 10;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/25 bg-surface p-5 shadow-card sm:p-6" aria-live="polite">
      <AutoRefresh every={30_000} />
      <div className="flex items-start gap-4">
        <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
          <Search className="size-5" aria-hidden />
          <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-brand ring-2 ring-surface" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[22px] leading-snug">Your agents are building your shortlist</h2>
          <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-muted">
            They&apos;re searching {run.regions > 1 ? `${run.regions} regions` : "your region"} from the top-ranked schools down and checking each program&apos;s official pages against your profile. This takes about{" "}
            <span className="font-medium text-foreground">{mins} minutes</span>. You&apos;ll get a notification and an email when it&apos;s ready, so you don&apos;t need to keep this page open.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <span className="block h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${Math.min(96, Math.max(4, pct))}%` }} />
            </span>
            <span className="shrink-0 text-[12.5px] tabular text-muted">
              {run.programsTotal ? `${run.programsDone} of ${run.programsTotal} programs checked` : run.planning ? "Planning the search" : "Finding programs"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
