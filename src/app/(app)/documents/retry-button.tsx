"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/documents/${id}/retry`, { method: "POST" });
        router.refresh();
        setTimeout(() => router.refresh(), 30000);
      }}
      className="shrink-0 rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-50 dark:border-neutral-700"
    >
      {busy ? "retrying…" : "retry"}
    </button>
  );
}
