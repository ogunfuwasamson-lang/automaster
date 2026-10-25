"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

// the next deadline, counting down live, and what (if anything) is holding it up
export function DeadlineCard({ id, school, program, deadline, blocker }: { id: string; school: string; program: string; deadline: string; blocker: string | null }) {
  const end = Date.parse(deadline + "T23:59:00Z");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, end - (now ?? end));
  const parts: [number, string][] = [
    [Math.floor(left / 86_400_000), "days"],
    [Math.floor((left % 86_400_000) / 3_600_000), "hours"],
    [Math.floor((left % 3_600_000) / 60_000), "min"],
  ];
  const date = new Date(deadline + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="border-b border-line bg-[color-mix(in_oklab,var(--brand)_5%,var(--surface))] px-6 pb-5 pt-5">
        <p className="label-mono">Next deadline · {date}</p>
        <div className="mt-4 flex gap-10" aria-label={`${parts[0][0]} days ${parts[1][0]} hours left`}>
          {parts.map(([n, l]) => (
            <div key={l}>
              <span className="block font-serif text-[44px] leading-none tabular">{now === null ? "··" : String(n).padStart(2, "0")}</span>
              <span className="label-mono mt-2 block">{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <p className={`flex items-center gap-2 font-serif text-[24px] leading-tight ${blocker ? "text-signal" : "text-go"}`}>
          <span className="size-2 shrink-0 rounded-full bg-current" aria-hidden />
          {blocker ? "One thing is holding it up" : "On track"}
        </p>
        <p className="mt-1 text-[14px] text-muted">
          {school}, {program}
        </p>
        {blocker ? (
          <div className="mt-4 border-t border-line pt-4">
            <p className="label-mono">What&apos;s holding it up</p>
            <p className="mt-1.5 line-clamp-2 text-[15px] leading-snug">{blocker}</p>
          </div>
        ) : null}
        <div className="mt-auto pt-6">
          <Link
            href={`/applications/${id}`}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-brand/30 bg-[color-mix(in_oklab,var(--brand)_5%,var(--surface))] text-sm font-medium text-brand transition-colors hover:bg-[color-mix(in_oklab,var(--brand)_10%,var(--surface))]"
          >
            {blocker ? "Fix it now" : "Open the application"} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
