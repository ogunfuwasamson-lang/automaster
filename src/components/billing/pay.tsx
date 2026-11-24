"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CREDITS, PRICE_LINE } from "@/lib/credit-prices";

async function go(body: Record<string, unknown>) {
  const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!r.ok || !j.url) throw new Error(j.error ?? "Couldn't open the payment page");
  window.location.assign(j.url);
}

// buy a pack of credits (africa). from an application or request it goes in straight after paying.
export function BuyPack({ label, applicationId, messageId, back, size = "md", variant = "primary", children }: { label: string; applicationId?: string; messageId?: string; back?: "onboarding" | "settings" | "credits"; size?: "sm" | "md" | "lg"; variant?: "primary" | "secondary" | "accent"; children?: React.ReactNode }) {
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
        <p className="mt-1 text-[14px] text-muted">{note ?? `This month's credits are used. The agents submit ${school} as soon as the new month's arrive.`}</p>
      </section>
    );
  if (kind === "pack")
    return (
      <section className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-surface p-5 shadow-card ${highlight ? "border-brand ring-4 ring-brand/10" : "border-brand/30"}`}>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[20px] leading-snug">Ready to submit</p>
          <p className="mt-1 text-[14px] text-muted">The agents filled every page of your {school} application. Submitting uses {CREDITS.application} credits: buy {label} and it goes in straight away; the rest are there for your next applications and checks.</p>
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

// settings: the credit wallet (lib/wallet): what's left, what's set aside, what expires next, and how to get more
// explain: the price line under the balance (the credits page lists the prices on their own, so it leaves it out)
export function PlanCard(p: { model: "pack" | "subscription"; label: string; credits: number; held: number; expiring: { credits: number; at: string } | null; bonus?: number; pro: boolean; until: string | null; cancelled: boolean; ready: boolean; explain?: boolean; back?: "settings" | "credits" }) {
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
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long" });
  const how =
    p.model === "pack"
      ? `${p.label}, lasting ${CREDITS.packDays} days.`
      : p.pro
        ? `Pro gives you ${CREDITS.pro} a month. ${p.cancelled ? `It ends on ${p.until ? day(p.until) : "the end of the month"}.` : `Renews on ${p.until ? day(p.until) : "the 1st"}.`}`
        : `Pro is ${p.label} for ${CREDITS.pro} credits a month.`;
  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className="font-serif text-[28px] leading-none tabular">{p.credits}</span> <span className="font-medium">credit{p.credits === 1 ? "" : "s"} to use</span>
        {p.held ? <span className="text-muted"> · {p.held} set aside for applications in progress</span> : null}
      </p>
      {p.expiring ? (
        <p className="text-muted">
          {p.expiring.credits} expire on {day(p.expiring.at)}.
        </p>
      ) : null}
      <p className="text-muted">
        {p.explain === false ? how : `${PRICE_LINE} ${how} Invite a friend and you both get ${CREDITS.invite}, which don't expire.`}
      </p>
      {p.bonus ? <p className="text-muted">You also have a free submission from before credits: it pays for an application you&apos;ve already signed.</p> : null}
      <div className="flex flex-wrap gap-2">
        {p.model === "pack" ? (
          <BuyPack label={p.label} back={p.back ?? "credits"} size="sm" variant={p.credits >= CREDITS.application ? "secondary" : "primary"}>{`Buy ${p.label}`}</BuyPack>
        ) : null}
        {p.model === "subscription" && !p.pro && (
          <Button
            size="sm"
            disabled={!!busy || !p.ready}
            onClick={async () => {
              setBusy("pro");
              try {
                await go({ kind: "pro", back: p.back ?? "credits" });
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

// an inline "Upgrade" that goes straight to the payment page (a pack where packs are sold, Pro elsewhere), not
// to the pricing page: one click from "you've hit the limit" to paying
export function UpgradeLink({ kind, children = "Upgrade" }: { kind: "pack" | "pro"; children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 disabled:opacity-60"
      onClick={async () => {
        setBusy(true);
        try {
          await go({ kind, back: "credits", from: "limit" });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn't open the payment page");
          setBusy(false);
        }
      }}
    >
      {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
