"use client";
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Clamp, ShowList } from "@/components/ui/clamp";

// recon's strategy notes: one region at a time, three notes at first, each kept to two lines until opened
export function StrategyNotes({ notes, regions }: { notes: { region: string; text: string }[]; regions: Record<string, string> }) {
  const keys = [...new Set(notes.map((n) => n.region))];
  const [region, setRegion] = useState(keys[0]);
  const list = notes.filter((n) => n.region === region);
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <h2 className="mr-auto text-[15px] font-bold tracking-[-0.01em]">Recon&apos;s read on your strategy</h2>
        {keys.length > 1 &&
          keys.map((k) => (
            <button key={k} onClick={() => setRegion(k)} className={`rounded-full px-3 py-1 text-xs font-bold ${region === k ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"}`}>
              {regions[k] ?? k}
            </button>
          ))}
      </div>
      <ul className="space-y-2.5">
        <ShowList
          key={region}
          items={list}
          first={3}
          label="notes"
          render={(n, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <Clamp lines={2} className="min-w-0 flex-1">
                {n.text}
              </Clamp>
            </li>
          )}
        />
      </ul>
    </div>
  );
}
