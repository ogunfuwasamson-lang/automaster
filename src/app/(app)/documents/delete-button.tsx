"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

// two taps: the first asks, the second deletes. no browser dialogs.
export function DeleteDoc({ id, name }: { id: string; name: string }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (!ask)
    return (
      <button onClick={() => setAsk(true)} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-stop/10 hover:text-stop" aria-label={`Delete ${name}`}>
        <Trash2 className="size-4" />
      </button>
    );
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button onClick={() => setAsk(false)} disabled={busy} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:text-foreground">
        Keep
      </button>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
          setBusy(false);
          if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't delete it");
          toast.success(`Deleted ${name}`);
          router.refresh();
        }}
        className="rounded-lg bg-stop px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
    </span>
  );
}
