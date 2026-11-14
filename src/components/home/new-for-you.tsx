import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Tag } from "@/components/ui/chip";

export interface FreshProgram {
  id: string;
  school: string;
  program: string;
  country: string | null;
  deadline: string | null;
  fit: number | null;
}
export interface FreshAward {
  id: string;
  name: string;
  amount: string | null;
  deadline: string | null;
}

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

// home page: what the agents found in the last day, and what's coming tomorrow morning (lib/drop). the reason to
// open Ivyward each day.
export function NewForYou({ programs, awards, upcoming }: { programs: FreshProgram[]; awards: FreshAward[]; upcoming: number }) {
  if (!programs.length && !awards.length && !upcoming) return null;
  const count = programs.length + awards.length;
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="new-for-you">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="new-for-you" className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em]">
          <Sparkles className="size-4 text-brand" aria-hidden />
          {count ? "New for you today" : "Your next matches"}
        </h2>
        {upcoming ? <span className="text-[13px] text-muted">{upcoming} more arrive over the next few mornings</span> : null}
      </div>
      {!count ? (
        <p className="mt-2 text-[14.5px] text-muted">Your agents research a few programmes for you each morning. The next ones arrive tomorrow before 7am.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {programs.slice(0, 6).map((p) => (
            <li key={p.id}>
              <Link href={`/applications/${p.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3 hover:text-brand">
                <span className="min-w-0">
                  <span className="block text-[12.5px] text-muted">{p.school}{p.country ? `, ${p.country}` : ""}</span>
                  <span className="block text-[15px] font-semibold leading-snug">{p.program}</span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-1.5">
                  {p.fit != null && p.fit > 0 ? <Tag tone={p.fit >= 7 ? "go" : "plain"}>Fit {Math.round(p.fit * 10) / 10}/10</Tag> : null}
                  {p.deadline ? <Tag>Closes {day(p.deadline)}</Tag> : null}
                </span>
              </Link>
            </li>
          ))}
          {awards.length ? (
            <li className="py-3">
              <Link href="/shortlist?view=scholarships" className="block hover:text-brand">
                <span className="block text-[15px] font-semibold">
                  {awards.length} scholarship{awards.length > 1 ? "s" : ""} matched to you
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-muted">
                  {awards.slice(0, 3).map((a) => a.name).join(", ")}
                  {awards.length > 3 ? ` and ${awards.length - 3} more` : ""}
                </span>
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
