"use client";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, CornerDownLeft, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { CHAPTERS, chapterStates, fieldFor, type Level } from "@/lib/profile-chapters";
import type { DetailField, PortalDetails } from "@/lib/portal-fields";

// one question at a time: tap an option and the next card slides in. answers save as you go, "Skip" never asks
// again, "Back" reopens the last card. used on the profile page (any chapter) and in onboarding (the basics).
type Details = PortalDetails;
const skippedOf = (d: Details): string[] => {
  const raw = (d as Record<string, unknown>)._skipped;
  return Array.isArray(raw) ? (raw as string[]) : [];
};

const isSkipped = (d: Details, k: string) => skippedOf(d).includes(k);

// lets a phone or browser offer the person's own saved name, number and address
const AUTOFILL: Record<string, string> = {
  legal_first_name: "given-name",
  legal_middle_name: "additional-name",
  legal_last_name: "family-name",
  preferred_name: "nickname",
  email: "email",
  phone: "tel",
  date_of_birth: "bday",
  address_line1: "address-line1",
  address_line2: "address-line2",
  city: "address-level2",
  state: "address-level1",
  postal_code: "postal-code",
  country: "country-name",
  linkedin: "url",
  website: "url",
};

export function QuestionDeck({
  initial,
  level,
  chapterId,
  only,
  onFinished,
  chatHref = true,
}: {
  initial: Details;
  level: Level | null;
  chapterId: string;
  only?: boolean; // stay in this chapter (onboarding); otherwise offer the next one at the end
  onFinished?: () => void;
  chatHref?: boolean;
}) {
  const reduce = useReducedMotion();
  const [details, setDetails] = useState<Details>(initial);
  const [chapter, setChapter] = useState(chapterId);
  const [reopen, setReopen] = useState<string | null>(null); // a card brought back with "Back"
  const [trail, setTrail] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const states = useMemo(() => chapterStates(details, level), [details, level]);
  const state = states.find((s) => s.chapter.id === chapter)!;
  const current: DetailField | null = reopen ? (fieldFor(reopen) ?? null) : (state.next[0] ?? null);
  const nextChapter = states.find((s) => s.chapter.id !== chapter && s.next.length);
  const position = current ? Math.min(state.total, state.done + (reopen ? 0 : 1)) : state.total;

  // set the draft when a new card appears
  const shownKey = useRef<string | null>(null);
  if (current && shownKey.current !== current.key) {
    shownKey.current = current.key;
    const v = (details[current.key] ?? "").toString();
    if (draft !== v) setDraft(v);
  }

  async function answer(value: string | null) {
    if (!current || busy) return;
    const key = current.key;
    const v = value?.trim() ? value.trim() : null;
    setBusy(true);
    try {
      const r = await fetch("/api/questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: `d:${key}`, answer: v }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Couldn't save that");
      setDetails((d) => {
        const skipped = new Set(skippedOf(d));
        if (v) skipped.delete(key);
        else skipped.add(key);
        return { ...d, [key]: v ?? d[key] ?? null, _skipped: [...skipped] } as unknown as Details;
      });
      setTrail((t) => [...t.filter((k) => k !== key), key]);
      setReopen(null);
      setDraft("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  }

  function back() {
    const prev = [...trail].reverse().find((k) => k !== current?.key);
    if (!prev) return;
    setTrail((t) => t.filter((k) => k !== prev));
    setReopen(prev);
  }

  const slide = reduce ? {} : { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -28 }, transition: { duration: 0.22 } };

  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-muted">
          {state.chapter.title}
          {current ? <span className="tabular"> · {position} of {state.total}</span> : null}
        </p>
        {chatHref && current && (
          <a href={`/dashboard?chat=open&say=${encodeURIComponent(`Let's do my profile chapter: ${state.chapter.title}`)}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
            <MessagesSquare className="size-3.5" aria-hidden />
            Talk it through instead
          </a>
        )}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="bg-bar-gradient h-full rounded-full transition-[width] duration-500" style={{ width: `${state.total ? (100 * state.done) / state.total : 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div key={current.key} {...slide} className="mt-7">
            <h2 className="text-[26px] font-bold leading-[1.15] tracking-[-0.03em] sm:text-[30px]">{current.ask ? current.ask[0].toUpperCase() + current.ask.slice(1) : current.label}</h2>
            {current.hint && <p className="mt-2 text-[14.5px] text-muted">{current.hint}</p>}

            <div className="mt-6">
              {current.options?.length ? (
                <div className={`grid gap-2.5 ${current.options.length > 4 ? "sm:grid-cols-2" : ""}`}>
                  {current.options.map((o) => {
                    const on = (details[current.key] ?? "") === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        disabled={busy}
                        onClick={() => answer(o)}
                        className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[15.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${on ? "border-accent bg-accent/10 text-accent" : "border-line hover:border-accent/50 hover:bg-accent/5"}`}
                      >
                        {o}
                        {on && <Check className="size-4" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void answer(draft);
                  }}
                  className="space-y-3"
                >
                  {current.kind === "long" ? (
                    <Textarea
                      ref={input}
                      autoFocus
                      rows={5}
                      value={draft}
                      maxLength={2000}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void answer(draft);
                      }}
                      aria-label={current.ask ?? current.label}
                      placeholder="A few honest sentences is plenty"
                    />
                  ) : (
                    <Input
                      ref={input}
                      autoFocus
                      aria-label={current.ask ?? current.label}
                      autoComplete={AUTOFILL[current.key] ?? "off"}
                      enterKeyHint="next"
                      type={current.kind === "date" ? "date" : current.kind === "email" ? "email" : current.kind === "tel" ? "tel" : current.kind === "url" ? "url" : "text"}
                      value={draft}
                      maxLength={300}
                      onChange={(e) => setDraft(e.target.value)}
                      className="h-12 text-[16px]"
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={busy || !draft.trim()}>
                      Save and continue
                      <CornerDownLeft className="size-4 opacity-70" aria-hidden />
                    </Button>
                    {current.kind === "long" && <span className="hidden text-[12.5px] text-muted sm:inline">or Ctrl + Enter</span>}
                  </div>
                </form>
              )}
            </div>

            <div className="mt-7 flex items-center justify-between">
              <button type="button" onClick={back} disabled={!trail.length || busy} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-foreground disabled:opacity-40">
                <ArrowLeft className="size-3.5" aria-hidden />
                Back
              </button>
              <button type="button" onClick={() => answer(null)} disabled={busy} className="text-[13.5px] font-semibold text-muted hover:text-foreground">
                {isSkipped(details, current.key) ? "Leave it skipped" : "Skip this one"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="done" {...slide} className="mt-8 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full border-2 border-dashed border-accent text-accent" aria-hidden>
              <Check className="size-7" />
            </div>
            <h2 className="mt-4 text-[26px] font-bold tracking-[-0.03em]">{state.chapter.title}: done</h2>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">The agents will use these answers on every form that asks, so you won&apos;t be asked again.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!only && nextChapter ? (
                <>
                  <Button onClick={() => setChapter(nextChapter.chapter.id)}>Next: {nextChapter.chapter.title}</Button>
                  <ButtonLink href="/profile?tab=chapters" variant="secondary">See all chapters</ButtonLink>
                </>
              ) : (
                onFinished ? <Button onClick={() => onFinished()}>Continue</Button> : <ButtonLink href="/profile?tab=chapters">Back to your chapters</ButtonLink>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const chapterTitle = (id: string) => CHAPTERS.find((c) => c.id === id)?.title ?? id;
