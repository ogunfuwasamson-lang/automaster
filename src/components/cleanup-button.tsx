"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CleanupButton() {
  const [running, setRunning] = useState(false);
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      disabled={running}
      title="Merges duplicates and asks you to settle facts that disagree"
      onClick={async () => {
        setRunning(true);
        const res = await fetch("/api/profile/cleanup", { method: "POST" });
        if (!res.ok) {
          setRunning(false);
          return toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't start the tidy-up");
        }
        toast.success("Tidying your profile. This takes a minute or two.");
        // cleanup takes a minute or two
        setTimeout(() => router.refresh(), 60_000);
        setTimeout(() => {
          router.refresh();
          setRunning(false);
        }, 150_000);
      }}
    >
      <Sparkles className="size-4" aria-hidden />
      {running ? "Tidying…" : "Tidy up profile"}
    </Button>
  );
}
