import Link from "next/link";
import { Check, MessagesSquare, Rows3 } from "lucide-react";
import type { ChapterState } from "@/lib/profile-chapters";

// the application profile as chapters: each one a stamp in a passport, filled as it's answered
export function ChapterGrid({ states, readiness }: { states: ChapterState[]; readiness: number }) {
  const done = states.filter((s) => s.total && !s.next.length).length;
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold leading-tight tracking-[-0.035em]">Your application profile</h2>
          <p className="mt-1.5 max-w-xl text-[15px] text-muted">
            The questions application forms ask, in short chapters. Answer each once and the agents fill every form with it. Tap through the cards, or talk it through with Ivyward AI.
          </p>
        </div>
        <div className="text-right">
          <p className="font-serif text-[40px] leading-none tabular">{readiness}%</p>
          <p className="mt-1 text-[12.5px] font-semibold text-muted">ready for forms · {done} of {states.length} chapters</p>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((s, i) => {
          const complete = s.total > 0 && !s.next.length;
          const say = `/dashboard?chat=open&say=${encodeURIComponent(`Let's do my profile chapter: ${s.chapter.title}`)}`;
          return (
            <li key={s.chapter.id} className={`relative flex flex-col rounded-2xl border p-4 ${complete ? "border-accent/40 bg-accent/5" : "border-line bg-surface"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-bold text-muted tabular">Chapter {i + 1}</p>
                {complete ? (
                  <span className="grid size-9 -rotate-12 place-items-center rounded-full border-2 border-accent text-accent" aria-label="Done">
                    <Check className="size-4" aria-hidden />
                  </span>
                ) : (
                  <span className="text-[12.5px] font-semibold text-muted tabular">{s.done} of {s.total}</span>
                )}
              </div>
              <h3 className="mt-1 text-[17px] font-bold tracking-[-0.02em]">{s.chapter.title}</h3>
              <p className="mt-1 flex-1 text-[13.5px] leading-snug text-muted">{s.chapter.blurb}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="bg-bar-gradient h-full rounded-full" style={{ width: `${s.total ? (100 * s.done) / s.total : 100}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold">
                <Link href={`/profile/chapters/${s.chapter.id}`} className="inline-flex items-center gap-1.5 text-accent hover:underline">
                  <Rows3 className="size-3.5" aria-hidden />
                  {complete ? "Review answers" : s.chapter.style === "story" ? "Write answers" : "Quick cards"}
                </Link>
                {!complete && (
                  <a href={say} className="inline-flex items-center gap-1.5 text-muted hover:text-foreground">
                    <MessagesSquare className="size-3.5" aria-hidden />
                    Talk it through
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
