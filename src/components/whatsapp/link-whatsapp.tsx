"use client";
import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IVYWARD_WHATSAPP } from "@/lib/whatsapp-rules";

export type WaState = { status: "off" | "pending" | "active" | "stopped"; code?: string; link?: string; phone?: string; linked?: boolean };

// linked once: a number that later replied STOP stays linked (their opt-out is respected, not asked again)
export const isLinked = (s: WaState) => s.status === "active" || !!s.linked;
const NUMBER = `+${IVYWARD_WHATSAPP.slice(0, 3)} ${IVYWARD_WHATSAPP.slice(3, 6)} ${IVYWARD_WHATSAPP.slice(6, 9)} ${IVYWARD_WHATSAPP.slice(9)}`;

// setup's WhatsApp step (founder, 26 nov 2026: required for everyone who sets up on the web). they tick the consent,
// then send a code from their own WhatsApp, which links the number they sent it from (lib/whatsapp-server). the page
// checks every few seconds until the message arrives.
export function LinkWhatsApp({ state, onChange }: { state: WaState; onChange: (s: WaState) => void }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.status !== "pending") return;
    let tries = 0;
    const t = setInterval(async () => {
      if (document.hidden) return;
      if (++tries > 200) return clearInterval(t); // ten minutes
      const next = (await fetch("/api/whatsapp")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as WaState | null;
      if (next && next.status !== "pending") onChange(next);
    }, 3000);
    return () => clearInterval(t);
  }, [state.status, onChange]);

  async function call(method: "GET" | "POST") {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp", { method, headers: { "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ action: "on", consent: agree }) } : {}) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      onChange(json as WaState);
      if (method === "GET" && json.status === "pending") toast("Not here yet. Send the code from WhatsApp, then check again.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (isLinked(state))
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-go/30 bg-go/[0.04] p-5" role="status">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-go" aria-hidden />
        <div>
          <p className="text-[17px] font-bold tracking-[-0.02em]">{state.status === "active" ? `Linked to ${state.phone ?? "your WhatsApp"}` : "Your WhatsApp is linked"}</p>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">
            {state.status === "active" ? "Ivyward has sent you a message there. Reply any time to ask Ivyward AI about your applications." : "You turned the messages off. You can turn them back on in Settings."}
          </p>
        </div>
      </div>
    );

  if (state.status === "pending" && state.code)
    return (
      <div className="space-y-4 rounded-2xl border border-[#25D366]/40 bg-[#25D366]/[0.05] p-5">
        <div>
          <p className="text-[14px] text-muted">Send this code to Ivyward on WhatsApp</p>
          <p className="mt-1 text-[30px] font-bold tabular-nums tracking-[0.06em]">{state.code}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href={state.link} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#128C7E] px-6 text-[15px] font-semibold text-white hover:bg-[#0f7a6e]">
            <MessageCircle className="size-4" aria-hidden /> Open WhatsApp
          </a>
          <Button size="lg" variant="ghost" disabled={busy} onClick={() => call("GET")}>
            I&apos;ve sent it
          </Button>
        </div>
        <p className="max-w-xl text-[13.5px] leading-relaxed text-muted">
          On a computer? Open WhatsApp on your phone and send <span className="whitespace-nowrap font-semibold text-foreground">{state.code}</span> to <span className="whitespace-nowrap font-semibold text-foreground">{NUMBER}</span>.
        </p>
        <p className="flex items-center gap-2 text-[13.5px] text-muted" role="status">
          <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden /> Waiting for your message. This updates by itself once it arrives.
        </p>
      </div>
    );

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <label className="flex cursor-pointer items-start gap-3 text-[14.5px] leading-relaxed">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-4 shrink-0 accent-current" />
        <span>I agree to get messages from Ivyward on WhatsApp about my applications. I can stop them any time by replying STOP.</span>
      </label>
      <Button size="lg" disabled={!agree || busy} onClick={() => call("POST")}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
        Get my code
      </Button>
    </div>
  );
}
