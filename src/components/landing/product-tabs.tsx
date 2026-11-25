"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Check, CircleDot, FileText, Mail, Search } from "lucide-react";
import { StatusPill } from "@/components/ui/status";
import { Mark } from "@/components/wordmark";

// the product, one stage at a time: tabs over a framed preview. illustrative data only: every school, person and
// address here is invented, so nothing reads as a real university endorsing Ivyward.
const TABS = ["Find programs", "Write essays", "Fill portals", "Read replies", "Win funding"] as const;
type Tab = (typeof TABS)[number];

function Frame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[12px] text-muted">
        <Mark className="size-4" />
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="truncate">{path}</span>
      </div>
      <div className="min-h-[300px] flex-1 p-4 sm:p-6">{children}</div>
    </div>
  );
}

const PROGRAMS = [
  ["Northfield University", "MSc Management Analytics", "Canada", "Strong", "Merit aid likely"],
  ["Kingsbridge University", "MSc Finance", "United Kingdom", "Strong", "Fee waiver offered"],
  ["Halden Technical University", "MSc Management and Technology", "Germany", "Good", "No tuition"],
  ["Lakemoor Business School", "MSc Business Analytics", "Singapore", "Reach", "Scholarships open"],
  ["Ashby School of Management", "MSc International Business", "Canada", "Good", "Entrance award"],
];

