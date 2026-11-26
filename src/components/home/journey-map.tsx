"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Check, GraduationCap, HandCoins, ListChecks, Mailbox, PenLine, Plane, Receipt, Send, Stamp, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { JourneyMap as JM, Stage, StageId } from "@/lib/journey-map";
import { ButtonLink } from "@/components/ui/button";
import { UploadButtons } from "@/components/docs/upload-button";

// the dashboard's map of the whole journey (lib/journey-map), drawn as a route with two legs: getting in (profile
// to admission) and getting there (funding to the first day). the stop you're at is the one strong mark; open any
// stop to see what happens there, and after a confirmed admission tick its steps off.

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

// what happens at each stop before the admission: who does what (true of the product as it is)
const WHO: Partial<Record<StageId, { title: string; agents: string[]; you: string[] }>> = {
  profile: { title: "Finish your profile", agents: ["Read your CV and transcript into your profile", "Ask only what's missing"], you: ["Add your phone, date of birth and passport details once"] },
  shortlist: { title: "Build your shortlist", agents: ["Check each programme on the school's own pages", "Note its deadline, fees and funding"], you: ["Choose the ones to apply to"] },
  apply: { title: "Get your applications ready", agents: ["Draft and fact-check your essays", "Ask for application fee waivers"], you: ["Read, edit and sign each one"] },
  submitted: { title: "Send them in", agents: ["Fill in each school's application form", "Upload your documents"], you: ["Pay application fees on the school's site", "Tick the occasional bot check"] },
  admitted: { title: "Hear back", agents: ["Read school emails for decisions, with Gmail connected"], you: ["Confirm an admission with the school's email or the letter"] },
};

