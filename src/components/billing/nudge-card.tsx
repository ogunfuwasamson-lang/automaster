"use client";
import { useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// the dashboard's ask to pay: one angle a day (lib/nudge-rules). "Not now" hides it for a few days (a cookie the
// server reads, so it stays hidden on every device the cookie is on, with nothing stored about it).
export function NudgeCard({ angle, headline, body, cta, kind, href }: { angle: string; headline: string; body: string; cta: string; kind: "pack" | "pro"; href?: string }) {
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-brand/30 bg-surface p-5 shadow-card" aria-label="Unlock submissions">
      <div className="min-w-0 flex-1 basis-72">
        <p className="font-serif text-[20px] leading-snug">{headline}</p>
        <p className="mt-1 text-[14px] text-muted">{body}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {href ? (
          <Link href={href} className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-[14px] font-medium text-background">
            {cta}
          </Link>
        ) : (
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, back: "settings", from: angle }) });
                const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
                if (!r.ok || !j.url) throw new Error(j.error ?? "Couldn't open the payment page");
                window.location.assign(j.url);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't open the payment page");
                setBusy(false);
              }
            }}
          >
            {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {cta}
          </Button>
        )}
        <Link href="/settings#plan" className="text-[13.5px] text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">
          What&apos;s included
        </Link>
        <button
          type="button"
          className="text-[13.5px] text-muted hover:text-foreground"
          onClick={() => {
            document.cookie = `iw_nudge_snooze=${Date.now()}; path=/; max-age=${60 * 60 * 24 * 60}; samesite=lax`;
            setHidden(true);
          }}
        >
          Not now
        </button>
      </div>
    </section>
  );
}
