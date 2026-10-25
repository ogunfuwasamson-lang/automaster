"use client";
import { useState } from "react";
import { useMounted } from "@/components/use-mounted";
import { useRouter } from "next/navigation";
import { CirclePause, CirclePlay, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json;
}

// the ripcord. one tap stops every agent; queued work is cancelled, agent emails go back to drafts.
export function StopButton({ paused, compact = false }: { paused: boolean; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const go = async () => {
    setBusy(true);
    try {
      await post("/api/controls", paused ? { action: "resume" } : { action: "pause", scope: "all" });
      toast.success(paused ? "Agents resumed" : "Agents paused");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change it");
    }
    setBusy(false);
    router.refresh();
  };
  if (compact)
    return (
      <button onClick={go} disabled={busy} className={`inline-flex items-center gap-1 font-medium underline decoration-current/30 underline-offset-4 hover:decoration-current disabled:opacity-50 ${paused ? "text-stop" : "text-muted hover:text-foreground"}`}>
        {paused ? <CirclePlay className="size-3.5" aria-hidden /> : <CirclePause className="size-3.5" aria-hidden />}
        {busy ? (paused ? "Resuming…" : "Pausing…") : paused ? "Resume" : "Pause all"}
      </button>
    );
  return paused ? (
    <Button onClick={go} disabled={busy} variant="signal">
      <CirclePlay className="size-4" aria-hidden />
      {busy ? "Resuming…" : "Resume agents"}
    </Button>
  ) : (
    <Button onClick={go} disabled={busy} variant="danger">
      <CirclePause className="size-4" aria-hidden />
      {busy ? "Pausing…" : "Pause agents"}
    </Button>
  );
}

export function CancelEmail({ id, sendAfter }: { id: string; sendAfter: string | null }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const mounted = useMounted();
  const mins = sendAfter && mounted ? Math.max(0, Math.ceil((Date.parse(sendAfter) - Date.now()) / 60_000)) : 0;
  return (
    <span className="flex items-center gap-3">
      <span className="text-xs text-muted">{!mounted ? "Sending soon" : mins ? `Sends in ${mins} min` : "Sending now"}</span>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await post(`/api/messages/${id}`, { action: "cancel" });
            toast.success("Email held back. It's a draft again.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Too late, it already went out");
          }
          setBusy(false);
          router.refresh();
        }}
      >
        <Undo2 className="size-3.5" aria-hidden />
        Undo
      </Button>
    </span>
  );
}

export function RetryRunner({ count }: { count: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (!count) return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await post("/api/controls", { action: "retry_runner" });
          toast.success(`Trying ${r.queued} again`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn't retry");
        }
        setBusy(false);
        router.refresh();
      }}
    >
      <RotateCcw className="size-3.5" aria-hidden />
      Try {count} again
    </Button>
  );
}
