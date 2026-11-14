import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import type { Journey, Task } from "@/lib/today";

// home page, first thing under the greeting: the one task for today (lib/today) and the path to a first
// submission, so every visit has an obvious next move and a visible amount of progress
export function TodayCard({
  task,
  journey,
}: {
  task: Task | null;
  journey: Journey;
}) {
  const pct = Math.round((journey.done / journey.steps.length) * 100);
  return (
    <section
      className="rounded-2xl border border-brand/25 bg-surface p-5 shadow-card sm:p-6"
      aria-labelledby="today-task"
    >
      {task ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="min-w-0 flex-1 basis-80">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-brand">
              <Clock className="size-3.5" aria-hidden />
              Today&apos;s task, about {task.minutes} minute
              {task.minutes > 1 ? "s" : ""}
            </p>
            <h2
              id="today-task"
              className="mt-1 font-serif text-[22px] leading-snug sm:text-[24px]"
            >
              {task.title}
            </h2>
            <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-muted">
              {task.why}
            </p>
          </div>
          <Link
            href={task.href}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-foreground px-5 text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            {task.cta}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-go">
            <Check className="size-3.5" aria-hidden />
            Nothing for you today
          </p>
          <h2
            id="today-task"
            className="mt-1 font-serif text-[22px] leading-snug"
          >
            Your agents have everything they need
          </h2>
          <p className="mt-1 text-[14.5px] text-muted">
            They&apos;ll tell you the moment something is ready for you.
          </p>
        </div>
      )}

      {/* once something has gone in, the path has done its job */}
      {!journey.steps.find((s) => s.id === "submitted")?.done && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
            <span className="font-medium">
              Your path to your first submission
            </span>
            <span className="tabular text-muted">
              {journey.done} of {journey.steps.length} done
              {journey.next ? `. Next: ${journey.next.toLowerCase()}` : ""}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress to your first submission"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-700"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
          <ol className="mt-3 hidden flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] sm:flex">
            {journey.steps.map((s) => (
              <li
                key={s.id}
                className={`flex items-center gap-1.5 ${s.done ? "text-foreground" : "text-muted"}`}
              >
                <span
                  className={`grid size-4 place-items-center rounded-full ${s.done ? "bg-go/15 text-go" : "border border-line"}`}
                >
                  {s.done ? <Check className="size-2.5" aria-hidden /> : null}
                </span>
                {s.label}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
