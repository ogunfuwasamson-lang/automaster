"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlaneTakeoff, TriangleAlert, ArrowRight, PartyPopper } from "lucide-react";

// the hero card: the next deadline, counting down live, with the one thing blocking it
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
  const date = new Date(deadline + "T00:00:00Z").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return (
    <div className="bg-hero-gradient relative h-full overflow-hidden rounded-3xl p-6 text-white">
      <span className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border-[40px] border-white/[0.08]" aria-hidden />
      <span className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-white/5 blur-2xl" aria-hidden />
      <p className="relative flex items-center gap-2 text-[13px] font-semibold text-white/80">
        <PlaneTakeoff className="size-4" aria-hidden /> Next deadline
      </p>
      <div className="relative mt-4 flex gap-2.5" aria-label={`${parts[0][0]} days ${parts[1][0]} hours left`}>
        {parts.map(([n, l]) => (
          <div key={l} className="min-w-[68px] rounded-2xl border border-white/20 bg-white/12 px-3 py-2 text-center backdrop-blur-sm">
            <span className="block text-[32px] font-bold leading-tight tracking-[-0.04em] tabular">{now === null ? "··" : String(n).padStart(2, "0")}</span>
            <span className="text-[11px] font-medium text-white/75">{l}</span>
          </div>
        ))}
      </div>
      <h3 className="relative mt-5 text-xl font-bold tracking-[-0.02em]">{school}</h3>
      <p className="relative text-[13.5px] text-white/80">
        {program}. Closes {date}.
      </p>
      <Link href={`/applications/${id}`} className="relative mt-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0f1222] transition-transform hover:-translate-y-0.5">
        {blocker ? <TriangleAlert className="size-4 shrink-0 text-neutral-700" aria-hidden /> : <PartyPopper className="size-4 shrink-0 text-neutral-700" aria-hidden />}
        <span className="line-clamp-1 flex-1">{blocker ?? "Open the application"}</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#0f1222] px-3 py-1.5 text-xs text-white">
          {blocker ? "Fix now" : "Open"} <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
