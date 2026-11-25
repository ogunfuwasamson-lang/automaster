import { Ban, Check, Clock, Globe2, GraduationCap, HandCoins, Landmark, Moon, ScrollText } from "lucide-react";
import { ConnectCards } from "@/components/landing/connect-demos";
import { CompareTable } from "@/components/landing/compare-table";

// three landing sections in one card language: a centered two-line heading, then cards with a small illustrated
// mock-up on top and the words below. every school and person in the mock-ups is invented.

export function SectionHead({ id, one, two, sub }: { id: string; one: string; two: string; sub: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 id={id} className="font-serif text-[36px] leading-[1.08] sm:text-[52px]">
        <span className="block">{one}</span>
        <span className="block text-brand">{two}</span>
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted">{sub}</p>
    </div>
  );
}

function Card({ art, title, children, tint }: { art: React.ReactNode; title: string; children: React.ReactNode; tint?: boolean }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(9_9_11/0.04)]">
      <div
        className={`relative flex h-[268px] items-center justify-center overflow-hidden border-b border-line px-6 ${tint ? "" : "bg-background/60"}`}
        style={
          tint
            ? { background: "radial-gradient(120% 90% at 0% 0%, color-mix(in oklab, var(--brand) 16%, transparent), transparent 60%), radial-gradient(90% 80% at 100% 10%, color-mix(in oklab, var(--wash) 14%, transparent), transparent 65%), radial-gradient(80% 80% at 60% 100%, color-mix(in oklab, var(--brand) 9%, transparent), transparent 70%)" }
            : undefined
        }
        aria-hidden
      >
        {art}
      </div>
      <div className="flex-1 px-7 pb-8 pt-7">
        <h3 className="font-serif text-[23px] leading-snug">{title}</h3>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-muted">{children}</p>
      </div>
    </article>
  );
}

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium";

// ---- made for the applications that take the most out of you ----

function AbroadArt() {
  const rows: [string, string, "ok" | "you" | "skip"][] = [
    ["CA", "Transcript, sent by your university", "ok"],
    ["UK", "Certified English translation", "you"],
    ["DE", "Degree recognition check", "ok"],
  ];
  return (
    <div className="w-full max-w-[330px]">
      <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] shadow-sm">
        <Globe2 className="size-4 text-brand" /> Read from each school&apos;s own pages
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {rows.map(([cc, t, st]) => (
          <div key={cc} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 text-[12.5px] last:border-0">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-background text-[10px] font-semibold text-muted">{cc}</span>
            <span className="min-w-0 flex-1 truncate">{t}</span>
            <span className="flex gap-1 rounded-lg bg-background p-0.5">
              <span className={`grid size-6 place-items-center rounded-md ${st === "ok" ? "bg-surface text-go shadow-sm" : "text-neutral-300 dark:text-neutral-600"}`}><Check className="size-3.5" /></span>
              <span className={`grid size-6 place-items-center rounded-md ${st === "you" ? "bg-surface text-signal shadow-sm" : "text-neutral-300 dark:text-neutral-600"}`}><Clock className="size-3.5" /></span>
              <span className="grid size-6 place-items-center rounded-md text-neutral-300 dark:text-neutral-600"><Ban className="size-3.5" /></span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkingArt() {
  return (
    <div className="w-full max-w-[330px] space-y-3">
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <Moon className="size-3.5" /> While you were at work today
      </div>
      <div className="rounded-xl border border-line bg-surface p-4 shadow-[0_6px_24px_-12px_rgb(9_9_11/0.25)]">
        <span className={`${pill} bg-go/10 text-go`}>
          <Check className="size-3.5" /> Done by your agents
        </span>
        <ul className="mt-3 space-y-1.5 text-[13px]">
          <li>Filled 3 application forms, 212 answers</li>
          <li>Uploaded 9 documents</li>
          <li>Sent 2 follow-ups you approved</li>
        </ul>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/[0.06] px-4 py-3 text-[13px]">
        <span>Left for you: approve 2 essays</span>
        <span className="text-muted">10 min</span>
      </div>
    </div>
  );
}

function FundingArt() {
  const steps: [typeof Landmark, string][] = [
    [ScrollText, "9:41"],
    [HandCoins, "9:41"],
    [GraduationCap, "9:42"],
    [Landmark, "9:44"],
  ];
  return (
    <div className="w-full max-w-[340px]">
      <div className="relative flex items-start justify-between px-1">
        <span className="absolute left-7 right-7 top-[22px] h-px bg-line" />
        {steps.map(([Icon, t], i) => (
          <span key={i} className="relative flex flex-col items-center gap-2">
            <span className={`grid size-11 place-items-center rounded-full border bg-surface ${i === steps.length - 1 ? "border-brand/50 text-brand ring-4 ring-brand/10" : "border-line text-muted"}`}>
              <Icon className="size-[18px]" />
            </span>
            <span className="text-[11.5px] tabular text-muted">{t}</span>
          </span>
        ))}
      </div>
      <div className="relative mt-4 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-[0_6px_24px_-12px_rgb(9_9_11/0.25)]">
        <span className="absolute -top-1.5 right-8 size-3 rotate-45 border-l border-t border-line bg-surface" />
        <div className="flex items-center justify-between gap-3 text-[13.5px]">
          <span>Fee waiver, Kingsbridge University</span>
          <span className={`${pill} bg-go/10 text-go`}>Granted</span>
        </div>
      </div>
    </div>
  );
}

// where Ivyward shows up outside its own pages: the inbox, the calendar and the browser (cards and demos in
// connect-demos.tsx)
export function ConnectSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24" aria-labelledby="connect-h">
      <SectionHead
        id="connect-h"
        one="In your inbox, your calendar"
        two="and your browser."
        sub="Connect Gmail and Google Calendar when you sign up. Add the Ivyward extension for application forms that only work in your own Chrome."
      />
      <ConnectCards />
    </section>
  );
}

export function WhoSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24" aria-labelledby="who-h">
      <SectionHead
        id="who-h"
        one="Made for the applications"
        two="that take the most out of you."
        sub="Wherever you're applying from and whatever else you're juggling, the agents take the draining parts."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        <Card tint art={<AbroadArt />} title="Applying from abroad">
          Every country has its own application forms, document rules and deadlines. The agents read each school&apos;s own pages, so you aren&apos;t decoding the rules yourself.
        </Card>
        <Card art={<WorkingArt />} title="Working while you apply">
          Short on evenings? The agents handle the forms, uploads and follow-ups. Your time goes on your essays and your decisions.
        </Card>
        <Card art={<FundingArt />} title="Applying for funding">
          Fee waivers, scholarships, assistantships, merit reconsideration: the agents ask wherever it&apos;s worth asking, and tell you what came back.
        </Card>
      </div>
    </section>
  );
}

export function CompareSection() {
  return (
    <section id="compare" className="scroll-mt-20 border-y border-line bg-surface/60 py-24" aria-labelledby="compare-h">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead id="compare-h" one="On your own, with a consultant," two="or with Ivyward." sub="The same application season, three ways. In every one of them, you sign your own applications." />
        <div className="mt-16">
          <CompareTable />
        </div>
      </div>
    </section>
  );
}

