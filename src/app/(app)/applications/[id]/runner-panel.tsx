"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS: Record<string, string> = {
  idle: "not queued",
  ready: "queued: opens in your Chrome next time the extension checks in (every few minutes)",
  running: "filling the portal in your browser now",
  needs_you: "stopped and waiting for you",
  submitted: "submitted",
  failed: "hit a problem",
};

export function RunnerPanel({ id, status, runnerStatus, note, portalUrl, fee, attested, missing }: { id: string; missing: string[]; status: string; runnerStatus: string; note: string | null; portalUrl: string | null; fee: number | null; attested: boolean }) {
  const [url, setUrl] = useState(portalUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  async function act(action: "queue" | "stop") {
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/applications/${id}/runner`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...(action === "queue" && url ? { portal_url: url } : {}) }) });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
    setBusy(false);
    router.refresh();
  }
  if (status === "submitted") {
    return runnerStatus === "submitted" ? (
      <section className="rounded-md border border-emerald-300 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">submitted by the runner{note ? `: ${note}` : ""}.</section>
    ) : null;
  }
  const tone = runnerStatus === "needs_you" || runnerStatus === "failed" ? "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30" : "border-neutral-200 dark:border-neutral-800";
  return (
    <section className={`space-y-3 rounded-md border p-4 ${tone}`}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">runner</h2>
      <p className="text-sm">
        <span className="font-medium">{STATUS[runnerStatus] ?? runnerStatus}</span>
        {note ? <span className="text-neutral-600 dark:text-neutral-400"> · {note}</span> : null}
      </p>
      <p className="text-xs text-neutral-500">
        it signs in where you&apos;re already signed in, fills every section from your profile, uploads your approved essays and CV, ticks the certification with the statement you signed{attested ? "" : " (sign the packet first)"}, and submits.
        it stops for you at passwords, bot checks{fee ? ` and the $${fee} fee payment` : " and any payment page"}.
      </p>
      {missing.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          portals will ask for things your profile doesn&apos;t have yet: {missing.join(", ")}. add them under <a href="/profile" className="underline">profile → details for application forms</a>, or the runner will stop and ask.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="portal link (where the application form starts)" className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700" />
        {runnerStatus === "idle" || runnerStatus === "failed" || runnerStatus === "needs_you" ? (
          <button disabled={busy || !url} onClick={() => act("queue")} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900">
            {runnerStatus === "idle" ? "send to runner" : "run again"}
          </button>
        ) : (
          <button disabled={busy} onClick={() => act("stop")} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">stop</button>
        )}
      </div>
      <p className="text-xs text-neutral-500">no extension yet? set it up in <a href="/settings" className="underline">settings</a>.</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </section>
  );
}
