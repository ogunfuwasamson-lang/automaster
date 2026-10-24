"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PrepareButton({ id, replan, busy, label }: { id: string; replan: boolean; busy: boolean; label?: string }) {
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [err, setErr] = useState("");
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        disabled={busy || state === "busy"}
        onClick={async () => {
          setState("busy");
          setErr("");
          const res = await fetch(`/api/applications/${id}/prepare`, { method: "POST" });
          if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
          setState("idle");
          if (res.ok && label) router.push(`/applications/${id}`);
          else router.refresh();
        }}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {busy ? "planning…" : label ?? (replan ? "re-plan & redraft" : "prepare")}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  );
}
