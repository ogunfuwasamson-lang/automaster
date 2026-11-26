"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { JourneyMap as JM, Stage, StageId } from "@/lib/journey-map";
import { ButtonLink } from "@/components/ui/button";
import { UploadButtons } from "@/components/docs/upload-button";

// the dashboard's map of the whole journey (lib/journey-map): ten stages from profile to the first day in school.
// a stage opens to show what it involves; after a confirmed admission its steps are ticked off here.
export function JourneyMap({ map, userId }: { map: JM; userId: string }) {
  const [open, setOpen] = useState<StageId>(map.current?.id ?? "arrival");
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const router = useRouter();
  // on a phone the track scrolls: start with the current stage in view (scrolling the track only, not the page)
  const track = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const ol = track.current;
    const li = ol?.querySelector<HTMLElement>("[data-current]");
    if (ol && li) ol.scrollLeft = Math.max(0, li.offsetLeft - ol.clientWidth / 2 + li.clientWidth / 2);
  }, []);
  const stage = map.stages.find((s) => s.id === open) ?? map.stages[0];
  const dest = map.destination;

  async function tick(s: Stage, step: string, done: boolean) {
    if (!dest) return;
    const key = `${s.id}.${step}`;
    setTicks((t) => ({ ...t, [key]: done }));
    const res = await fetch("/api/journey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationId: dest.id, stage: s.id, step, done }) });
    if (!res.ok) {
      setTicks((t) => ({ ...t, [key]: !done }));
      toast.error("Couldn't save that");
    } else router.refresh();
  }

  return (
    <section id="journey" aria-labelledby="journey-h" className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="journey-h" className="font-serif text-[22px] leading-snug">
          From application to your first day in school
        </h2>
        <p className="text-[13px] tabular text-muted">
          {map.done} of {map.stages.length} done{map.current ? `. Now: ${map.current.label.toLowerCase()}` : ""}
        </p>
      </div>

      <ol ref={track} className="relative -mx-1 mt-5 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {map.stages.map((s, n) => {
          const selected = s.id === open;
          return (
            <li key={s.id} data-current={s.state === "current" ? "" : undefined} className="relative min-w-[76px] flex-1">
              {n > 0 && <span aria-hidden className={`absolute left-[-50%] right-1/2 top-[15px] h-px ${s.state === "todo" ? "bg-line" : "bg-go/50"}`} />}
              <button
                type="button"
                onClick={() => setOpen(s.id)}
                aria-pressed={selected}
                aria-label={`${s.label}: ${s.state === "done" ? "done" : s.state === "current" ? "now" : "to come"}`}
                className="group relative flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span
                  className={`relative z-10 grid size-[30px] place-items-center rounded-full text-[12px] font-semibold tabular transition-colors ${
                    s.state === "done"
                      ? "bg-go/15 text-go"
                      : s.state === "current"
                        ? "bg-brand text-white ring-4 ring-brand/15"
                        : "border border-line bg-background text-muted"
                  } ${selected ? "outline outline-2 outline-offset-2 outline-foreground/30" : ""}`}
                >
                  {s.state === "done" ? <Check className="size-3.5" aria-hidden /> : n + 1}
                </span>
                <span className={`text-[12px] leading-tight ${s.state === "todo" ? "text-muted" : "font-medium"} ${selected ? "underline decoration-current/40 underline-offset-4" : ""}`}>{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 rounded-xl border border-line bg-background p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold">{stage.label}</h3>
            <p className="mt-0.5 text-[14px] text-muted">{stage.what}</p>
          </div>
          {stage.href && stage.cta && (
            <ButtonLink href={stage.href} size="sm" variant={stage.state === "current" ? "primary" : "secondary"}>
              {stage.cta}
            </ButtonLink>
          )}
        </div>

        {stage.id === "admitted" && !dest && !map.pendingAdmission && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-[13.5px]">
            <span className="text-muted">Already have an admission? Your agents move straight to funding and your visa.</span>
            <UploadButtons userId={userId} kind="admission_letter" label="Upload the admission letter" compact done="Uploaded. Your agents are reading your letter." />
          </div>
        )}

        {stage.steps && (
          <ul className="mt-4 grid gap-1.5 border-t border-line pt-4">
            {!dest && <li className="pb-1 text-[13px] text-muted">These open once a school&apos;s admission is confirmed.</li>}
            {stage.steps.map((st) => {
              const key = `${stage.id}.${st.id}`;
              const done = ticks[key] ?? st.done;
              return (
                <li key={st.id} className="flex items-start gap-3 text-[14px]">
                  <input
                    type="checkbox"
                    id={`j-${key}`}
                    checked={done}
                    disabled={!dest || st.auto}
                    onChange={(e) => tick(stage, st.id, e.target.checked)}
                    className="mt-1 size-4 shrink-0 accent-[var(--color-foreground)] disabled:opacity-50"
                  />
                  <label htmlFor={`j-${key}`} className={`flex-1 ${done ? "text-muted line-through decoration-current/40" : ""} ${!dest ? "text-muted" : ""}`}>
                    {st.label}
                    {st.auto && <span className="ml-1.5 text-[12px] text-muted no-underline">(your agents tick this)</span>}
                  </label>
                  {st.href && (
                    <a href={st.href} target={st.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[12.5px] text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">
                      {st.href.startsWith("http") ? "Official page" : "Open"}
                      {st.href.startsWith("http") && <ExternalLink className="size-3" aria-hidden />}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {dest && stage.steps && (
          <p className="mt-3 text-[12.5px] text-muted">
            For {dest.school}. Questions about any step? Ask Ivyward AI above: it checks the official pages.
          </p>
        )}
      </div>
    </section>
  );
}
