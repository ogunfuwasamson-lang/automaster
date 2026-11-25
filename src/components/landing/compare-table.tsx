"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { ClipboardList, HandCoins, ListChecks, PenLine, Signature, Wallet } from "lucide-react";
import { Mark } from "@/components/wordmark";

// on your own, with a consultant, or with Ivyward: one table you can read across, row by row, in plain words rather
// than ticks and crosses. the Ivyward column is a band that draws itself down the table when it comes into view.
// phones compare Ivyward with one other way at a time.

const COLS = [
  { key: "own", name: "On your own", line: "You do all of it, for every school." },
  { key: "con", name: "With a consultant", line: "They advise. The forms are still yours." },
  { key: "iv", name: "With Ivyward", line: "Agents do the work. You approve and sign." },
] as const;
type Col = (typeof COLS)[number]["key"];

const ROWS: { k: string; Icon: typeof Wallet; own: string; con: string; iv: string }[] = [
  { k: "Finding programs", Icon: ListChecks, own: "Hours on rankings and program pages", con: "A list from their experience", iv: "Each program's official pages checked against your profile" },
  { k: "Essays", Icon: PenLine, own: "Written from scratch for every school", con: "Edited with you over several calls", iv: "Drafted from your own facts and fact-checked. You edit and approve" },
  { k: "Application forms", Icon: ClipboardList, own: "Every page, for every school, by you", con: "Usually still you", iv: "Accounts created, every page filled, documents uploaded" },
  { k: "Fees and funding", Icon: HandCoins, own: "Up to you to ask", con: "Advice on where to ask", iv: "Fee waivers, scholarships and merit aid asked for you" },
  { k: "Cost", Icon: Wallet, own: "Your time", con: "Often charged per school or as a package", iv: "A free checked shortlist, then credits per application" },
  { k: "Who signs", Icon: Signature, own: "You", con: "You", iv: "You. Nothing is sent without your approval" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

// plays once, when the table is first on screen; the server and people who turn motion off see it finished
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setArmed(true);
  }, []);
  return { ref, shown: !armed || seen, armed };
}

export function CompareTable() {
  const { ref, shown, armed } = useReveal();
  const [other, setOther] = useState<Exclude<Col, "iv">>("own");
  const ivCell = (i: number) => ({
    initial: false as const,
    animate: { opacity: shown ? 1 : 0, y: shown ? 0 : 6 },
    transition: { duration: armed ? 0.45 : 0, delay: armed && shown ? 0.35 + i * 0.09 : 0, ease: EASE },
  });

  return (
    <div ref={ref}>
      {/* tablets and up: the whole table */}
      <div role="table" aria-label="On your own, with a consultant, or with Ivyward" className="relative hidden grid-cols-[1.05fr_1fr_1fr_1.2fr] md:grid">
        {/* the Ivyward band, behind the last column, a little taller than the table */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-3 -top-3 right-0 w-[calc(1.2/4.25*100%)] origin-top rounded-2xl bg-ink shadow-lift"
          initial={false}
          animate={{ scaleY: shown ? 1 : 0, opacity: shown ? 1 : 0 }}
          transition={{ duration: armed ? 0.7 : 0, ease: EASE }}
        />
        <div role="row" className="contents">
          <div role="columnheader" className="px-5 pb-6 pt-4">
            <span className="sr-only">Part of the season</span>
          </div>
          {COLS.map((c) => (
            <div key={c.key} role="columnheader" className={`relative px-5 pb-6 pt-4 ${c.key === "iv" ? "text-on-ink" : ""}`}>
              <motion.div {...(c.key === "iv" ? ivCell(0) : {})}>
                <p className="flex items-center gap-2 font-serif text-[21px] leading-snug">
                  {c.key === "iv" ? <Mark className="size-5 text-[#f0a3bd]! dark:text-brand!" /> : null}
                  {c.name}
                </p>
                <p className={`mt-1 text-[13.5px] leading-snug ${c.key === "iv" ? "text-white/65 dark:text-neutral-600" : "text-muted"}`}>{c.line}</p>
              </motion.div>
            </div>
          ))}
        </div>
        {ROWS.map((r, i) => (
          <div key={r.k} role="row" className="group contents">
            <div role="rowheader" className="flex items-start gap-2.5 border-t border-line px-5 py-5 transition-colors group-hover:bg-foreground/[0.025]">
              <r.Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <span className="text-[15px] font-medium">{r.k}</span>
            </div>
            <div role="cell" className="border-t border-line px-5 py-5 text-[14.5px] leading-snug text-muted transition-colors group-hover:bg-foreground/[0.025]">
              {r.own}
            </div>
            <div role="cell" className="border-t border-line px-5 py-5 text-[14.5px] leading-snug text-muted transition-colors group-hover:bg-foreground/[0.025]">
              {r.con}
            </div>
            <div role="cell" className="relative border-t border-white/10 px-5 py-5 text-[14.5px] leading-snug text-on-ink dark:border-black/10">
              <motion.span className="block" {...ivCell(i + 1)}>
                {r.iv}
              </motion.span>
            </div>
          </div>
        ))}
      </div>

      {/* phones: Ivyward next to one other way, picked above */}
      <div className="md:hidden">
        <div role="radiogroup" aria-label="Compare Ivyward with" className="mx-auto flex w-fit gap-1 rounded-full border border-line bg-surface p-1 text-[13.5px]">
          {COLS.filter((c) => c.key !== "iv").map((c) => (
            <button
              key={c.key}
              role="radio"
              aria-checked={other === c.key}
              onClick={() => setOther(c.key as Exclude<Col, "iv">)}
              className={`rounded-full px-4 py-1.5 transition-colors ${other === c.key ? "bg-ink text-on-ink" : "text-muted hover:text-foreground"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-2 border-b border-line">
            <p className="px-4 py-3 font-serif text-[17px]">{COLS.find((c) => c.key === other)!.name}</p>
            <p className="flex items-center gap-1.5 bg-ink px-4 py-3 font-serif text-[17px] text-on-ink">
              <Mark className="size-4 text-[#f0a3bd]! dark:text-brand!" /> Ivyward
            </p>
          </div>
          {ROWS.map((r) => {
            const label = (
              <>
                <r.Icon className="size-3.5 text-muted" aria-hidden /> {r.k}
              </>
            );
            return (
              <div key={r.k} className="grid grid-cols-2 border-b border-line last:border-0">
                <div className="px-4 pb-3.5 pt-3">
                  <p className="flex items-center gap-2 text-[12.5px] font-medium">{label}</p>
                  <p className="mt-1.5 text-[14px] leading-snug text-muted">{r[other]}</p>
                </div>
                <div className="bg-ink/[0.04] px-4 pb-3.5 pt-3 dark:bg-white/[0.05]">
                  {/* keeps the two answers level: the label's height, without saying it twice */}
                  <p aria-hidden className="invisible flex items-center gap-2 text-[12.5px] font-medium">
                    {label}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-snug">{r.iv}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-10 text-center text-[13px] text-muted">Consultants differ, and some do much more. This is the usual arrangement, not any one firm.</p>
    </div>
  );
}
