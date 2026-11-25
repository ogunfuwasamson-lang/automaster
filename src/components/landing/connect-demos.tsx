"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Bell, CalendarDays, Check, CircleDot, FileText, LoaderCircle, Lock, Mail, Puzzle, RefreshCw } from "lucide-react";
import { Mark } from "@/components/wordmark";

// the three "works with" cards on the landing page (Gmail, Google Calendar, the Chrome extension), each with a small
// coded demo of the thing working. a demo plays through once when it scrolls into view, then holds its finished
// state; pointing at a card plays it again. the server, people who turn motion off, and anyone who never scrolls that
// far see the finished state. every school and person here is invented, like the rest of the landing page.
//
// the words only claim what ships: the inbox watcher reads school mail and changes nothing there (lib/inbox), the
// calendar sync adds deadlines with reminders 7, 2 and 1 days before plus dates from school emails
// (lib/calendar-plan), and the extension fills portals in the applicant's Chrome, waits for their yes before
// submitting and checks submitted portals weekly (extension/).

const EASE = [0.16, 1, 0.3, 1] as const;
const T = { duration: 0.42, ease: EASE };

// steps 0..last, one every `every` ms: once when the demo first comes into view, then again each time `replay` ticks
function useScript(last: number, every: number, delay: number, replay: number) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.45 });
  const [armed, setArmed] = useState(false);
  const [step, setStep] = useState(last);
  const timers = useRef(new Set<number>());
  const playing = useRef(false);

  const play = useCallback(
    (wait: number) => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      playing.current = true;
      setStep(0);
      for (let i = 1; i <= last; i++) {
        const id = window.setTimeout(() => {
          setStep(i);
          if (i === last) playing.current = false;
        }, wait + every * i);
        timers.current.add(id);
      }
    },
    [last, every],
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // rewound before it's seen: the section sits well below the fold, so nobody watches the jump
    setArmed(true);
    setStep(0);
  }, []);
  useEffect(() => {
    if (armed && seen) play(delay);
  }, [armed, seen, delay, play]);
  // a replay waits for the current run to finish, so moving the pointer in and out doesn't restart it
  useEffect(() => {
    if (armed && replay > 0 && !playing.current) play(0);
  }, [armed, replay, play]);
  useEffect(() => {
    const set = timers.current;
    return () => set.forEach(clearTimeout);
  }, []);
  return { ref, step };
}

// shown, or waiting off to one side
const show = (on: boolean, from: { x?: number; y?: number } = { y: -8 }) => ({ opacity: on ? 1 : 0, x: on ? 0 : (from.x ?? 0), y: on ? 0 : (from.y ?? 0) });

function Stage({ stageRef, glow, children }: { stageRef: React.Ref<HTMLDivElement>; glow: string; children: ReactNode }) {
  return (
    <div
      ref={stageRef}
      aria-hidden
      className="relative h-[380px] overflow-hidden border-b border-line"
      style={{
        background: `radial-gradient(110% 80% at ${glow}, color-mix(in oklab, var(--brand) 15%, transparent), transparent 62%), radial-gradient(80% 70% at 50% 110%, color-mix(in oklab, var(--wash) 10%, transparent), transparent 70%)`,
      }}
    >
      {children}
    </div>
  );
}

