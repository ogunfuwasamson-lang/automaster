"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ListPlus, MessagesSquare, Mic, UserRoundPen } from "lucide-react";

// tell the agents something in your own words: it opens the interviewer with your message already sent
const CHIPS: [typeof ListPlus, string, string][] = [
  [ListPlus, "Find more programs", "I'd like more programs on my shortlist. Here's what I'm looking for: "],
  [UserRoundPen, "Update my profile", "Something about me has changed: "],
  [MessagesSquare, "Practise an interview", "Can we practise an admissions interview?"],
];

export function AskBox() {
  const [text, setText] = useState("");
  const router = useRouter();
  const go = (say: string) => router.push(`?chat=open&say=${encodeURIComponent(say.slice(0, 1500))}`, { scroll: false });
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) go(text.trim());
        }}
        className="rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgb(9_9_11/0.04)] transition-shadow focus-within:border-neutral-300 focus-within:shadow-lift dark:focus-within:border-neutral-700"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) go(text.trim());
            }
          }}
          rows={2}
          placeholder="Tell your agents something, or ask about a school…"
          aria-label="Message your agents"
          className="w-full resize-none bg-transparent px-1.5 py-1 text-[15px] outline-none placeholder:text-neutral-400"
        />
        <div className="flex items-center justify-between">
          <span className="label-mono px-1.5">Goes to your interviewer</span>
          <span className="flex items-center gap-1.5">
            <button type="button" onClick={() => go("")} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800" aria-label="Talk by voice">
              <Mic className="size-4" aria-hidden />
            </button>
            <button disabled={!text.trim()} className="grid size-8 place-items-center rounded-lg border border-brand/30 bg-[color-mix(in_oklab,var(--brand)_6%,var(--surface))] text-brand transition-opacity disabled:opacity-40" aria-label="Send">
              <ArrowUp className="size-4" aria-hidden />
            </button>
          </span>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map(([Icon, label, say]) => (
          <button
            key={label}
            onClick={() => (say.endsWith(": ") ? setText(say) : go(say))}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
