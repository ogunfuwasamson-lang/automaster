import { Compass } from "lucide-react";
import { Clamp } from "@/components/ui/clamp";

// the strategist's brief, readable: headings, bullets and paragraphs instead of one wall of text
function Brief({ text }: { text: string }) {
  const blocks: ({ kind: "h"; t: string } | { kind: "p"; t: string } | { kind: "ul"; items: string[] })[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
    } else if (/^#{1,4}\s/.test(line) || (line.length < 60 && /:$/.test(line))) {
      blocks.push({ kind: "h", t: line.replace(/^#+\s*/, "").replace(/:$/, "") });
    } else blocks.push({ kind: "p", t: line.replace(/\*\*/g, "") });
  }
  return (
    <div className="space-y-3 text-[13.5px] leading-relaxed">
      {blocks.map((b, i) =>
        b.kind === "h" ? (
          <p key={i} className="pt-1 text-xs font-bold text-muted">
            {b.t.replace(/\*\*/g, "")}
          </p>
        ) : b.kind === "ul" ? (
          <ul key={i} className="space-y-1.5">
            {b.items.map((x, j) => (
              <li key={j} className="flex gap-2.5">
                <span className="mt-[8px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{x.replace(/\*\*/g, "")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.t}</p>
        ),
      )}
    </div>
  );
}

export function AngleCard({ angle, brief, school }: { angle: string | null; brief: string; school: string }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <div className="relative px-5 pb-5 pt-5 sm:px-6">
        <span className="bg-hero-gradient pointer-events-none absolute inset-x-0 top-0 h-1" aria-hidden />
        <div className="flex items-center gap-3">
          <span className="bg-hero-gradient grid size-10 shrink-0 place-items-center rounded-2xl text-white">
            <Compass className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-[-0.01em]">Your angle for {school.split(",")[0]}</h2>
            <p className="text-xs text-muted">The strategist&apos;s plan. Every essay is written from it.</p>
          </div>
        </div>
        {angle && <p className="text-gradient mt-4 text-lg font-bold leading-snug tracking-[-0.02em] sm:text-xl">&ldquo;{angle}&rdquo;</p>}
      </div>
      <div className="border-t border-line bg-neutral-50/60 px-5 py-4 sm:px-6 dark:bg-neutral-900/40">
        <Clamp lines={5} more="Read the full brief" less="Fold the brief">
          <Brief text={brief} />
        </Clamp>
      </div>
    </section>
  );
}
