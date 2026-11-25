"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { TourStage } from "@/components/landing/product-tour";
import { CalendarDemo, FormDemo, InboxDemo } from "@/components/landing/connect-demos";
import type { FeatureDemo as Kind } from "@/lib/features";

// a feature page's demo: the same coded demos as the landing page, played when they come into view and again on
// "Play again"
export function FeatureDemo({ demo }: { demo: Kind }) {
  const [replay, setReplay] = useState(0);
  const stage =
    demo === "inbox" ? (
      <InboxDemo delay={200} replay={replay} />
    ) : demo === "calendar" ? (
      <CalendarDemo delay={200} replay={replay} />
    ) : demo === "chrome" ? (
      <FormDemo delay={200} replay={replay} />
    ) : (
      <TourStage id={demo === "programs" ? "programs" : demo === "essays" ? "essays" : demo === "forms" ? "forms" : "funding"} replay={replay} />
    );
  const framed = demo === "inbox" || demo === "calendar" || demo === "chrome";
  return (
    <div>
      {framed ? <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lift [&>div]:border-b-0">{stage}</div> : stage}
      <button type="button" onClick={() => setReplay((r) => r + 1)} className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-foreground">
        <RotateCcw className="size-3.5" aria-hidden /> Play again
      </button>
    </div>
  );
}