export function JourneyMap({ map, userId }: { map: JM; userId: string }) {
  const [open, setOpen] = useState<StageId>(map.current?.id ?? "arrival");
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const track = useRef<HTMLDivElement>(null);
  // on a phone the route scrolls: start with your stop in view (the route scrolls, not the page)
  useEffect(() => {
    const box = track.current;
    const here = box?.querySelector<HTMLElement>("[data-here]");
    if (box && here) box.scrollLeft = Math.max(0, here.offsetLeft - box.clientWidth / 2 + here.clientWidth / 2);
  }, []);

  const stages = map.stages;
  const at = Math.max(0, stages.findIndex((s) => s.state === "current"));
  const reached = map.current ? at : stages.length - 1;
  const stage = stages.find((s) => s.id === open) ?? stages[0];
  const n = stages.indexOf(stage);
  const dest = map.destination;
  const school = dest?.school.split(",")[0];

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

  // the stop's own heading: what you do there, in the state you're in
  const waiting = stage.id === "admitted" && !dest && !map.pendingAdmission;
  const title = stage.id === "admitted" && map.pendingAdmission ? "Confirm your admission" : stage.id === "admitted" && dest ? `Admitted to ${school}` : (WHO[stage.id]?.title ?? stage.label);
  const lead =
    stage.id === "admitted"
      ? map.pendingAdmission
        ? `You said ${map.pendingAdmission.school.split(",")[0]} admitted you. Back it with the school's email or the letter, and your agents start on funding and your visa.`
        : dest
          ? "Confirmed. Funding and your visa come next."
          : "Your agents watch for decisions. When a school admits you, confirm it here with the school's email or the letter."
      : stage.what;

  return (
    <section id="journey" aria-labelledby="journey-h" className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 pt-5 sm:px-7 sm:pt-6">
        <div>
          <h2 id="journey-h" className="font-serif text-[24px] leading-tight sm:text-[28px]">
            From application to your first day in school
          </h2>
          <p className="mt-1 text-[14px] text-muted">{dest ? `On your way to ${school}.` : "Two legs: getting in, then getting there."}</p>
        </div>
        <p className="text-[14px] text-muted">
          <span className="font-serif text-[26px] leading-none text-foreground tabular">{map.done}</span>
          <span className="tabular"> of {stages.length} stops</span>
        </p>
      </div>

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
            {/* the line: travelled in green, the rest dashed */}
            <span aria-hidden className="absolute left-[5%] right-[5%] top-[19px] h-[3px] rounded-full bg-[repeating-linear-gradient(90deg,var(--color-line)_0_6px,transparent_6px_11px)]" />
            <span aria-hidden className="absolute left-[5%] top-[19px] h-[3px] rounded-full bg-go transition-[width] duration-700" style={{ width: `${(reached / (stages.length - 1)) * 90}%` }} />
            {stages.map((s, i) => {
              const Icon = ICON[s.id];
              const here = s.state === "current";
              const viewing = s.id === open;
              return (
                <li key={s.id} data-here={here ? "" : undefined} className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={() => setOpen(s.id)}
                    aria-pressed={viewing}
                    aria-label={`${s.label}: ${s.state === "done" ? "done" : here ? "you are here" : "ahead"}`}
                    className="group flex w-full flex-col items-center rounded-xl pb-2 outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <span className="grid h-10 place-items-center">
                      {s.state === "done" ? (
                        <span className="grid size-7 place-items-center rounded-full bg-go text-white shadow-[0_0_0_4px_var(--color-surface)] dark:text-neutral-950 transition-transform group-hover:scale-110">
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
                    </span>
                    <span className={`mt-2 px-1 text-center text-[12.5px] leading-tight ${here ? "font-semibold text-brand" : s.state === "done" ? "text-foreground" : "text-muted"} ${viewing && !here ? "underline decoration-current/40 underline-offset-4" : ""}`}>{s.label}</span>
                    {here && <span className="mt-0.5 text-[11.5px] text-muted">you are here</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* the open stop */}
      <div className="mx-3 mb-3 mt-2 grid gap-6 rounded-xl bg-background p-5 sm:mx-4 sm:mb-4 sm:p-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">
            Stop {n + 1} of {stages.length}, {n < 5 ? "getting in" : "getting there"}
            {stage.state === "done" ? ": done" : ""}
          </p>
          <h3 className="mt-1.5 font-serif text-[26px] leading-[1.15]">{title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{lead}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {stage.href && stage.cta && (
              <ButtonLink href={stage.href} size="sm" variant={stage.state === "current" ? "primary" : "secondary"}>
                {stage.cta}
              </ButtonLink>
            )}
            {waiting && <UploadButtons userId={userId} kind="admission_letter" label="I already have an admission letter" compact done="Uploaded. Your agents are reading your letter." />}
          </div>
        </div>

        <div className="min-w-0">
          {stage.steps ? (
            <>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {stage.steps.map((st) => {
                  const key = `${stage.id}.${st.id}`;
                  const done = ticks[key] ?? st.done;
                  const locked = !dest || st.auto;
                  return (
                    <li key={st.id} className="flex items-start gap-3 px-3.5 py-3 text-[14px]">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        aria-label={st.label}
                        disabled={locked}
                        onClick={() => tick(stage, st.id, !done)}
                        className={`mt-px grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${done ? "border-go bg-go text-white dark:text-neutral-950" : "border-neutral-300 bg-surface dark:border-neutral-600"} ${locked ? "cursor-default opacity-60" : "hover:border-go"}`}
                      >
                        {done && <Check className="size-3" strokeWidth={3} aria-hidden />}
                      </button>
                      <span className={`flex-1 leading-snug ${done ? "text-muted line-through decoration-current/30" : ""} ${!dest ? "text-muted" : ""}`}>
                        {st.label}
                        {st.auto && <span className="ml-1.5 inline-flex items-center gap-1 text-[12px] text-go no-underline"><BadgeCheck className="size-3" aria-hidden />your agents</span>}
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
              <p className="mt-2.5 text-[12.5px] text-muted">{dest ? `For ${school}. Questions about a step? Ask Ivyward AI: it checks the official pages.` : "These open once a school's admission is confirmed."}</p>
            </>
          ) : WHO[stage.id] ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["Your agents", WHO[stage.id]!.agents],
                  ["You", WHO[stage.id]!.you],
                ] as const
              ).map(([who, list]) => (
                <div key={who} className="rounded-lg border border-line bg-surface p-4">
                  <p className="text-[13px] font-semibold">{who}</p>
                  <ul className="mt-2 space-y-1.5 text-[14px] leading-snug text-muted">
                    {list.map((x) => (
                      <li key={x} className="flex gap-2">
                        <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current opacity-50" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
