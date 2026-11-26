"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Check, ChevronDown, ChevronRight, GraduationCap, HandCoins, ListChecks, Mailbox, PenLine, Plane, Receipt, Send, Stamp, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { JourneyMap as JM, MapItem, Stage, StageId, Tone } from "@/lib/journey-map";
import { ButtonLink } from "@/components/ui/button";
import { UploadButtons } from "@/components/docs/upload-button";

// the dashboard's map of the whole journey (lib/journey-map), drawn as a route with two legs: getting in (profile
// to admission) and getting there (funding to the first day). each stop opens to the applicant's own things there:
// the schools waiting on a decision, the admissions, the visa steps. it folds away to one line, and remembers.

const ICON: Record<StageId, ComponentType<{ className?: string }>> = {
  profile: UserRound,
  shortlist: ListChecks,
  apply: PenLine,
  submitted: Send,
  admitted: Mailbox,
  funding: HandCoins,
  visa: Stamp,
  fees: Receipt,
  travel: Plane,
  arrival: GraduationCap,
};

const PILL: Record<Tone, string> = {
  signal: "bg-signal/10 text-signal",
  go: "bg-go/10 text-go",
  plain: "bg-neutral-100 text-foreground/80 dark:bg-neutral-800",
  muted: "text-muted",
};

const FOLD_KEY = "ivyward.journey.folded";
const SHOWN = 5;

