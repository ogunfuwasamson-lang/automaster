"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, CircleDashed, Copy, Mail, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { DocTrust, UploadButtons } from "@/components/docs/upload-button";
import type { DocRow } from "@/lib/doc-checklist";

// the documents this application needs (lib/doc-checklist): what's in, what's missing with what it unlocks, an
// upload (or photo) on each line, and a way through for what they don't have yet
export function DocChecklist({ userId, school, deadline, rows, done, total, letter }: { userId: string; school: string; deadline: string | null; rows: DocRow[]; done: number; total: number; letter: { subject: string; body: string } }) {
  const [showLetter, setShowLetter] = useState(false);
  const pct = Math.round((done / Math.max(1, total)) * 100);
  return (
    <section id="documents" aria-labelledby="docs-h" className="scroll-mt-24 rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="docs-h" className="font-semibold">
          Documents for {school}
        </h2>
        <span className="text-sm text-muted">
          {done} of {total} in{deadline && done < total ? `. Closes ${new Date(`${deadline}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}` : ""}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Documents for ${school}`}>
        <div className="h-full rounded-full bg-go transition-[width] duration-500" style={{ width: `${Math.max(3, pct)}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${r.state === "done" ? "bg-go text-white" : r.state === "agents" ? "bg-accent/15 text-accent" : ""}`} aria-hidden>
              {r.state === "done" ? <Check className="size-3" /> : r.state === "agents" ? <UserCheck className="size-3" /> : <CircleDashed className="size-5 text-muted" />}
            </span>
            <div className="min-w-0 flex-1 basis-60">
              <p className={`text-[14.5px] leading-snug ${r.state === "missing" ? "font-semibold" : ""}`}>
                {r.label}
                {r.state === "optional" ? <span className="ml-1.5 text-[12px] font-normal text-muted">optional</span> : null}
              </p>
              <p className="text-[13px] leading-relaxed text-muted">{r.detail ?? r.unlocks}</p>
              {r.state !== "done" && r.alt ? (
                r.alt.letter ? (
                  <button type="button" onClick={() => setShowLetter((v) => !v)} className="mt-1 inline-flex items-center gap-1 text-left text-[13px] font-medium text-accent hover:underline">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    {r.alt.label}
                  </button>
                ) : r.alt.href ? (
                  <Link href={r.alt.href} className="mt-1 inline-block text-[13px] font-medium text-accent hover:underline">
                    {r.alt.label}
                  </Link>
                ) : (
                  <p className="mt-1 text-[13px] text-foreground/80">{r.alt.label}</p>
                )
              ) : null}
            </div>
            {r.kind && r.state !== "done" && r.state !== "agents" ? <UploadButtons userId={userId} kind={r.kind} compact label={r.state === "optional" ? "Add" : "Upload"} /> : null}
          </li>
        ))}
      </ul>
      {showLetter && (
        <div className="mt-2 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900">
          <p className="text-[13.5px] font-semibold">Send this to your university&apos;s registry or exams office</p>
          <p className="mt-1 text-[13px] text-muted">Subject: {letter.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed">{letter.body}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(`${letter.subject}\n\n${letter.body}`).then(() => toast.success("Copied"), () => toast.error("Couldn't copy"))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13.5px] font-medium"
            >
              <Copy className="size-3.5" aria-hidden />
              Copy the email
            </button>
            <a href={`mailto:?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(letter.body)}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13.5px] font-medium">
              <Mail className="size-3.5" aria-hidden />
              Open in your email
            </a>
          </div>
          <p className="mt-2 text-[12.5px] text-muted">When it arrives, upload it on the English line above.</p>
        </div>
      )}
      <DocTrust className="mt-3" />
    </section>
  );
}
