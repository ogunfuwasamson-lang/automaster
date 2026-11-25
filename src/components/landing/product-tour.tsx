"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { Check, CircleDot, ClipboardList, HandCoins, Inbox, ListChecks, Lock, Mail, PenLine, Search } from "lucide-react";
import { StatusPill } from "@/components/ui/status";
import { Mark } from "@/components/wordmark";

// the product, shown as the app itself: a window whose sidebar is the tab list. each view plays out when it opens
// (rows arrive, checks tick, a reply gets its meaning), the tour moves on by itself while it's on screen, pauses
// under the pointer, and stops once someone picks a view. illustrative data only: every school and person is invented,
// so nothing reads as a real university endorsing Ivyward.

export const VIEWS = [
  {
    id: "programs",
    nav: "Shortlist",
    Icon: ListChecks,
    title: "Find programs that fit",
    line: "Agents check each program's official pages against your profile, budget and regions, and keep the ones you can realistically get into.",
    href: "/features/finding-programs",
    more: "See how the shortlist works",
    path: "Shortlist · fall 2027",
  },
  {
    id: "essays",
    nav: "Essays",
    Icon: PenLine,
    title: "Essays from your own facts",
    line: "Drafted from your CV and answers, then fact-checked so nothing claims more than you can back up. You edit and approve.",
    href: "/features/essays",
    more: "See how essays work",
    path: "Kingsbridge · Statement of purpose · draft 2",
  },
  {
    id: "forms",
    nav: "Application forms",
    Icon: ClipboardList,
    title: "Application forms, filled for you",
    line: "Agents find each school's online application, create your account, fill every page and upload your documents. Nothing is submitted without your approval.",
    href: "/features/application-forms",
    more: "See how application forms work",
    path: "Northfield · online application",
  },
  {
    id: "replies",
    nav: "Inbox",
    Icon: Inbox,
    title: "Replies read and explained",
    line: "Every email from your schools is read and turned into what it means and what happens next.",
    href: "/features/school-replies",
    more: "See how school replies work",
    path: "Inbox · Kingsbridge University",
  },
  {
    id: "funding",
    nav: "Funding",
    Icon: HandCoins,
    title: "Funding, asked for",
    line: "Fee waivers before you pay, scholarships that match, and merit reconsideration after an admission. You approve every request.",
    href: "/features/funding",
    more: "See how funding works",
    path: "Funding · after admission",
  },
] as const;
export type ViewId = (typeof VIEWS)[number]["id"];

const EASE = [0.16, 1, 0.3, 1] as const;
// a view's parts arrive one after another when it opens. leaving, they wait for the view to fade, then reset.
const group: Variants = { hide: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } } };
const item: Variants = { hide: { opacity: 0, y: 8, transition: { delay: 0.32, duration: 0 } }, show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } } };
const tick: Variants = { hide: { opacity: 0, scale: 0.5, transition: { delay: 0.32, duration: 0 } }, show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 520, damping: 24 } } };
const typed: Variants = { hide: { clipPath: "inset(0 100% 0 0)", transition: { delay: 0.32, duration: 0 } }, show: { clipPath: "inset(0 0% 0 0)", transition: { duration: 1, ease: "linear" } } };

const PROGRAMS = [
  ["Northfield University", "MSc Management Analytics", "Canada", "Strong", "Merit aid likely"],
  ["Kingsbridge University", "MSc Finance", "United Kingdom", "Strong", "Fee waiver offered"],
  ["Halden Technical University", "MSc Management and Technology", "Germany", "Good", "No tuition"],
  ["Lakemoor Business School", "MSc Business Analytics", "Singapore", "Reach", "Scholarships open"],
  ["Ashby School of Management", "MSc International Business", "Canada", "Good", "Entrance award"],
] as const;

const FIT: Record<string, string> = { Strong: "bg-go/10 text-go", Good: "bg-foreground/[0.06] text-foreground", Reach: "bg-signal/10 text-signal" };

