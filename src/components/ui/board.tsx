"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

// the departures board: every application is a departure. the one loud element in the product.

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// a split-flap cell: on first paint it rattles through letters and lands on its text, left to right
export function Flap({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? text : text.replace(/\S/g, " "));
  useEffect(() => {
    if (reduce) {
      setShown(text);
      return;
    }
    // time-based, so a throttled background tab still lands on the text on schedule
    const duration = 520 + Math.min(text.length, 18) * 38;
    let t: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      const began = Date.now();
      t = setInterval(() => {
        const elapsed = Date.now() - began;
        if (elapsed >= duration) {
          clearInterval(t);
          setShown(text);
          return;
        }
        const frame = Math.floor(elapsed / 38);
        const settled = Math.floor((elapsed / duration) * text.length);
        setShown(
          text
            .split("")
            .map((c, i) => (i < settled || c === " " ? c : GLYPHS[(i * 7 + frame * 3) % GLYPHS.length]))
            .join(""),
        );
      }, 38);
    }, delay);
    return () => {
      clearTimeout(start);
      if (t) clearInterval(t);
    };
  }, [text, delay, reduce]);
  return (
    <span className={`flap inline-block px-1.5 py-0.5 ${className}`} aria-label={text}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}

export interface BoardRow {
  id: string;
  href?: string;
  departs: string | null; // YYYY-MM-DD
  school: string;
  city?: string | null;
  program: string;
  status: string; // display text
  tone: "quiet" | "plain" | "signal" | "go" | "stop";
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fmt = (d: string | null) => (d ? `${d.slice(8, 10)} ${MONTHS[Number(d.slice(5, 7)) - 1]}` : "TBC");

const STATUS_TONE = {
  quiet: "text-[#8a93a6]",
  plain: "text-flap",
  signal: "text-signal",
  go: "text-[#5fd3a1]",
  stop: "text-[#ff7b86]",
};

function shortSchool(name: string) {
  // "Alliance Manchester Business School, University of Manchester" → "Manchester"
  const n = name.replace(/\(.*?\)/g, "").trim();
  const uni = n.match(/University of ([A-Z][\w'’.-]+(?: [A-Z][\w'’.-]+)?)/);
  if (uni) return uni[1];
  return n.split(",")[0].replace(/^(The )?/, "").replace(/ (University|School of Business|Business School|College)$/i, "").slice(0, 22);
}

export function DeparturesBoard({ rows, title = "Departures", animate = true, empty }: { rows: BoardRow[]; title?: string; animate?: boolean; empty?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-board text-flap ring-1 ring-black/5 dark:ring-white/10">
      <div className="border-b border-white/8 px-4 pt-3 sm:px-5">
        <p className="font-display text-xl font-semibold tracking-wide text-signal">{title}</p>
        <div className="mt-2 hidden grid-cols-[5rem_minmax(0,9rem)_minmax(0,1fr)_8.5rem] gap-x-3 pb-2 text-xs text-[#8a93a6] sm:grid" aria-hidden>
          <span>Deadline</span>
          <span>Destination</span>
          <span>Program</span>
          <span className="justify-self-end">Status</span>
        </div>
      </div>
      {rows.length ? (
        <ol className="divide-y divide-white/6">
          {rows.map((r, i) => {
            const inner = (
              <div className="grid grid-cols-[4.5rem_1fr] items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:grid-cols-[5rem_minmax(0,9rem)_minmax(0,1fr)_8.5rem] sm:px-5">
                <Flap text={fmt(r.departs)} delay={animate ? i * 90 : 0} className="justify-self-start text-[15px] tabular" />
                <span className="truncate font-display text-lg font-semibold uppercase tracking-wide text-flap">{shortSchool(r.school)}</span>
                <span className="col-start-2 truncate text-[13px] text-[#b9c0cd] sm:col-start-auto">{r.program}</span>
                <span className={`col-start-2 font-display text-base font-semibold uppercase tracking-wider sm:col-start-auto sm:justify-self-end ${STATUS_TONE[r.tone]}`}>
                  {r.tone === "signal" ? <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-signal align-middle" aria-hidden /> : null}
                  {r.status}
                </span>
              </div>
            );
            return <li key={r.id}>{r.href ? <Link href={r.href} className="block transition-colors hover:bg-white/4 focus-visible:bg-white/6">{inner}</Link> : inner}</li>;
          })}
        </ol>
      ) : (
        <div className="px-5 py-8 text-sm text-[#b9c0cd]">{empty ?? "No departures yet."}</div>
      )}
    </div>
  );
}