export function JourneyMap({ map, userId }: { map: JM; userId: string }) {
  const stages = map.stages;
  const [open, setOpen] = useState<StageId>(map.current?.id ?? "arrival");
  const [folded, setFolded] = useState(false);
  const [all, setAll] = useState(false);
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const track = useRef<HTMLDivElement>(null);

  // folded or not is this viewer's choice, kept in their browser
  useEffect(() => {
    try {
      setFolded(localStorage.getItem(FOLD_KEY) === "1");
    } catch {}
  }, []);
  const fold = (v: boolean) => {
    setFolded(v);
    try {
      localStorage.setItem(FOLD_KEY, v ? "1" : "0");
    } catch {}
  };
  // on a phone the route scrolls: bring your stop into view (the route scrolls, not the page)
  useEffect(() => {
    const box = track.current;
    const here = box?.querySelector<HTMLElement>("[data-here]");
    if (box && here) box.scrollLeft = Math.max(0, here.offsetLeft - box.clientWidth / 2 + here.clientWidth / 2);
  }, [folded]);

  const at = Math.max(0, stages.findIndex((s) => s.state === "current"));
  const reached = map.current ? at : stages.length - 1;
  const stage = stages.find((s) => s.id === open) ?? stages[0];
  const n = stages.indexOf(stage);
  const dest = map.destination;
  const needs = stages.reduce((sum, s) => sum + s.attention, 0);
  const items = all ? stage.items : stage.items.slice(0, SHOWN);

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

  const pick = (id: StageId) => {
    setOpen(id);
    setAll(false);
  };

  return (
    <section id="journey" aria-labelledby="journey-h" className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {/* always shown: where you are, and the fold */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <h2 id="journey-h" className="font-serif text-[20px] leading-tight sm:text-[27px]">
            From application to your first day in school
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            {map.current ? (
              <>
                You&apos;re at <span className="font-medium text-foreground">{map.current.label.toLowerCase()}</span>
                {dest ? `, on your way to ${dest.school.split(",")[0]}` : ""}.
              </>
            ) : (
              "Every stop done. Enjoy your first day."
            )}
            {needs ? (
              <span className="ml-1.5 font-medium text-signal">
                {needs} {needs === 1 ? "thing needs" : "things need"} you.
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="hidden text-[13.5px] text-muted tabular sm:block">
            <span className="font-serif text-[24px] leading-none text-foreground">{map.done}</span> of {stages.length}
          </p>
          <button
            type="button"
            onClick={() => fold(!folded)}
            aria-expanded={!folded}
            aria-controls="journey-body"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-muted transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {folded ? "Show map" : "Hide"}
            <ChevronDown className={`size-4 transition-transform duration-300 motion-reduce:transition-none ${folded ? "" : "rotate-180"}`} aria-hidden />
          </button>
        </div>
      </div>

      {/* folded: the route as one thin strip; tap it to open */}
      {folded && (
        <button type="button" onClick={() => fold(false)} aria-label="Show the journey map" className="group mx-5 mb-5 mt-4 flex w-[calc(100%-2.5rem)] gap-1 sm:mx-7 sm:w-[calc(100%-3.5rem)]">
          {stages.map((s) => (
            <span key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors ${s.state === "done" ? "bg-go" : s.state === "current" ? "bg-brand" : "bg-line group-hover:bg-neutral-300 dark:group-hover:bg-neutral-600"}`} />
          ))}
        </button>
      )}

      <div id="journey-body" className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${folded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`} aria-hidden={folded} inert={folded}>
        <div className="min-h-0 overflow-hidden">
          {/* the route */}
          <div ref={track} className="overflow-x-auto px-5 pb-1 pt-6 [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-28px),transparent)] [scrollbar-width:none] sm:px-7 md:[mask-image:none]">
            <div className="relative min-w-[680px]">
              <div className="grid grid-cols-2 gap-6 text-[12.5px] text-muted">
                {["Getting in", "Getting there"].map((leg, i) => (
                  <div key={leg} className="flex items-center gap-2">
                    <span className={i === 0 ? (reached >= 5 ? "text-go" : "text-foreground") : reached >= 5 ? "text-foreground" : ""}>{leg}</span>
                    <span aria-hidden className="h-px flex-1 bg-line" />
                  </div>
                ))}
              </div>

              <ol className="relative mt-4 grid grid-cols-10">
                <span aria-hidden className="absolute left-[5%] right-[5%] top-[19px] h-[3px] rounded-full bg-[repeating-linear-gradient(90deg,var(--color-line)_0_6px,transparent_6px_11px)]" />
                <span aria-hidden className="absolute left-[5%] top-[19px] h-[3px] rounded-full bg-go transition-[width] duration-700" style={{ width: `${(reached / (stages.length - 1)) * 90}%` }} />
                {stages.map((s) => {
                  const Icon = ICON[s.id];
                  const here = s.state === "current";
                  const viewing = s.id === open;
                  const count = s.id === "profile" ? s.attention : s.items.length;
                  return (
                    <li key={s.id} data-here={here ? "" : undefined} className="relative flex justify-center">
                      <button
                        type="button"
                        onClick={() => pick(s.id)}
                        aria-pressed={viewing}
                        aria-label={`${s.label}: ${s.state === "done" ? "done" : here ? "you are here" : "ahead"}${count ? `, ${count}` : ""}${s.attention ? `, ${s.attention} need you` : ""}`}
                        className={`group flex w-full flex-col items-center rounded-xl pb-2 pt-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40 ${viewing ? "bg-background" : "hover:bg-background/60"}`}
                      >
                        <span className="relative grid h-10 place-items-center">
                          {s.state === "done" ? (
                            <span className="grid size-7 place-items-center rounded-full bg-go text-white shadow-[0_0_0_4px_var(--color-surface)] dark:text-neutral-950">
                              <Check className="size-3.5" strokeWidth={3} aria-hidden />
                            </span>
                          ) : here ? (
                            <span className="relative grid size-10 place-items-center rounded-full bg-brand text-white shadow-[0_0_0_5px_var(--color-surface)] dark:text-neutral-950">
                              <span aria-hidden className="absolute inset-0 rounded-full ring-[6px] ring-brand/15 motion-safe:animate-pulse" />
                              <Icon className="size-[18px]" aria-hidden />
                            </span>
                          ) : (
                            <span className="grid size-8 place-items-center rounded-full border border-line bg-surface text-muted shadow-[0_0_0_4px_var(--color-surface)] transition-colors group-hover:border-foreground/30 group-hover:text-foreground">
                              <Icon className="size-[15px]" aria-hidden />
                            </span>
                          )}
                          {count > 0 && s.id !== "profile" && (
                            <span aria-hidden className={`absolute -right-3 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-semibold tabular ring-2 ring-surface ${s.attention ? "bg-signal text-white" : "bg-foreground text-surface"}`}>
                              {count}
                            </span>
                          )}
                          {s.id === "profile" && s.attention > 0 && <span aria-hidden className="absolute -right-1.5 top-0.5 size-2.5 rounded-full bg-signal ring-2 ring-surface" />}
                        </span>
                        <span className={`mt-2 px-1 text-center text-[12.5px] leading-tight ${here ? "font-semibold text-brand" : s.state === "done" ? "text-foreground" : "text-muted"} ${viewing ? "underline decoration-current/40 underline-offset-4" : ""}`}>{s.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* the open stop: your own things there */}
          <div className="mx-3 mb-3 mt-2 grid gap-6 rounded-xl bg-background p-5 sm:mx-4 sm:mb-4 sm:p-6 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-10">
            <div className="min-w-0">
              <p className="text-[13px] text-muted">
                Stop {n + 1} of {stages.length}
                {stage.state === "done" ? ", done" : stage.state === "current" ? ", you're here" : ""}
              </p>
              <h3 className="mt-1.5 font-serif text-[25px] leading-[1.15]">{stage.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{stage.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {stage.href && stage.cta && (
                  <ButtonLink href={stage.href} size="sm" variant={stage.state === "current" || stage.attention ? "primary" : "secondary"}>
                    {stage.cta}
                  </ButtonLink>
                )}
                {stage.id === "admitted" && !dest && (
                  <UploadButtons userId={userId} kind="admission_letter" label="Add an admission letter" compact done="Uploaded. Your agents are reading your letter." />
                )}
              </div>
            </div>

            <div className="min-w-0">
              {stage.steps ? (
                <Steps stage={stage} dest={!!dest} ticks={ticks} onTick={tick} />
              ) : stage.items.length ? (
                <>
                  <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                    {items.map((it) => (
                      <Row key={it.id} it={it} />
                    ))}
                  </ul>
                  {stage.items.length > SHOWN && (
                    <button type="button" onClick={() => setAll(!all)} className="mt-2.5 text-[13px] text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">
                      {all ? "Show fewer" : `Show all ${stage.items.length}`}
                    </button>
                  )}
                </>
              ) : (
                <div className="grid h-full min-h-[120px] place-items-center rounded-lg border border-dashed border-line px-6 py-8 text-center text-[14px] text-muted">
                  {stage.id === "submitted" ? "Applications appear here once they're sent to the schools." : stage.id === "admitted" ? "Admissions appear here, with what comes next for each." : stage.id === "apply" ? "Applications you start appear here, with where each one stands." : "Nothing here yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ it }: { it: MapItem }) {
  return (
    <li>
      {/* on a phone the status drops under the school, so the name is never cut short */}
      <Link href={it.href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background/70">
        <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-medium">{it.title}</span>
            {it.sub && <span className="block truncate text-[13px] text-muted">{it.sub}</span>}
          </span>
          <span className={`w-fit shrink-0 rounded-full py-1 text-[12px] font-medium ${it.tone === "muted" ? "" : "px-2.5"} ${PILL[it.tone]}`}>{it.status}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}

function Steps({ stage, dest, ticks, onTick }: { stage: Stage; dest: boolean; ticks: Record<string, boolean>; onTick: (s: Stage, step: string, done: boolean) => void }) {
  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {stage.steps!.map((st) => {
          const done = ticks[`${stage.id}.${st.id}`] ?? st.done;
          const locked = !dest || st.auto;
          return (
            <li key={st.id} className="flex items-start gap-3 px-4 py-3 text-[14px]">
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={st.label}
                disabled={locked}
                onClick={() => onTick(stage, st.id, !done)}
                className={`mt-px grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${done ? "border-go bg-go text-white dark:text-neutral-950" : "border-neutral-300 bg-surface dark:border-neutral-600"} ${locked ? "cursor-default opacity-60" : "hover:border-go"}`}
              >
                {done && <Check className="size-3" strokeWidth={3} aria-hidden />}
              </button>
              <span className={`flex-1 leading-snug ${done ? "text-muted line-through decoration-current/30" : ""} ${!dest ? "text-muted" : ""}`}>
                {st.label}
                {st.auto && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-[12px] text-go no-underline">
                    <BadgeCheck className="size-3" aria-hidden />
                    your agents
                  </span>
                )}
              </span>
              {st.href && (
                <a href={st.href} target={st.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">
                  {st.href.startsWith("http") ? "Official page" : "Open"}
                  <ArrowUpRight className="size-3" aria-hidden />
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2.5 text-[12.5px] text-muted">{dest ? "Questions about a step? Ask Ivyward AI: it checks the official pages." : "These open once a school's admission is confirmed."}</p>
    </>
  );
}
