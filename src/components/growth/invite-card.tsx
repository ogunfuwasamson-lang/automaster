"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

// the applicant's invite link: a friend who joins through it gets a free submission, and so do you once their first
// application is submitted.
export function InviteCard({ url, joined, submitted, bonus }: { url: string | null; joined: number; submitted: number; bonus: number }) {
  const [copied, setCopied] = useState(false);
  if (!url) return <p className="text-sm text-muted">Your invite link isn&apos;t ready yet. Refresh in a moment.</p>;
  const text = `I'm using Ivyward to apply to universities abroad: AI agents shortlist programs, draft essays, ask for fee waivers and fill in every portal. Join with my link and your first submission is free: ${url}`;
  const share = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(text)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { label: "Email", href: `mailto:?subject=${encodeURIComponent("Applying abroad? Try Ivyward")}&body=${encodeURIComponent(text)}` },
  ];
  return (
    <div className="space-y-4 py-1">
      <p className="text-[14.5px] leading-relaxed">
        Friends who join through your link get <strong>one free submission</strong>. When their first application is submitted, you get one too.
      </p>
      <div className="flex gap-2">
        <input readOnly value={url} aria-label="Your invite link" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-background px-3 text-[14px]" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-4 text-[14px] font-medium text-on-ink"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {share.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener" className="rounded-full border border-line px-3 py-1.5 text-[13.5px] hover:border-foreground/40">
            Share on {s.label}
          </a>
        ))}
      </div>
      <p className="text-[13.5px] text-muted">
        {joined} joined through your link, {submitted} submitted. Free submissions waiting for you: {bonus}.
      </p>
    </div>
  );
}
