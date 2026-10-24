"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "failed");
}

// the ripcord. one tap stops every agent; queued work is cancelled, agent emails go back to drafts.
export function StopButton({ paused }: { paused: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const go = async () => {
    setBusy(true);
    await post("/api/controls", paused ? { action: "resume" } : { action: "pause", scope: "all" }).catch(() => {});
    setBusy(false);
    router.refresh();
  };
  return paused ? (
    <button disabled={busy} onClick={go} className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
      {busy ? "resuming…" : "resume agents"}
    </button>
  ) : (
    <button disabled={busy} onClick={go} className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40">
      {busy ? "pausing…" : "pause all agents"}
    </button>
  );
}

export function CancelEmail({ id, sendAfter }: { id: string; sendAfter: string | null }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  const mins = sendAfter ? Math.max(0, Math.ceil((Date.parse(sendAfter) - Date.now()) / 60_000)) : 0;
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-neutral-500">{mins ? `sends in ~${mins} min` : "sending now"}</span>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr("");
          await post(`/api/messages/${id}`, { action: "cancel" }).catch((e) => setErr(e.message));
          setBusy(false);
          router.refresh();
        }}
        className="rounded-md border border-neutral-300 px-2 py-0.5 text-xs dark:border-neutral-700"
      >
        undo
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  );
}
