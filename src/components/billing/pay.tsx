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

// buy a pack of submissions (africa). from an application or request it goes in straight after paying.
export function BuyPack({ label, applicationId, messageId, back, size = "md", variant = "primary", children }: { label: string; applicationId?: string; messageId?: string; back?: "onboarding" | "settings"; size?: "sm" | "md" | "lg"; variant?: "primary" | "secondary" | "accent"; children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size={size}
      variant={variant}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await go({ kind: "pack", ...(applicationId ? { applicationId } : {}), ...(messageId ? { messageId } : {}), ...(back ? { back } : {}) });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn't open the payment page");
          setBusy(false);
        }
      }}
    >
      {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children ?? `Buy ${label}`}
    </Button>
  );
}

// one application ready and waiting on payment (or on the monthly plan)
export function PayToSubmit({ applicationId, kind, label, school, highlight, note }: { applicationId: string; kind: "pack" | "submission" | "pro" | "limit"; label: string; school: string; highlight?: boolean; note?: string }) {
  const [busy, setBusy] = useState(false);
  if (kind === "limit")
    return (
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <p className="font-serif text-[20px] leading-snug">Ready: this one goes in on the 1st</p>
        <p className="mt-1 text-[14px] text-muted">{note ?? `Pro covers 10 submissions a month and this month's are used. The agents submit ${school} as soon as the new month starts.`}</p>
      </section>
    );
  if (kind === "pack")
    return (
      <section className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-surface p-5 shadow-card ${highlight ? "border-brand ring-4 ring-brand/10" : "border-brand/30"}`}>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[20px] leading-snug">Ready to submit</p>
          <p className="mt-1 text-[14px] text-muted">The agents filled every page of your {school} application. Buy a pack of submissions ({label}) and it goes in straight away; the rest are there for your next applications.</p>
        </div>
        <BuyPack label={label} applicationId={applicationId}>Buy a pack</BuyPack>
      </section>
    );
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
export function PlanCard(p: { model: "pack" | "subscription"; label: string; each?: string; size?: number; credits?: number; bonus?: number; free: number; used: number; paidThisMonth: number; pro: boolean; until: string | null; cancelled: boolean; ready: boolean }) {
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
  if (p.model === "pack") {
    const left = (p.credits ?? 0) + (p.bonus ?? 0);
    return (
      <div className="space-y-3 text-sm">
        <p>
          <span className="font-serif text-[28px] leading-none tabular">{left}</span> <span className="font-medium">submission{left === 1 ? "" : "s"} left</span>
          {p.bonus ? <span className="text-muted"> ({p.bonus} free from invites)</span> : null}
        </p>
        <p className="text-muted">
          Preparing is free. Submissions come in packs: {p.label} ({p.each} each), used one at a time as applications, scholarship forms and funding requests go in. No subscription, and they don&apos;t expire.
        </p>
        <BuyPack label={p.label} back="settings" size="sm" variant={left ? "secondary" : "primary"}>{left ? "Buy another pack" : `Buy ${p.label}`}</BuyPack>
        {!p.ready && <p className="text-xs text-muted">Payments open shortly.</p>}
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      {p.pro ? (
        <p>
          You&apos;re on <span className="font-medium">Pro</span>: up to 10 submissions a month. {p.cancelled ? `It ends on ${until}.` : `Renews on ${until}.`}
        </p>
      ) : (
        <p>
          Free: <span className="font-medium tabular">{Math.min(p.used, p.free)} of {p.free}</span> free applications used. Pro is {p.label} for up to 10 submissions a month.
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
