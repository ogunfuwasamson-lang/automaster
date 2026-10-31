"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ListPlus, MessagesSquare, Mic, Plus, UserRoundPen, CircleHelp } from "lucide-react";

// tell the agents something in your own words: it opens the interviewer with your message already sent
const CHIPS: [typeof ListPlus, string, string][] = [
  [ListPlus, "Find more programs", "I'd like more programs on my shortlist. Here's what I'm looking for: "],
  [UserRoundPen, "Update my profile", "Something about me has changed: "],
  [MessagesSquare, "Practise an interview", "Can we practise an admissions interview?"],
  [CircleHelp, "What's next for me?", "What should I focus on this week?"],
];

export function AskBox() {
  const [text, setText] = useState("");
  const router = useRouter();
  const go = (say: string) => router.push(`?chat=open&say=${encodeURIComponent(say.slice(0, 1500))}`, { scroll: false });
  const ready = !!text.trim();
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) go(text.trim());
        }}
        className="rounded-2xl border border-line bg-surface px-4 pb-3 pt-4 shadow-[0_1px_2px_rgb(9_9_11/0.04),0_12px_32px_-16px_rgb(9_9_11/0.12)] transition-[border-color,box-shadow] focus-within:border-neutral-300 focus-within:shadow-lift dark:focus-within:border-neutral-700"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (ready) go(text.trim());
            }
          }}
          rows={2}
          placeholder="Ask Ivyward AI anything about admissions, or tell it what to do…"
          aria-label="Message your agents"
          className="w-full resize-none bg-transparent px-1 text-[16px] leading-relaxed outline-none placeholder:text-neutral-400"
        />
        <div className="mt-2 flex items-center gap-1.5">
          <Link href="/shortlist" title="Add a program" aria-label="Add a program" className="grid size-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-foreground">
            <Plus className="size-4" aria-hidden />
          </Link>
          <span className="label-mono ml-1.5 hidden sm:inline">Goes to Ivyward AI</span>
          <span className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={() => go("")} className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800" aria-label="Talk by voice">
              <Mic className="size-4" aria-hidden />
            </button>
            <button
              disabled={!ready}
              className={`grid size-8 place-items-center rounded-lg transition-colors ${ready ? "bg-ink text-on-ink" : "border border-line text-neutral-400"}`}
              aria-label="Send"
            >
              <ArrowUp className="size-4" aria-hidden />
            </button>
          </span>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {CHIPS.map(([Icon, label, say]) => (
          <button
            key={label}
            onClick={() => (say.endsWith(": ") ? setText(say) : go(say))}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3.5 py-1.5 text-[13px] text-muted shadow-[0_1px_2px_rgb(9_9_11/0.04)] transition-colors hover:text-foreground"
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        ))}
        <Link href="/shortlist" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3.5 py-1.5 text-[13px] text-muted shadow-[0_1px_2px_rgb(9_9_11/0.04)] transition-colors hover:text-foreground">
          <Plus className="size-3.5" aria-hidden />
          Add a program
        </Link>
      </div>
    </div>
  );
}
