import { Check } from "lucide-react";
import type { PlanStep } from "@/lib/app-plan";

const WHO: Record<PlanStep["who"], string> = { you: "You", agents: "Agents", school: "School" };

// every step of this application in one list, with who does it. the current one stands out
export function WhatsLeft({ steps }: { steps: PlanStep[] }) {
  const left = steps.filter((s) => s.state !== "done").length;
  return (
    <section aria-labelledby="whats-left" className="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <h2 id="whats-left" className="flex items-baseline justify-between gap-2 font-semibold">
        What&apos;s left
        <span className="text-sm font-normal text-muted">{left ? `${left} step${left === 1 ? "" : "s"}` : "all done"}</span>
      </h2>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s) => {
          const body = (
            <>
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${s.state === "done" ? "border-go bg-go text-white" : s.state === "now" ? "border-accent" : "border-line"}`} aria-hidden>
                {s.state === "done" ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] leading-snug ${s.state === "done" ? "text-muted line-through decoration-1" : s.state === "now" ? "font-semibold" : ""}`}>{s.label}</span>
                {s.detail && s.state !== "done" && <span className="block text-[12.5px] text-muted">{s.detail}</span>}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.who === "you" && s.state !== "done" ? "bg-accent/10 text-accent" : "bg-neutral-100 text-muted dark:bg-neutral-800"}`}>{WHO[s.who]}</span>
            </>
          );
          return (
            <li key={s.key} aria-current={s.state === "now" ? "step" : undefined}>
              {s.href && s.state === "now" && s.who === "you" ? (
                <a href={s.href} className="flex items-start gap-3 rounded-xl bg-accent/5 px-2 py-1.5 hover:bg-accent/10">
                  {body}
                  <span className="sr-only">(go to it)</span>
                </a>
              ) : (
                <div className={`flex items-start gap-3 rounded-xl px-2 py-1.5 ${s.state === "now" ? "bg-accent/5" : ""}`}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
