import type { ReactNode } from "react";
import { TERMS, bonusFor, naira, nextBonus, weeksOf } from "@/lib/creator-terms";

// the creator studio's building blocks (server-rendered)

export function Box({ title, note, action, children, className = "" }: { title?: ReactNode; note?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`}>
      {title ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="font-serif text-[20px] leading-snug">{title}</h2>
            {note ? <p className="mt-0.5 text-[13.5px] text-muted">{note}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: "go" | "signal" }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card">
      <p className="truncate text-[12.5px] text-muted">{label}</p>
      <p className={`mt-1 font-serif text-[26px] leading-none tabular-nums ${tone === "go" ? "text-go" : tone === "signal" ? "text-signal" : ""}`}>{value}</p>
      {sub ? <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{sub}</p> : null}
    </div>
  );
}

// qualified sign-ups this month: where pay starts, the target, and the bonus steps past it
export function TargetMeter({ qualified }: { qualified: number }) {
  const top = Math.max(TERMS.target + 3 * TERMS.bonusStep, Math.ceil((qualified + 1) / TERMS.bonusStep) * TERMS.bonusStep);
  const share = Math.min(1, qualified / top);
  const steps = Array.from({ length: Math.floor((top - TERMS.target) / TERMS.bonusStep) }, (_, i) => TERMS.target + (i + 1) * TERMS.bonusStep);
  const nb = nextBonus(qualified);
  const toPay = TERMS.payFrom - qualified;
  const left = TERMS.target - qualified;
  const at = (n: number) => `${(n / top) * 100}%`;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p>
          <span className="font-serif text-[56px] leading-none tabular-nums tracking-[-0.02em] sm:text-[64px]">{qualified.toLocaleString()}</span>
          <span className="ml-2 text-[15px] text-muted">of {TERMS.target.toLocaleString()} qualified sign-ups</span>
        </p>
        <p className="text-[14px] text-muted">
          {toPay > 0 ? (
            <>
              <span className="font-medium text-foreground">{toPay.toLocaleString()} more</span> and this month starts paying
            </>
          ) : left > 0 ? (
            <>
              This month is paying. <span className="font-medium text-foreground">{left.toLocaleString()} to go</span> to the target
            </>
          ) : (
            <>
              Target reached. <span className="font-medium text-foreground">{nb.need} more</span> for a {naira(nb.bonus)} bonus
            </>
          )}
        </p>
      </div>
      <div className="relative mt-5" role="img" aria-label={`${qualified} qualified sign-ups this month. Pay starts at ${TERMS.payFrom}; the target is ${TERMS.target}.`}>
        <div className="h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div className={`h-full rounded-full transition-[width] duration-700 ${toPay > 0 ? "bg-brand/55" : "bg-brand"}`} style={{ width: `${share * 100}%` }} />
        </div>
        {[TERMS.payFrom, TERMS.target, ...steps].map((m) => (
          <span key={m} className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-surface" style={{ left: at(m) }} aria-hidden />
        ))}
        <div className="relative mt-2 h-4 text-[11.5px] tabular-nums text-muted" aria-hidden>
          <span className="absolute left-0">0</span>
          <span className={`absolute -translate-x-1/2 whitespace-nowrap ${toPay > 0 ? "font-semibold text-foreground" : ""}`} style={{ left: at(TERMS.payFrom) }}>
            {TERMS.payFrom} pay starts
          </span>
          <span className={`absolute -translate-x-1/2 whitespace-nowrap ${toPay <= 0 && left > 0 ? "font-semibold text-foreground" : ""}`} style={{ left: at(TERMS.target) }}>
            {TERMS.target.toLocaleString()}
            <span className="hidden sm:inline"> target</span>
          </span>
          <span className="absolute right-0">{top.toLocaleString()}</span>
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-muted">
        A month pays once it reaches {TERMS.payFrom} qualified sign-ups: then {naira(TERMS.rate)} for every one of them. Each mark past {TERMS.target.toLocaleString()} adds {naira(TERMS.bonusPerStep)} to the month&apos;s bonus.
      </p>
    </div>
  );
}

// from a visit to a qualified sign-up, this month
export function Funnel({ steps }: { steps: [string, number, string][] }) {
  const top = Math.max(1, steps[0]?.[1] ?? 1);
  return (
    <ol className="space-y-3.5">
      {steps.map(([label, n, hint], i) => {
        const prev = i ? steps[i - 1][1] : null;
        return (
          <li key={label}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="font-medium">{label}</span>
              <span className="tabular-nums">
                {n.toLocaleString()}
                {prev !== null ? <span className="ml-2 text-[12.5px] text-muted">{prev ? `${Math.round((n / prev) * 100)}%` : "0%"}</span> : null}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className={`h-full rounded-full ${i === steps.length - 1 ? "bg-brand" : "bg-foreground/70"}`} style={{ width: `${(n / top) * 100}%` }} />
            </div>
            <p className="mt-1 text-[12px] text-muted">{hint}</p>
          </li>
        );
      })}
    </ol>
  );
}

// what a month pays at each step: nothing below the pay floor, then every qualified sign-up, then a bonus for every
// hundred past the target
export function PayLadder({ qualified, rate }: { qualified: number; rate: number }) {
  const rows = [TERMS.payFrom - 1, TERMS.payFrom, 600, 1000, TERMS.target, 1600, 1700, 2000];
  const pay = (q: number) => (q >= TERMS.payFrom ? q * rate : 0);
  return (
    <table className="w-full text-[14px]">
      <thead>
        <tr className="text-left text-[12px] text-muted">
          <th className="pb-2 font-medium">Qualified</th>
          <th className="pb-2 text-right font-medium">Base</th>
          <th className="pb-2 text-right font-medium">Bonus</th>
          <th className="pb-2 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map((q, i) => {
          const here = i === 0 ? qualified < TERMS.payFrom : qualified >= q && (i === rows.length - 1 || qualified < rows[i + 1]);
          return (
            <tr key={q} className={`border-t border-line ${here ? "bg-brand/[0.06] font-medium" : ""}`}>
              <td className="py-2 pl-2">
                {i === 0 ? `Under ${TERMS.payFrom}` : q.toLocaleString()}
                {q === TERMS.payFrom ? <span className="ml-1.5 text-[12px] text-muted">pay starts</span> : null}
                {q === TERMS.target ? <span className="ml-1.5 text-[12px] text-muted">target</span> : null}
                {here ? <span className="ml-1.5 text-[12px] text-brand">you&apos;re here</span> : null}
              </td>
              <td className="py-2 text-right">{naira(pay(q))}</td>
              <td className="py-2 text-right text-muted">{bonusFor(q) ? naira(bonusFor(q)) : "·"}</td>
              <td className="py-2 pr-2 text-right">{naira(pay(q) + bonusFor(q))}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// the weeks of this month and whether each has a video, for "at least one a week"
export function WeekDots({ month, days, today }: { month: string; days: string[]; today: string }) {
  const weeks = weeksOf(month);
  return (
    <ul className="grid grid-cols-2 gap-2 sm:[grid-template-columns:repeat(var(--weeks),minmax(0,1fr))]" style={{ ["--weeks" as string]: weeks.length }}>
      {weeks.map((w, i) => {
        const n = days.filter((d) => d >= w.from && d <= w.to).length;
        // a week that hasn't ended yet isn't missed
        const open = w.to >= today;
        const now = w.from <= today && today <= w.to;
        return (
          <li key={w.from} className={`rounded-2xl border px-3 py-2.5 ${n ? "border-go/30 bg-go/[0.06]" : open ? "border-dashed border-line" : "border-signal/30 bg-signal/[0.05]"}`}>
            <p className="text-[12px] text-muted">Week {i + 1}</p>
            <p className={`mt-0.5 text-[13.5px] font-medium ${n ? "text-go" : open ? "text-muted" : "text-signal"}`}>{n ? `${n} video${n === 1 ? "" : "s"}` : now ? "This week" : open ? "Coming up" : "No video"}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {Number(w.from.slice(8))}–{Number(w.to.slice(8))}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function StatusPill({ status }: { status: string }) {
  const t: Record<string, [string, string]> = {
    qualified: ["Qualified", "bg-go/10 text-go"],
    pending: ["In progress", "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"],
    duplicate: ["Duplicate", "bg-signal/10 text-signal"],
    rejected: ["Not counted", "bg-stop/10 text-stop"],
    submitted: ["Submitted", "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"],
    approved: ["Approved", "bg-go/10 text-go"],
    paid: ["Paid", "bg-go/10 text-go"],
    waiting: ["On its way", "bg-signal/10 text-signal"],
    changes: ["Needs changes", "bg-signal/10 text-signal"],
    declined: ["Not paid", "bg-stop/10 text-stop"],
  };
  const [label, cls] = t[status] ?? [status, "bg-neutral-100 text-neutral-600"];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-lg px-2 py-0.5 text-[12px] font-semibold ${cls}`}>{label}</span>;
}

export const shortDay = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: iso.length === 10 ? "UTC" : "Africa/Lagos" });
