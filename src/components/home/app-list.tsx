"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { StatusPill } from "@/components/ui/status";
import { Bar } from "@/components/motion/count";

export interface AppRow {
  id: string;
  school: string;
  program: string;
  status: string;
  runner: string | null;
  deadline: string | null;
  days: number | null;
  done: number;
  total: number;
  group: "needs" | "writing" | "signed" | "other";
}

const HUES = ["#4f46e5", "#ea580c", "#0f766e", "#be123c", "#7c3aed", "#0369a1", "#a21caf", "#15803d"];
const hue = (s: string) => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
const initials = (s: string) =>
  s
    .replace(/\(.*?\)|university( of)?|the |school( of)?|college/gi, "")
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || s.slice(0, 2).toUpperCase();

export function SchoolTile({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span className={`grid shrink-0 place-items-center font-extrabold text-white ${size === "sm" ? "size-9 rounded-xl text-xs" : "size-11 rounded-[14px] text-[13px]"}`} style={{ background: hue(name) }} aria-hidden>
      {initials(name)}
    </span>
  );
}

// the home list: tabs filter in place, rows lift on hover
export function AppList({ rows }: { rows: AppRow[] }) {
  const tabs: [string, string, AppRow[]][] = [
    ["all", "All", rows],
    ["needs", "Needs you", rows.filter((r) => r.group === "needs")],
    ["writing", "Writing", rows.filter((r) => r.group === "writing")],
    ["signed", "Signed", rows.filter((r) => r.group === "signed")],
  ];
  const [tab, setTab] = useState("all");
  const shown = (tabs.find((t) => t[0] === tab)?.[2] ?? rows).slice(0, 8);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {tabs.map(([k, label, list]) =>
          k === "all" || list.length ? (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${tab === k ? "bg-accent/10 text-accent" : "bg-neutral-100 text-muted hover:text-foreground dark:bg-neutral-800"}`}
            >
              {label} <span className="tabular opacity-70">{list.length}</span>
            </button>
          ) : null,
        )}
      </div>
      <ul className="-mx-2">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((r) => (
            <motion.li key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Link href={`/applications/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-neutral-50 sm:grid-cols-[minmax(0,1fr)_88px_120px_136px] dark:hover:bg-neutral-900">
                <span className="flex min-w-0 items-center gap-3">
                  <SchoolTile name={r.school} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold tracking-[-0.01em]">{r.school}</span>
                    <span className="block truncate text-[12.5px] text-muted">{r.program}</span>
                  </span>
                </span>
                <span className="hidden sm:block">
                  {r.deadline ? (
                    <>
                      <span className="block text-sm font-bold tabular">{new Date(r.deadline + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                      <span className={`text-xs tabular ${r.days !== null && r.days >= 0 && r.days <= 7 && r.group !== "signed" ? "font-semibold text-stop" : "text-muted"}`}>
                        {r.days === null ? "" : r.days < 0 ? "Passed" : r.days === 0 ? "Today" : `${r.days} days`}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted">No date</span>
                  )}
                </span>
                <span className="hidden sm:block">
                  {r.total ? (
                    <>
                      <Bar value={r.done / r.total} />
                      <span className="mt-1 block text-[11.5px] font-semibold text-muted tabular">
                        {r.done} of {r.total} essays
                      </span>
                    </>
                  ) : (
                    <span className="text-[11.5px] font-semibold text-muted">Planning</span>
                  )}
                </span>
                <span className="justify-self-end">
                  <StatusPill status={r.status} runner={r.runner} />
                </span>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
