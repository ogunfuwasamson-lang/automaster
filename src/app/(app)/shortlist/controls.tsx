"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ReconButton({ running, hasRows }: { running: boolean; hasRows: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={busy || running}
        onClick={async () => {
          setBusy(true);
          setErr("");
          const res = await fetch("/api/recon/start", { method: "POST" });
          if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
          setBusy(false);
          router.refresh();
        }}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {running ? "recon running…" : hasRows ? "find more programs" : "build my shortlist"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

export function MoveButton({ id, to, label }: { id: string; to: "shortlisted" | "dropped"; label: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/applications/${id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: to }),
        });
        router.refresh();
      }}
      className={`rounded-md px-2.5 py-1 text-xs disabled:opacity-50 ${
        to === "dropped" ? "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400" : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
      }`}
    >
      {label}
    </button>
  );
}

export function AutoRefresh({ every }: { every: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [every, router]);
  return null;
}
