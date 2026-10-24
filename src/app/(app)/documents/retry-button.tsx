"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/documents/${id}/retry`, { method: "POST" });
        router.refresh();
      }}
    >
      <RotateCcw className="size-3.5" aria-hidden />
      {busy ? "Retrying…" : "Try again"}
    </Button>
  );
}