// a window that runs off the bottom of the stage, like a screen seen through a frame
function Window({ bar, children }: { bar: ReactNode; children: ReactNode }) {
  return (
    <div className="absolute bottom-0 left-1/2 top-7 w-[calc(100%-40px)] max-w-[420px] -translate-x-1/2 overflow-hidden rounded-t-xl border border-b-0 border-line bg-surface shadow-lift">
      <div className="flex h-10 items-center gap-2 border-b border-line px-3.5 text-[12px] text-muted">{bar}</div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

// a status card floating over the bottom of the stage
function Float({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass absolute bottom-4 left-1/2 w-[calc(100%-64px)] max-w-[380px] -translate-x-1/2 rounded-xl border border-line shadow-lift ${className}`}>{children}</div>;
}

/* ---------- Gmail: each school email arrives, is read, and gets its meaning ---------- */

const TONE = {
  go: "bg-go/10 text-go",
  brand: "bg-brand/10 text-brand",
  signal: "bg-signal/10 text-signal",
} as const;

const MAILS = [
  { from: "Kingsbridge University", when: "9:12 am", subject: "Your application fee waiver", tag: "Fee waived. Nothing to do", tone: "go", Icon: Check },
  { from: "Northfield Graduate School", when: "Yesterday", subject: "Interview invitation: MSc Management Analytics", tag: "Interview added to your calendar", tone: "brand", Icon: CalendarDays },
  { from: "Halden Technical University", when: "Mon", subject: "Documents needed for your application", tag: "Needs you: a certified transcript", tone: "signal", Icon: CircleDot },
] as const;

function InboxDemo({ delay, replay }: { delay: number; replay: number }) {
  // per email: it arrives, Ivyward reads it, then says what it means
  const { ref, step } = useScript(MAILS.length * 3, 430, delay, replay);
  const read = MAILS.filter((_, i) => step >= i * 3 + 3).length;
  return (
    <Stage stageRef={ref} glow="0% 0%">
      <Window
        bar={
          <>
            <Mail className="size-3.5" aria-hidden />
            <span className="font-medium text-foreground">Inbox</span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-go opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-go" />
              </span>
              <span className="tabular-nums">{read ? `${read} school ${read === 1 ? "reply" : "replies"} read` : "Watching for school mail"}</span>
            </span>
          </>
        }
      >
        <ul className="space-y-2">
          {MAILS.map((m, i) => {
            const reading = step === i * 3 + 2;
            const known = step >= i * 3 + 3;
            return (
              <motion.li key={m.from} initial={false} animate={show(step >= i * 3 + 1)} transition={T} className="rounded-lg border border-line bg-background/70 px-3 py-2.5">
                <p className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="truncate font-semibold">{m.from}</span>
                  <span className="shrink-0 text-[11.5px] text-muted">{m.when}</span>
                </p>
                <p className="truncate text-[12.5px] text-muted">{m.subject}</p>
                <motion.p
                  initial={false}
                  animate={show(reading || known, { x: -8 })}
                  transition={T}
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors duration-300 ${known ? TONE[m.tone] : "bg-foreground/[0.06] text-muted"}`}
                >
                  {known ? (
                    <>
                      <m.Icon className="size-3.5" aria-hidden /> {m.tag}
                    </>
                  ) : (
                    <>
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Reading
                    </>
                  )}
                </motion.p>
              </motion.li>
            );
          })}
        </ul>
      </Window>
    </Stage>
  );
}

/* ---------- Google Calendar: the dates drop in, then a reminder ---------- */

const DAYS = ["Mon 7", "Tue 8", "Wed 9", "Thu 10", "Fri 11"];
const EVENTS = [
  { day: 0, title: "Northfield interview", meta: "3:00 pm · video call", bar: "bg-foreground/70" },
  { day: 2, title: "Due: certified transcript", meta: "Halden Technical University", bar: "bg-signal" },
  { day: 3, title: "Kingsbridge deadline", meta: "MSc Finance · all day · 3 reminders", bar: "bg-brand" },
];

