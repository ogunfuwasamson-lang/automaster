import { Check } from "lucide-react";
import type { Stage } from "@/lib/portal-progress";

// the agents' way through one school's portal, as a line of milestones: done, the one happening now, still to come
export function PortalProgress({ stages, compact = false }: { stages: Stage[]; compact?: boolean }) {
  const now = stages.find((s) => s.state === "now");
  const done = stages.filter((s) => s.state === "done").length;
  return (
    <div>
      <ol className="flex items-start gap-1" aria-label={`Portal progress: ${done} of ${stages.length} done${now ? `, now: ${now.label}` : ""}`}>
        {stages.map((s) => (
          <li key={s.key} className="min-w-0 flex-1" aria-current={s.state === "now" ? "step" : undefined}>
            <span className={`block h-1.5 rounded-full ${s.state === "done" ? "bg-go" : s.state === "now" ? "bg-accent/45" : "bg-neutral-200 dark:bg-neutral-800"}`} />
            {!compact && (
              <span className={`mt-1.5 hidden items-center gap-1 truncate text-[11.5px] sm:flex leading-tight ${s.state === "now" ? "font-semibold text-foreground" : s.state === "done" ? "text-foreground" : "text-muted"}`}>
                {s.state === "done" ? <Check className="size-3 shrink-0 text-go" aria-hidden /> : null}
                <span className="truncate">{s.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
      {!compact && now ? (
        <p className="mt-1.5 text-[12px] text-muted">
          <span className="sm:hidden">
            Step {stages.indexOf(now) + 1} of {stages.length}: <span className="font-medium text-foreground">{now.label}</span>
            {now.detail ? `, ${now.detail}` : ""}
          </span>
          {now.detail ? <span className="hidden sm:inline">{now.label}: {now.detail}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