function Programs() {
  return (
    <>
      <motion.div variants={item} className="flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2.5 text-[13px] text-muted">
        <Search className="size-3.5 shrink-0" aria-hidden />
        <motion.span variants={typed} className="truncate">
          Business analytics and finance master&apos;s, UK, Canada, Europe, Asia. Funding matters.
        </motion.span>
      </motion.div>
      <motion.p variants={item} className="mt-4 text-[12px] text-muted">
        5 programs fit · each checked against its official pages
      </motion.p>
      <div className="mt-1.5">
        {PROGRAMS.map(([school, program, country, fit, money]) => (
          <motion.div key={school} variants={item} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 border-b border-line py-2.5 last:border-0 sm:grid-cols-[1.7fr_0.9fr_76px_1fr]">
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium">{school}</span>
              <span className="block truncate text-[12.5px] text-muted">
                {program}
                <span className="sm:hidden"> · {country}</span>
              </span>
            </span>
            <span className="hidden text-[13px] text-muted sm:block">{country}</span>
            <span className={`justify-self-end rounded-full px-2.5 py-0.5 text-[11.5px] font-medium sm:justify-self-start ${FIT[fit]}`}>{fit}</span>
            <span className="col-span-2 text-[12.5px] text-muted sm:col-span-1 sm:text-[13px]">{money}</span>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function Essays({ on }: { on: boolean }) {
  // the checked phrases light up once the checks have ticked
  const mark = `rounded px-0.5 transition-colors duration-500 ${on ? "bg-go/15 delay-[1100ms]" : "bg-transparent"}`;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <motion.p variants={item} className="rounded-lg border border-line bg-background px-3 py-2 text-[12.5px] text-muted">
          Kingsbridge asks: Why this program, and why now? (up to 750 words)
        </motion.p>
        <motion.div variants={item} className="mt-4 space-y-3 font-serif text-[16px] leading-relaxed">
          <p>
            At a payments startup I closed partnerships with <span className={mark}>four commercial banks</span> in <span className={mark}>eighteen months</span>, and learned how much of fintech is trust, built slowly and then all at once.
          </p>
          <p>Kingsbridge&apos;s finance and technology track is where I want to put numbers behind that instinct: the risk modelling, the regulation, the products that move money across borders.</p>
          <p className="text-muted">Over the next two years…</p>
        </motion.div>
        <motion.p variants={item} className="mt-4 text-[12px] text-muted">
          612 of 750 words · written from your profile
        </motion.p>
      </div>
      <div className="space-y-2.5 text-[13px]">
        <motion.p variants={item} className="text-[11.5px] text-muted">
          Fact check
        </motion.p>
        {["Four banks: matches your CV", "Eighteen months: matches your dates", "No claim you couldn't back up"].map((t) => (
          <motion.p key={t} variants={item} className="flex items-center gap-2">
            <motion.span variants={tick} className="grid size-4 shrink-0 place-items-center rounded-full bg-go text-white dark:text-neutral-900">
              <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
            </motion.span>
            {t}
          </motion.p>
        ))}
        <motion.p variants={item} className="flex items-center gap-2 border-t border-line pt-3 text-muted">
          <span className="shrink-0 whitespace-nowrap rounded-full bg-signal/10 px-2 py-0.5 text-[11.5px] font-medium text-signal">Ready for you</span> You edit, then approve.
        </motion.p>
      </div>
    </div>
  );
}

const FORM_STEPS = [
  ["Found the online application", "on the school's own site", true],
  ["Created your account", "with your Gmail; the password is encrypted", true],
  ["Filled 6 sections", "84 answers from your profile", true],
  ["Uploaded documents", "CV, transcript, statement of purpose", true],
  ["Application fee", "waiting for you: pay it on the school's site", false],
  ["Submit", "waits for your signature", false],
] as const;

function Forms() {
  return (
    <>
      <motion.div variants={item} className="flex items-center justify-between gap-3 text-[12.5px]">
        <span className="truncate font-medium">Northfield University · MSc Management Analytics</span>
        <span className="shrink-0 text-muted">4 of 6 done</span>
      </motion.div>
      <ol className="mt-4 space-y-3 text-[13.5px]">
        {FORM_STEPS.map(([t, d, done]) => (
          <motion.li key={t} variants={item} className="flex gap-3">
            {done ? (
              <motion.span variants={tick} className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-go text-white dark:text-neutral-900">
                <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
              </motion.span>
            ) : (
              <CircleDot className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
            )}
            <span>
              <span className="block font-medium">{t}</span>
              <span className="text-muted">{d}</span>
            </span>
          </motion.li>
        ))}
      </ol>
    </>
  );
}

function Replies() {
  return (
    <div className="space-y-3 text-[13.5px]">
      <motion.div variants={item} className="rounded-lg border border-line p-3.5">
        <p className="flex items-center gap-2 text-[12px] text-muted">
          <Mail className="size-3.5" aria-hidden /> Admissions, Kingsbridge University · 2 hours ago
        </p>
        <p className="mt-1.5 font-medium">Your application fee waiver</p>
        <p className="mt-1 text-muted">We&apos;re pleased to confirm that your application fee has been waived…</p>
      </motion.div>
      <motion.div variants={item} className="rounded-lg border border-go/25 bg-go/[0.05] p-3.5">
        <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <Mark className="size-3.5" /> What this means
        </p>
        <p className="mt-1">The fee is waived. Nothing to do: the agents carry on with the submission.</p>
      </motion.div>
      <motion.div variants={item} className="flex flex-wrap gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-go/10 px-2.5 py-1 font-medium text-go">
          <Check className="size-3.5" aria-hidden /> Fee waived
        </span>
        <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-muted">Saved to Kingsbridge&apos;s application</span>
      </motion.div>
    </div>
  );
}

const FUNDS = [
  ["Northfield University", "Merit reconsideration: draft ready for you", "admitted"],
  ["Ashby School of Management", "Entrance award applied for", "admitted"],
  ["Kingsbridge University", "Fee waived · scholarship form sent", "under_review"],
] as const;

function Funding() {
  return (
    <>
      <motion.p variants={item} className="text-[12px] text-muted">
        3 asks out · you approved each one
      </motion.p>
      <ul className="mt-2 divide-y divide-line text-[13.5px]">
        {FUNDS.map(([s, d, st]) => (
          <motion.li key={s} variants={item} className="flex items-center gap-3 py-3">
            <HandCoins className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{s}</span>
              <span className="block truncate text-muted">{d}</span>
            </span>
            <StatusPill status={st} />
          </motion.li>
        ))}
      </ul>
    </>
  );
}

// one view's content. `on` plays it in; `fresh` starts it hidden (a replay, or a demo that waits to be seen)
export function ViewBody({ id, on, fresh }: { id: ViewId; on: boolean; fresh?: boolean }) {
  return (
    <motion.div variants={group} initial={fresh ? "hide" : false} animate={on ? "show" : "hide"} className="p-5 sm:p-7">
      {id === "programs" ? <Programs /> : id === "essays" ? <Essays on={on} /> : id === "forms" ? <Forms /> : id === "replies" ? <Replies /> : <Funding />}
    </motion.div>
  );
}

export function TopBar({ path }: { path: string }) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-line px-4 text-[12.5px]">
      <span className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-line" />
        <span className="size-2.5 rounded-full bg-line" />
        <span className="size-2.5 rounded-full bg-line" />
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <Mark className="size-4 shrink-0" />
        <span className="font-medium">Ivyward</span>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={path} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="truncate text-muted">
            {path}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-muted sm:inline-flex">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-go opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-go" />
        </span>
        Agents working
      </span>
    </div>
  );
}

// a single view in its window, for a feature page: plays when it comes into view, and again on `replay`
export function TourStage({ id, replay = 0 }: { id: ViewId; replay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setArmed(true);
  }, []);
  const v = VIEWS.find((x) => x.id === id)!;
  return (
    <div ref={ref} aria-hidden className="overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-lift">
      <TopBar path={v.path} />
      <div className="min-h-[340px]">
        <ViewBody key={`${armed}-${replay}`} id={id} fresh={armed} on={!armed || seen} />
      </div>
    </div>
  );
}

export function ProductTour() {
  const [at, setAt] = useState(0);
  const [auto, setAuto] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(true);
  }, []);
  // phones: the chip row scrolls sideways, so keep the open one in sight (the row only, never the page)
  useEffect(() => {
    const row = chips.current;
    const btn = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row || !btn || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: Math.max(0, btn.offsetLeft - (row.clientWidth - btn.offsetWidth) / 2), behavior: reduce ? "auto" : "smooth" });
  }, [at, reduce]);
  const next = () => setAt((n) => (n + 1) % VIEWS.length);
  const pick = (n: number) => {
    setAuto(false);
    setAt(n);
  };
  const v = VIEWS[at];
  const fill = (vertical?: boolean) =>
    auto ? (
      <span aria-hidden className={`absolute overflow-hidden rounded-full ${vertical ? "inset-x-3 bottom-1 h-[2px] bg-line" : "inset-x-3 bottom-1 h-[2px] bg-white/25 dark:bg-black/20"}`}>
        <span className={`tab-fill block h-full ${vertical ? "bg-ink" : "bg-on-ink"}`} onAnimationEnd={next} />
      </span>
    ) : null;

  return (
    <div ref={ref} className="auto-tabs" data-paused={inView ? undefined : ""}>
      {/* phones and tablets: the views as a row of chips above the window */}
      <div ref={chips} role="tablist" aria-label="What the agents do" className="-mx-5 flex gap-2 overflow-x-auto px-5 py-1 [scrollbar-width:none] lg:hidden">
        {VIEWS.map((x, n) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={n === at}
            aria-controls={`tour-${x.id}`}
            onClick={() => pick(n)}
            className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] transition-colors ${n === at ? "border-ink bg-ink text-on-ink" : "border-line bg-surface text-muted hover:text-foreground"}`}
          >
            <x.Icon className="size-3.5" aria-hidden />
            {x.nav}
            {n === at ? fill() : null}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift lg:mt-0">
        <TopBar path={v.path} />
        <div className="grid lg:grid-cols-[230px_1fr]">
          {/* large screens: the app's own sidebar is the tab list */}
          <div className="hidden flex-col border-r border-line bg-background/50 p-3 lg:flex">
            <div role="tablist" aria-label="What the agents do" aria-orientation="vertical" className="space-y-0.5">
              {VIEWS.map((x, n) => (
                <button
                  key={x.id}
                  role="tab"
                  aria-selected={n === at}
                  aria-controls={`tour-${x.id}`}
                  onClick={() => pick(n)}
                  className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors ${n === at ? "font-medium text-foreground" : "text-muted hover:text-foreground"}`}
                >
                  {n === at ? <motion.span layoutId="tour-pill" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40 }} className="absolute inset-0 rounded-lg bg-foreground/[0.06]" aria-hidden /> : null}
                  <x.Icon className="relative size-4" aria-hidden />
                  <span className="relative">{x.nav}</span>
                  {n === at ? fill(true) : null}
                </button>
              ))}
            </div>
            <p className="mt-auto flex gap-2 px-3 pt-6 text-[12px] leading-snug text-muted">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Nothing goes to a school until you approve it.
            </p>
          </div>
          {/* every view sits in the same grid cell, so the window is as tall as the tallest one and switching never
              moves the page below */}
          <div className="grid min-h-[400px] grid-cols-1">
            {VIEWS.map((x, n) => {
              const on = n === at;
              return (
                <motion.div
                  key={x.id}
                  id={`tour-${x.id}`}
                  role="tabpanel"
                  aria-label={x.nav}
                  aria-hidden={!on}
                  inert={!on}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.28 }}
                  className={`min-w-0 [grid-area:1/1] ${on ? "z-[1]" : "pointer-events-none"}`}
                >
                  <ViewBody id={x.id} on={on} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex min-h-[84px] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={v.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: reduce ? 0 : 0.22 }}>
            <p className="font-serif text-[22px] leading-snug">{v.title}</p>
            <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted">{v.line}</p>
          </motion.div>
        </AnimatePresence>
        <Link href={v.href} className="shrink-0 text-[14px] font-medium underline decoration-line underline-offset-4 transition-colors hover:decoration-foreground sm:pt-1.5">
          {v.more}
        </Link>
      </div>
    </div>
  );
}
