"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle } from "lucide-react";
import { AskControls } from "@/components/questions/ask-controls";
import type { Ask } from "@/lib/ask";

// the questions with a fixed form, one card at a time inside the chat panel (lib/cards). each tap is saved straight
// to the profile and the next card comes at once: no AI call, no waiting for a reply.
type Card = Ask & { source: "portal" | "sharpen" | "detail"; why: string | null; topic: string | null };
type State = { card: Card | null; left: number; readiness: number; storiesOpen: number };

export function QuickCards({ onAnswered, onState }: { onAnswered?: () => void; onState?: (s: State) => void }) {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(0);
  const reduce = useReducedMotion();

  const load = useCallback(async () => {
    const r = await fetch("/api/questions/next", { cache: "no-store" }).catch(() => null);
    const j = r?.ok ? ((await r.json()) as State) : null;
    if (j) {
      setS(j);
      onState?.(j);
    }
  }, [onState]);

  useEffect(() => {
    void load();
  }, [load]);

  async function answer(card: Card, value: string | null) {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: card.id, answer: value }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setErr((j as { error?: string }).error ?? "Couldn't save that. Try again.");
      setBusy(false);
      return;
    }
    setDone((n) => n + 1);
    onAnswered?.();
    await load();
    setBusy(false);
  }

  if (!s)
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-line px-4 py-5 text-[13.5px] text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading your questions…
      </div>
    );

  if (!s.card)
    return (
      <div className="rounded-2xl border border-go/25 bg-go/[0.05] px-4 py-4">
        <p className="flex items-center gap-2 text-[14.5px] font-semibold">
          <Check className="size-4 text-go" aria-hidden />
          {done ? "That's all of them." : "Your form questions are all answered."}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">Every application form fills from your answers. You can change any of them on your profile.</p>
      </div>
    );

  const c = s.card;
  const minutes = Math.max(1, Math.round((s.left * 8) / 60));
  return (
    <section className="rounded-2xl border border-line bg-background p-4" aria-label="Quick question">
      <div className="flex items-center justify-between gap-3 text-[12.5px]">
        <span className={`truncate font-semibold ${c.source === "portal" ? "text-signal" : "text-muted"}`}>{c.source === "portal" ? `${c.topic ?? "A school"} is waiting` : c.topic}</span>
        <span className="shrink-0 tabular-nums text-muted">
          {s.left} left{s.left > 3 ? ` · about ${minutes} min` : ""}
        </span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={c.id ?? c.question} initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -16 }} transition={{ duration: 0.16 }}>
          <p className="mt-2 text-[16px] font-semibold leading-snug tracking-[-0.01em]">{c.question}</p>
          {c.why ? <p className="mt-1 text-[13px] leading-relaxed text-muted">{c.why}</p> : null}
          <div className="mt-3">
            <AskControls key={c.id ?? c.question} ask={c} busy={busy} onAnswer={(v) => void answer(c, v)} compact />
          </div>
        </motion.div>
      </AnimatePresence>
      {err ? (
        <p className="mt-2 text-[13px] text-stop" role="alert">
          {err.charAt(0).toUpperCase() + err.slice(1)}
        </p>
      ) : null}
      {done ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
          <Check className="size-3.5 text-go" aria-hidden />
          {done} saved to your profile
        </p>
      ) : null}
    </section>
  );
}
