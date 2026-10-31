"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Ask } from "@/lib/ask";
import { AskControls } from "./ask-controls";

// every question the portals are waiting on, answerable here with a tap. answers go into the profile (so the next
// school doesn't ask), and the paused application carries on once its last question is answered.
export function QuestionsCard({ questions, title = "Your schools are asking" }: { questions: Ask[]; title?: string }) {
  const router = useRouter();
  const [left, setLeft] = useState(questions);
  const [busy, setBusy] = useState<string | null>(null);
  if (!left.length) return null;

  async function answer(q: Ask, value: string | null) {
    setBusy(q.id);
    try {
      const r = await fetch("/api/questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: q.id, answer: value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 409) throw new Error(j.error ?? "Couldn't save that");
      const rest = left.filter((x) => x.id !== q.id);
      setLeft(rest);
      const sameSchool = rest.some((x) => x.applicationId && x.applicationId === q.applicationId);
      toast.success(value ? (sameSchool ? "Saved to your profile" : `Saved. ${q.school ?? "The application"} carries on now.`) : "Skipped");
      if (!rest.length) router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    }
    setBusy(null);
  }

  return (
    <section id="questions" className="scroll-mt-24 rounded-3xl border-2 border-signal/30 bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-[22px] leading-snug">{title}</h2>
        <span className="text-[13px] text-muted">
          Answers are saved to your profile, so no school asks twice.
        </span>
      </div>
      <ol className="mt-4 divide-y divide-line">
        {left.map((q) => (
          <li key={q.id} className="py-4 first:pt-0 last:pb-0">
            <p className="text-[12.5px] font-semibold text-muted">{q.school ?? "A school"}</p>
            <p className="mt-0.5 text-[15.5px] font-medium leading-snug">{q.question}</p>
            <div className="mt-2.5">
              <AskControls ask={q} busy={busy === q.id} onAnswer={(v) => void answer(q, v)} compact />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
