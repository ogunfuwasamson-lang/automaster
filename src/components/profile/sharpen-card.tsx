"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { chipClass } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { CITIZENSHIPS } from "@/lib/open-scholarships";
import type { SharpenQuestion } from "@/lib/sharpen";

type Open = { name: string; href: string; note: string };
type State = { next: SharpenQuestion | null; done: number; total: number; scholarships: Open[] };

// one question, as taps (or a country list for citizenship). shared by the account card and the public matcher.
export function SharpenQuestionView({ q, busy, onAnswer }: { q: SharpenQuestion; busy: boolean; onAnswer: (value: string) => void }) {
  const [country, setCountry] = useState("");
  const [other, setOther] = useState("");
  return (
    <div>
      <p className="text-[17px] font-bold leading-snug tracking-[-0.02em]">{q.ask}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{q.why}</p>
      {q.options.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {q.options.map((o) => (
            <button key={o.value} type="button" disabled={busy} onClick={() => onAnswer(o.value)} className={chipClass(false, "md")}>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = country === "other" ? other.trim() : country;
            if (v) onAnswer(v);
          }}
        >
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label="Your passport"
            className="h-10 rounded-lg border border-line bg-surface px-3 text-[14.5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <option value="">Choose a country</option>
            {CITIZENSHIPS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="other">Another country</option>
          </select>
          {country === "other" && (
            <input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Country"
              aria-label="Country"
              className="h-10 w-44 rounded-lg border border-line bg-surface px-3 text-[14.5px]"
            />
          )}
          <Button type="submit" variant="secondary" disabled={busy || !(country === "other" ? other.trim() : country)}>
            Save
          </Button>
        </form>
      )}
      <button type="button" disabled={busy} onClick={() => onAnswer("skip")} className="mt-3 text-[13px] text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">
        Skip this one
      </button>
    </div>
  );
}

export function OpenScholarships({ items, citizenship }: { items: Open[]; citizenship?: string | null }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl bg-go/[0.06] p-4 ring-1 ring-go/20">
      <p className="text-[14px] font-semibold">{citizenship ? `Big scholarships open to citizens of ${citizenship}` : "Big scholarships open to you"}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((s) => (
          <li key={s.href} className="text-[13.5px] leading-snug">
            <Link href={s.href} target="_blank" className="font-medium text-foreground underline decoration-current/25 underline-offset-4 hover:text-brand">
              {s.name}
            </Link>
            <span className="text-muted">: {s.note}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12.5px] text-muted">Your agents check each one against your profile and add the ones that fit to your shortlist.</p>
    </div>
  );
}

// "Sharpen your matches" for a signed-in applicant (lib/sharpen): one question at a time, each answer saved and the
// matches re-ranked (onAnswered). shown on the setup matches screen and as a daily task on the dashboard.
export function SharpenCard({ onAnswered, framed = true }: { onAnswered?: () => void; framed?: boolean }) {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(0); // questions answered in this sitting, for the "updated" note

  useEffect(() => {
    fetch("/api/profile/sharpen")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setS(j))
      .catch(() => {});
  }, []);

  async function answer(value: string) {
    if (!s?.next) return;
    setBusy(true);
    const r = await fetch("/api/profile/sharpen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: s.next.key, value }) }).catch(() => null);
    const j = r?.ok ? ((await r.json()) as State) : null;
    setBusy(false);
    if (!j) {
      toast.error("Couldn't save that. Try again.");
      return;
    }
    setS(j);
    if (value !== "skip") setShown((n) => n + 1);
    onAnswered?.();
  }

  if (!s) return null;
  if (!s.next && !shown && !s.scholarships.length) return null; // nothing to ask and nothing to show
  const pct = Math.round((s.done / Math.max(1, s.total)) * 100);
  const body = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[14px] font-semibold">
          <SlidersHorizontal className="size-4 text-brand" aria-hidden />
          {s.next ? "Sharpen your matches" : "Your matches are sharpened"}
        </p>
        <span className="flex items-center gap-2 text-[12.5px] text-muted">
          Match profile {s.done} of {s.total}
          <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden>
            <span className="block h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </div>
      {s.next ? (
        <div className="relative">
          <SharpenQuestionView key={s.next.key} q={s.next} busy={busy} onAnswer={answer} />
          {busy && <LoaderCircle className="absolute right-0 top-0 size-4 animate-spin text-muted" aria-hidden />}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[14px] text-muted">
          <Check className="size-4 text-go" aria-hidden />
          Your agents use all of this for fit scores and the scholarship hunt.
        </p>
      )}
      {shown > 0 && s.next && <p className="text-[12.5px] text-go">Saved. Your matches are updated.</p>}
      <OpenScholarships items={s.scholarships} />
    </div>
  );
  return framed ? <section className="rounded-2xl border border-line bg-surface p-5 shadow-card" aria-label="Sharpen your matches">{body}</section> : body;
}
