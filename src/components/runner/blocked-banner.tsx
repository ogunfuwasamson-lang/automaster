"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Laptop, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { askExtension, useExtension } from "@/components/runner/use-extension";

// applications stopped because a portal refuses cloud browsers: one click sends them all to the applicant's chrome
export function BlockedBanner({ count }: { count: number }) {
  const { ext } = useExtension();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (!count) return null;
  async function go() {
    if (!ext.paired) return router.push("/connect-chrome");
    setBusy(true);
    const r = await fetch("/api/runner/chrome-all", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) toast.error(j.error ?? "Couldn't do that");
    else {
      await askExtension("kick");
      toast.success(`${j.ids?.length ?? 0} sent to your Chrome. It works through them one at a time`);
    }
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-signal/30 bg-[color-mix(in_oklab,var(--signal)_6%,var(--surface))] p-4 shadow-card sm:flex-row sm:items-center sm:p-5">
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{count === 1 ? "1 application is" : `${count} applications are`} stuck at portals that block cloud browsers.</span>{" "}
        <span className="text-muted">Your own Chrome usually gets straight in.</span>
      </p>
      <Button variant="signal" disabled={busy} onClick={go}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Laptop className="size-4" aria-hidden />}
        {ext.paired ? "Run them in my Chrome" : "Connect Chrome to finish them"}
      </Button>
    </div>
  );
}
