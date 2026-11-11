"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// run the eval questions through one model; the page reloads with the new score at the top
export function RunEval() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (tier: "chat" | "expert") => {
    setBusy(tier);
    const r = await fetch("/api/admin/evals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return void toast.error(j.error ?? "The eval didn't run");
    toast.success(`${j.correct} right, ${j.wrong} wrong, ${j.filled_should_ask} filled that should have been asked`);
    router.refresh();
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run("chat")}>
        {busy === "chat" ? "Running on Sonnet…" : "Run on Sonnet (today's model)"}
      </Button>
      <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run("expert")}>
        {busy === "expert" ? "Running on Opus…" : "Run on Opus"}
      </Button>
    </div>
  );
}