function Body({ tab }: { tab: Tab }) {
  if (tab === "Find programs")
    return (
      <Frame path="Shortlist · fall 2027">
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-[13px] text-muted">
          <Search className="size-3.5" aria-hidden /> Business analytics and finance masters, UK, Canada, Europe, Asia. Funding matters.
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Sample table, scroll sideways">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="text-[11.5px] text-muted">
              <tr className="border-b border-line">
                <th className="py-2 font-normal">School</th>
                <th className="py-2 font-normal">Program</th>
                <th className="py-2 font-normal">Country</th>
                <th className="py-2 font-normal">Fit</th>
                <th className="py-2 font-normal">Money</th>
              </tr>
            </thead>
            <tbody>
              {PROGRAMS.map((r) => (
                <tr key={r[0]} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{r[0]}</td>
                  <td className="py-2.5 pr-3 text-muted">{r[1]}</td>
                  <td className="py-2.5 pr-3 text-muted">{r[2]}</td>
                  <td className="py-2.5 pr-3">{r[3]}</td>
                  <td className="py-2.5 text-muted">{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Frame>
    );
  if (tab === "Write essays")
    return (
      <Frame path="Kingsbridge · Statement of purpose · draft 2">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3 font-serif text-[16px] leading-relaxed">
            <p>
              At a payments startup I closed partnerships with <mark className="rounded bg-go/10 px-0.5 text-inherit">four commercial banks</mark> in eighteen months, and learned how much of fintech is trust, built slowly and then all at once.
            </p>
            <p className="text-muted">Kingsbridge&apos;s finance and technology track is where I want to put numbers behind that instinct…</p>
          </div>
          <div className="space-y-2 text-[13px]">
            <p className="text-[11.5px] text-muted">Fact check</p>
            {["Four banks: matches your CV", "Eighteen months: matches your dates", "No claim you couldn't back up"].map((t) => (
              <p key={t} className="flex items-center gap-2">
                <Check className="size-3.5 text-go" aria-hidden /> {t}
              </p>
            ))}
            <p className="pt-2 text-muted">You edit, then approve. Nothing is sent until you sign.</p>
          </div>
        </div>
      </Frame>
    );
  if (tab === "Fill portals")
    return (
      <Frame path="Northfield · application portal">
        <ol className="space-y-3 text-[13.5px]">
          {[
            ["Found the portal", "apply.northfield.edu", true],
            ["Created your account", "with your Gmail, password saved in Portal logins", true],
            ["Filled 6 sections", "84 answers from your profile", true],
            ["Uploaded documents", "CV, transcript, statement of purpose", true],
            ["Application fee", "waiting for you: pay it on the portal", false],
          ].map(([t, d, done]) => (
            <li key={t as string} className="flex gap-3">
              {done ? <Check className="mt-0.5 size-4 shrink-0 text-go" aria-hidden /> : <CircleDot className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />}
              <span>
                <span className="block font-medium">{t}</span>
                <span className="text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </Frame>
    );
  if (tab === "Read replies")
    return (
      <Frame path="Messages · Kingsbridge University">
        <div className="space-y-3 text-[13.5px]">
          <div className="rounded-lg border border-line p-3">
            <p className="flex items-center gap-2 text-[12px] text-muted">
              <Mail className="size-3.5" aria-hidden /> admissions@kingsbridge.edu · 2 hours ago
            </p>
            <p className="mt-1.5 font-medium">Your application fee waiver</p>
            <p className="mt-1 text-muted">We&apos;re pleased to confirm that your application fee has been waived…</p>
          </div>
          <div className="rounded-lg border border-line bg-background p-3">
            <p className="text-[11.5px] text-muted">What this means</p>
            <p className="mt-1">The fee is waived. Nothing to do: the agents carry on with the submission.</p>
          </div>
        </div>
      </Frame>
    );
  return (
    <Frame path="Offers · funding">
      <ul className="divide-y divide-line text-[13.5px]">
        {[
          ["Northfield University", "Admitted", "Asked for merit reconsideration: draft ready", "admitted"],
          ["Ashby School of Management", "Admitted", "Entrance award applied for", "admitted"],
          ["Kingsbridge University", "Under review", "Scholarship form submitted", "under_review"],
        ].map(([s, , d, st]) => (
          <li key={s} className="flex items-center gap-3 py-3">
            <FileText className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{s}</span>
              <span className="block truncate text-muted">{d}</span>
            </span>
            <StatusPill status={st} />
          </li>
        ))}
      </ul>
    </Frame>
  );
}

// the tabs move on by themselves while they're on screen (a bar fills under the open one), pause while the pointer
// is over them, and stop for good once someone picks a tab. no auto-advance for people who turn motion off.
export function ProductTabs() {
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [auto, setAuto] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(true);
  }, []);
  const list = useRef<HTMLDivElement>(null);
  const next = () => setTab((t) => TABS[(TABS.indexOf(t) + 1) % TABS.length]);
  // phones: the tab row scrolls sideways, so keep the open tab in sight (the row only, never the page)
  useEffect(() => {
    const row = list.current;
    const btn = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row || !btn || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: Math.max(0, btn.offsetLeft - (row.clientWidth - btn.offsetWidth) / 2), behavior: reduce ? "auto" : "smooth" });
  }, [tab, reduce]);
  return (
    <div ref={ref} className="auto-tabs" data-paused={inView ? undefined : ""}>
      <div ref={list} role="tablist" aria-label="What the agents do" className="relative flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setAuto(false);
              setTab(t);
            }}
            className={`relative shrink-0 px-4 py-3 text-sm transition-colors sm:flex-1 ${tab === t ? "text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {t}
            {tab === t && (
              <motion.span
                layoutId="product-tab-ink"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }}
                className={`absolute inset-x-4 -bottom-px h-[2px] overflow-hidden ${auto ? "bg-line" : "bg-ink"}`}
                aria-hidden
              >
                {auto ? <span className="tab-fill block h-full bg-ink" onAnimationEnd={next} /> : null}
              </motion.span>
            )}
          </button>
        ))}
      </div>
      {/* every panel sits in the same grid cell, so the area is as tall as the tallest one and switching tabs never
          moves the page below */}
      <div className="mt-6 grid grid-cols-1">
        {TABS.map((t) => {
          const on = t === tab;
          return (
            <motion.div
              key={t}
              role="tabpanel"
              aria-label={t}
              aria-hidden={!on}
              inert={!on}
              initial={false}
              animate={{ opacity: on ? 1 : 0, y: on ? 0 : 8 }}
              transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1], delay: on && !reduce ? 0.06 : 0 }}
              className={`min-w-0 [grid-area:1/1] ${on ? "z-[1]" : "pointer-events-none"}`}
            >
              <Body tab={t} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
