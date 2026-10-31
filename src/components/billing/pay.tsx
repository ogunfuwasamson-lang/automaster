"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function go(body: Record<string, unknown>) {
  const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!r.ok || !j.url) throw new Error(j.error ?? "Couldn't open the payment page");
  window.location.assign(j.url);
}

// one application ready and waiting on payment (or on the monthly plan)
export function PayToSubmit({ applicationId, kind, label, school, highlight }: { applicationId: string; kind: "submission" | "pro"; label: string; school: string; highlight?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-surface p-5 shadow-card ${highlight ? "border-brand ring-4 ring-brand/10" : "border-brand/30"}`}>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[20px] leading-snug">{kind === "submission" ? `Pay ${label} to submit` : "Subscribe to submit"}</p>
        <p className="mt-1 text-[14px] text-muted">
          {kind === "submission"
            ? `The agents prepare everything first. Once you pay, they submit your ${school} application straight away.`
            : `Your free applications are used. Pro (${label}) covers ${school} and every other submission. Cancel any time.`}
        </p>
      </div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await go(kind === "submission" ? { kind, applicationId } : { kind });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn't open the payment page");
            setBusy(false);
          }
        }}
      >
        {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {kind === "submission" ? `Pay ${label}` : "Subscribe"}
      </Button>
    </section>
  );
}

// settings: how this applicant pays, and the monthly plan's controls
export function PlanCard(p: { model: "per_submission" | "subscription"; label: string; free: number; used: number; paidThisMonth: number; pro: boolean; until: string | null; cancelled: boolean; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function manage(action: "portal" | "cancel") {
    setBusy(action);
    const r = await fetch("/api/billing/manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
    setBusy(null);
    if (!r.ok) return toast.error(j.error ?? "Couldn't do that");
    if (j.url) return window.location.assign(j.url);
    toast.success("Pro won't renew. It keeps working until the end of the month you paid for.");
    router.refresh();
  }
  const until = p.until ? new Date(p.until).toLocaleDateString(undefined, { day: "numeric", month: "long" }) : null;
  if (p.model === "per_submission")
    return (
      <div className="space-y-2 text-sm">
        <p>
          Preparing is free. Each submission is <span className="font-medium">{p.label}</span>, paid just before the agents submit it. No monthly fee, no limit.
        </p>
        <p className="text-muted">{p.paidThisMonth ? `${p.paidThisMonth} paid this month.` : "Nothing paid yet this month."} Each paid submission also adds to the month&apos;s agent work.</p>
      </div>
    );
  return (
    <div className="space-y-3 text-sm">
      {p.pro ? (
        <p>
          You&apos;re on <span className="font-medium">Pro</span>: unlimited submissions. {p.cancelled ? `It ends on ${until}.` : `Renews on ${until}.`}
        </p>
      ) : (
        <p>
          Free: <span className="font-medium tabular">{Math.min(p.used, p.free)} of {p.free}</span> free applications used. Pro is {p.label} for unlimited submissions.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!p.pro && (
          <Button
            size="sm"
            disabled={!!busy || !p.ready}
            onClick={async () => {
              setBusy("pro");
              try {
                await go({ kind: "pro" });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't open the payment page");
                setBusy(null);
              }
            }}
          >
            {busy === "pro" && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
            Upgrade to Pro
          </Button>
        )}
        {p.pro && (
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => manage("portal")}>
            Card and invoices
          </Button>
        )}
        {p.pro && !p.cancelled && (
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => manage("cancel")}>
            Cancel Pro
          </Button>
        )}
      </div>
      {!p.ready && <p className="text-xs text-muted">Payments open shortly.</p>}
    </div>
  );
}
