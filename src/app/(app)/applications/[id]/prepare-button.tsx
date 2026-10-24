"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PrepareButton({ id, replan, busy, label, size = "md" }: { id: string; replan: boolean; busy: boolean; label?: string; size?: "sm" | "md" }) {
  const [working, setWorking] = useState(false);
  const router = useRouter();
  return (
    <Button
      size={size}
      variant={replan ? "secondary" : "primary"}
      disabled={busy || working}
      onClick={async () => {
        setWorking(true);
        const res = await fetch(`/api/applications/${id}/prepare`, { method: "POST" });
        if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't start");
        else toast.success(replan ? "Re-planning this application" : "Agents are preparing this application");
        setWorking(false);
        if (res.ok && label) router.push(`/applications/${id}`);
        else router.refresh();
      }}
    >
      <Sparkles className="size-4" aria-hidden />
      {busy ? "Planning…" : label ?? (replan ? "Re-plan and redraft" : "Prepare application")}
    </Button>
  );
}
