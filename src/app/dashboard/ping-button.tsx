"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PingButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/system/ping", { method: "POST" });
        setTimeout(() => {
          router.refresh();
          setBusy(false);
        }, 4000);
      }}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
    >
      {busy ? "pinging agents…" : "test agent loop"}
    </button>
  );
}
