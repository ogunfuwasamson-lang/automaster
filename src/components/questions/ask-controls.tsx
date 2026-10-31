"use client";
import { useMemo, useState } from "react";
import { Check, LoaderCircle, Search } from "lucide-react";
import type { Ask } from "@/lib/ask";

// the answer controls for one question: buttons for a short list, a search for a long one, yes/no, a date, or a
// text box. every question can also take a typed answer ("Other") or be skipped as not applying.
export function AskControls({ ask, onAnswer, busy, compact }: { ask: Ask; onAnswer: (answer: string | null) => void; busy?: boolean; compact?: boolean }) {
  const [other, setOther] = useState(ask.kind === "text");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const portal = !!ask.id;

  const shown = useMemo(() => {
    if (ask.kind !== "search") return ask.options;
    const q = query.trim().toLowerCase();
    return (q ? ask.options.filter((o) => o.toLowerCase().includes(q)) : ask.options).slice(0, 8);
  }, [ask, query]);

  const choose = (v: string | null) => {
    if (busy) return;
    setPicked(v ?? "__skip");
    onAnswer(v);
  };

  const chip = (o: string, wide = false) => (
    <button
      key={o}
      type="button"
      disabled={busy}
      onClick={() => choose(o)}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-left text-[14px] font-medium transition disabled:opacity-50 ${
        picked === o ? "border-brand bg-brand text-white" : "border-line bg-background hover:-translate-y-px hover:border-brand/60 hover:bg-brand/5"
      } ${wide ? "w-full" : ""}`}
    >
      {picked === o && busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : picked === o ? <Check className="size-3.5" aria-hidden /> : null}
      {o}
    </button>
  );

  return (
    <div className={`space-y-2.5 ${compact ? "" : "pt-1"}`} role="group" aria-label={ask.question || "Answer"}>
      {ask.kind === "yes_no" && <div className="flex flex-wrap gap-2">{(ask.options.length ? ask.options : ["Yes", "No"]).map((o) => chip(o))}</div>}

      {ask.kind === "choice" && <div className="flex flex-wrap gap-2">{ask.options.map((o) => chip(o))}</div>}

      {ask.kind === "search" && (
        <div className="space-y-2">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-background px-3 focus-within:border-accent">
            <Search className="size-4 text-muted" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${ask.options.length} options`} aria-label="Search the options" className="h-full flex-1 bg-transparent text-[14px] outline-none" />
          </label>
          <div className="grid gap-1.5 sm:grid-cols-2">{shown.map((o) => chip(o, true))}</div>
          {!shown.length && <p className="text-xs text-muted">No match. Use Other to type it.</p>}
        </div>
      )}

      {ask.kind === "date" && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (date) choose(date);
          }}
        >
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className="h-10 rounded-xl border border-line bg-background px-3 text-[14px] outline-none focus:border-accent" />
          <button disabled={!date || busy} className="h-10 rounded-xl bg-ink px-4 text-[14px] font-medium text-on-ink disabled:opacity-40">
            Save
          </button>
        </form>
      )}

      {other && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) choose(text.trim());
          }}
        >
          <input autoFocus={ask.kind !== "text"} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer" aria-label="Your answer" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-background px-3 text-[14px] outline-none focus:border-accent" />
          <button disabled={!text.trim() || busy} className="h-10 rounded-xl bg-ink px-4 text-[14px] font-medium text-on-ink disabled:opacity-40">
            Save
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-3 text-[13px]">
        {ask.kind !== "text" && !other && (
          <button type="button" onClick={() => setOther(true)} className="font-medium text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">
            Other…
          </button>
        )}
        {portal && (
          <button type="button" disabled={busy} onClick={() => choose(null)} className="font-medium text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground disabled:opacity-50">
            Doesn&apos;t apply to me
          </button>
        )}
      </div>
    </div>
  );
}
