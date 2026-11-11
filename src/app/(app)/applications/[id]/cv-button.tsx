"use client";
import { useState } from "react";
import { toast } from "sonner";

// a CV chosen and ordered for this program, from the applicant's own facts. made on request, downloaded as a PDF
export function CvButton({ id, has }: { id: string; has: boolean }) {
  const [ready, setReady] = useState(has);
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    const r = await fetch(`/api/applications/${id}/cv`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return void toast.error(j.error ?? "The CV couldn't be made just now.");
    setReady(true);
    toast.success(j.left_out ? `CV ready. ${j.left_out} line${j.left_out === 1 ? " was" : "s were"} left out because your profile doesn't back ${j.left_out === 1 ? "it" : "them"}.` : "CV ready.");
  };
  const cls = "tap rounded-full border border-line px-3 text-[13px] font-medium hover:bg-neutral-50 disabled:opacity-60 dark:hover:bg-neutral-900";
  return ready ? (
    <span className="inline-flex items-center gap-1">
      <a href={`/api/applications/${id}/cv`} className={cls} download>
        CV for this program
      </a>
      <button type="button" className="tap px-2 text-[12.5px] text-muted underline-offset-4 hover:underline" onClick={make} disabled={busy}>
        {busy ? "Making…" : "Remake"}
      </button>
    </span>
  ) : (
    <button type="button" className={cls} onClick={make} disabled={busy} aria-busy={busy}>
      {busy ? "Making your CV…" : "Make a CV for this program"}
    </button>
  );
}
