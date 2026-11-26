"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type State = {
  phoneId: string;
  wabaId: string;
  env: { token: boolean; appSecret: boolean; verifyToken: boolean };
  contacts: { active: number; pending: number };
  sentThisWeek: number;
  meta: { number: Record<string, string>; templates: { name: string; status: string; category: string }[] | { error: string } } | null;
};

// staff: WhatsApp's setup, what Meta says about the number and templates, and the two API steps
export function WhatsAppPanel() {
  const [s, setS] = useState<State | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => fetch("/api/admin/whatsapp").then((r) => r.json()).then(setS).catch(() => setS(null));
  useEffect(() => {
    load();
  }, []);
  async function act(body: Record<string, string>, done: string) {
    setBusy(body.action);
    try {
      const r = await fetch("/api/admin/whatsapp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Didn't work");
      toast.success(done);
      setPin("");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  if (!s) return <p className="text-[13.5px] text-muted">Loading WhatsApp…</p>;
  const tick = (ok: boolean) => (ok ? "set" : "missing");
  const num = s.meta?.number ?? {};
  const templates = s.meta && Array.isArray(s.meta.templates) ? s.meta.templates : [];
  return (
    <section className="space-y-4 rounded-2xl border border-line p-5">
      <div>
        <h2 className="font-serif text-[20px]">WhatsApp</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          Number id {s.phoneId}. {s.contacts.active} applicants linked, {s.contacts.pending} waiting to send their code, {s.sentThisWeek} updates sent in the last 7 days.
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-[13.5px] sm:grid-cols-2">
        <dt className="text-muted">Access token (WHATSAPP_TOKEN)</dt>
        <dd>{tick(s.env.token)}</dd>
        <dt className="text-muted">App secret (WHATSAPP_APP_SECRET)</dt>
        <dd>{tick(s.env.appSecret)}</dd>
        <dt className="text-muted">Webhook verify token (WHATSAPP_VERIFY_TOKEN)</dt>
        <dd>{tick(s.env.verifyToken)}</dd>
        {"verified_name" in num && (
          <>
            <dt className="text-muted">Display name</dt>
            <dd>
              {num.verified_name} ({(num.name_status ?? "").toLowerCase().replace(/_/g, " ")})
            </dd>
            <dt className="text-muted">Number</dt>
            <dd>
              {num.display_phone_number}: {(num.code_verification_status ?? "").toLowerCase()}, {(num.status ?? "").toLowerCase()}, quality {(num.quality_rating ?? "").toLowerCase()}
            </dd>
          </>
        )}
        {"error" in num && (
          <>
            <dt className="text-muted">Meta</dt>
            <dd className="text-stop">{num.error}</dd>
          </>
        )}
      </dl>
      {templates.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line text-[13.5px]">
          {templates.map((t) => (
            <li key={t.name} className="flex justify-between gap-3 px-4 py-2">
              <span className="font-medium">{t.name}</span>
              <span className={t.status === "APPROVED" ? "text-go" : t.status === "REJECTED" ? "text-stop" : "text-muted"}>
                {t.status.toLowerCase()}, {t.category.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <label className="text-[13.5px]">
          <span className="block text-muted">Two-step PIN for the number (6 digits, you choose it)</span>
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="off" className="mt-1 w-32 rounded-lg border border-line bg-surface px-3 py-2 tracking-widest" />
        </label>
        <Button size="sm" disabled={pin.length !== 6 || !!busy || !s.env.token} onClick={() => act({ action: "register", pin }, "Number registered on the Cloud API")}>
          Register the number
        </Button>
        <Button size="sm" variant="secondary" disabled={!!busy || !s.env.token} onClick={() => act({ action: "subscribe" }, "Webhooks connected")}>
          Connect webhooks
        </Button>
      </div>
    </section>
  );
}
