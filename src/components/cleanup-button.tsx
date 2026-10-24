"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CleanupButton() {
  const [state, setState] = useState<"idle" | "running">("idle");
  const router = useRouter();
  return (
    <button
      disabled={state === "running"}
      onClick={async () => {
        setState("running");
        await fetch("/api/profile/cleanup", { method: "POST" });
        // cleanup takes a minute or two
        setTimeout(() => router.refresh(), 60_000);
        setTimeout(() => {
          router.refresh();
          setState("idle");
        }, 150_000);
      }}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
    >
      {state === "running" ? "cleaning up… (1–2 min)" : "clean up profile"}
    </button>
  );
}