function CalendarDemo({ delay, replay }: { delay: number; replay: number }) {
  const last = EVENTS.length + 2;
  const { ref, step } = useScript(last, 600, delay, replay);
  const synced = step > EVENTS.length;
  return (
    <Stage stageRef={ref} glow="50% 0%">
      <Window
        bar={
          <>
            <CalendarDays className="size-3.5" aria-hidden />
            <span className="font-medium text-foreground">December 2026</span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              {synced ? <Check className="size-3.5 text-go" aria-hidden /> : <RefreshCw className="size-3.5 animate-spin [animation-duration:1.6s]" aria-hidden />}
              {synced ? "In step with Ivyward" : "Adding your dates"}
            </span>
          </>
        }
      >
        <div className="grid grid-cols-5 gap-1 border-b border-line pb-2.5 text-center">
          {DAYS.map((d, i) => {
            const ev = EVENTS.findIndex((e) => e.day === i);
            const lit = ev >= 0 && step >= ev + 1;
            const [name, num] = d.split(" ");
            return (
              <div key={d} className="text-[11px] text-muted">
                {name}
                <motion.span
                  initial={false}
                  animate={{ scale: lit ? [1, 1.18, 1] : 1 }}
                  transition={{ duration: 0.4 }}
                  className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors duration-300 ${lit ? "bg-ink font-semibold text-on-ink" : "text-foreground"}`}
                >
                  {num}
                </motion.span>
              </div>
            );
          })}
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {EVENTS.map((e, i) => (
            <motion.li key={e.title} initial={false} animate={show(step >= i + 1, { y: -10 })} transition={T} className="grid grid-cols-[44px_1fr] items-center gap-2">
              <span className="text-[11px] text-muted">{DAYS[e.day]}</span>
              <span className="flex min-w-0 gap-2 rounded-md bg-background/80 py-1.5 pl-1.5 pr-2.5">
                <span className={`w-[3px] shrink-0 rounded-full ${e.bar}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium">{e.title}</span>
                  <span className="block truncate text-[11px] text-muted">{e.meta}</span>
                </span>
              </span>
            </motion.li>
          ))}
        </ul>
      </Window>
      <motion.div
        initial={false}
        animate={{ opacity: step >= last ? 1 : 0, y: step >= last ? 0 : 14, scale: step >= last ? 1 : 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="glass absolute bottom-4 left-1/2 flex w-[calc(100%-64px)] max-w-[380px] -translate-x-1/2 items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 shadow-lift"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Bell className="size-3.5" aria-hidden />
        </span>
        <span className="min-w-0 text-[12px] leading-snug">
          <span className="block font-medium">Kingsbridge deadline in 2 days</span>
          <span className="block truncate text-muted">Reminder · 9:00 am · open the application</span>
        </span>
      </motion.div>
    </Stage>
  );
}

/* ---------- Chrome: a portal page is filled, waits for a yes, then goes ---------- */

const FIELDS = [
  ["Undergraduate university", "Eastgate University"],
  ["Degree", "BSc Economics"],
  ["Grade point average", "4.21 out of 5.00"],
  ["Transcript", "Transcript.pdf"],
] as const;

function PortalDemo({ delay, replay }: { delay: number; replay: number }) {
  const n = FIELDS.length;
  // fields one by one, then: every page filled, a held beat waiting for the applicant, their yes, sent
  const last = n + 4;
  const { ref, step } = useScript(last, 520, delay, replay);
  const filled = Math.min(step, n);
  const ready = step > n;
  const pressing = step === n + 3;
  const sent = step >= last;
  const title = sent ? "Submitted" : pressing ? "Submitting" : ready ? "Every page is filled" : "Ivyward is filling page 3 of 5";
  const sub = sent ? "Sent after you said yes" : pressing ? "You said yes" : ready ? "Waiting for you to review it" : `${filled} of ${n} answers on this page`;
  return (
    <Stage stageRef={ref} glow="100% 0%">
      <Window
        bar={
          <>
            <span className="flex gap-1" aria-hidden>
              <span className="size-2 rounded-full bg-line" />
              <span className="size-2 rounded-full bg-line" />
              <span className="size-2 rounded-full bg-line" />
            </span>
            <span className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-background px-2 py-1">
              <Lock className="size-3 shrink-0" aria-hidden />
              <span className="truncate">Graduate application · Northfield</span>
            </span>
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-300 ${ready ? "border-line" : "border-brand/40 bg-brand/10"}`}>
              <Mark className="size-3.5" />
            </span>
          </>
        }
      >
        <p className="text-[11.5px] text-muted">Page 3 of 5 · Education</p>
        <div className="mt-2.5 space-y-2">
          {FIELDS.map(([label, value], i) => {
            const on = step >= i + 1;
            return (
              <div key={label} className="grid grid-cols-[38%_1fr] items-center gap-2">
                <span className="text-[11.5px] leading-tight text-muted">{label}</span>
                <span className={`flex h-8 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[12.5px] transition-colors duration-500 ${on ? "border-go/35 bg-go/[0.05]" : "border-line bg-background"}`}>
                  {label === "Transcript" ? <FileText className={`size-3.5 shrink-0 transition-opacity ${on ? "text-muted opacity-100" : "opacity-0"}`} aria-hidden /> : null}
                  {/* typed in: the value is uncovered left to right */}
                  <motion.span className="min-w-0 truncate" initial={false} animate={{ clipPath: on ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }} transition={{ duration: 0.4, ease: "linear" }}>
                    {value}
                  </motion.span>
                  <Check className={`ml-auto size-3.5 shrink-0 text-go transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`} aria-hidden />
                </span>
              </div>
            );
          })}
        </div>
      </Window>
      <Float className="px-3.5 py-3">
        <div className="flex items-center gap-2.5 text-[12px]">
          <Mark className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 leading-snug">
            <span className="block truncate font-medium">{title}</span>
            <span className="block truncate text-muted">{sub}</span>
          </span>
        </div>
        <div className="mt-2.5 flex h-7 items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <motion.div className="h-full origin-left rounded-full bg-go" initial={false} animate={{ scaleX: ready ? 1 : filled / n }} transition={T} />
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            {sent ? (
              <motion.span key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={T} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-go/10 px-3 py-1.5 text-[11.5px] font-medium text-go">
                <Check className="size-3.5" aria-hidden /> Sent
              </motion.span>
            ) : ready ? (
              <motion.span
                key="review"
                initial={{ opacity: 0, scale: 0.9, x: 6 }}
                animate={{ opacity: 1, scale: pressing ? 0.94 : 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={T}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[11.5px] font-medium text-on-ink"
              >
                {pressing ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
                Review and submit
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </Float>
    </Stage>
  );
}

/* ---------- the cards ---------- */

function Card({ tool, Icon, title, demo, children }: { tool: string; Icon: typeof Mail; title: string; demo: (replay: number) => ReactNode; children: ReactNode }) {
  const [replay, setReplay] = useState(0);
  return (
    <article
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setReplay((r) => r + 1);
      }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(9_9_11/0.04)] transition-[border-color,box-shadow] duration-300 hover:border-foreground/20 hover:shadow-lift"
    >
      {demo(replay)}
      <div className="flex-1 px-7 pb-8 pt-6">
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Icon className="size-4" aria-hidden /> {tool}
        </p>
        <h3 className="mt-3 font-serif text-[23px] leading-snug">{title}</h3>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-muted">{children}</p>
      </div>
    </article>
  );
}

export function ConnectCards() {
  return (
    <div className="mt-14 grid gap-5 lg:grid-cols-3">
      <Card tool="Gmail" Icon={Mail} title="School replies, read for you." demo={(r) => <InboxDemo delay={150} replay={r} />}>
        Ivyward reads what your schools send: decisions, interview invites, document requests, fee-waiver replies. Anything that needs you goes to the top of your list. Nothing in your inbox is moved or deleted.
      </Card>
      <Card tool="Google Calendar" Icon={CalendarDays} title="Deadlines land on your calendar." demo={(r) => <CalendarDemo delay={650} replay={r} />}>
        Every application deadline goes on your calendar, with reminders a week, two days and a day before. Interviews, webinars and due dates from school emails are added too, each linked to its application.
      </Card>
      <Card tool="Ivyward for Chrome" Icon={Puzzle} title="Portals filled in your own browser." demo={(r) => <PortalDemo delay={1150} replay={r} />}>
        Some portals only work in your own Chrome. The Ivyward extension fills them there, page by page, then waits for your yes before anything is submitted. Each week it checks your submitted portals for updates.
      </Card>
    </div>
  );
}
