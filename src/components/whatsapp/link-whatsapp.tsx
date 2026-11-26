"use client";
import { useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/wordmark";
import { IVYWARD_WHATSAPP } from "@/lib/whatsapp-rules";

export type WaState = { status: "off" | "pending" | "active" | "stopped"; code?: string; link?: string; phone?: string; linked?: boolean };

// linked once: a number that later replied STOP stays linked (their opt-out is respected, not asked again)
export const isLinked = (s: WaState) => s.status === "active" || !!s.linked;
const NUMBER = `+${IVYWARD_WHATSAPP.slice(0, 3)} ${IVYWARD_WHATSAPP.slice(3, 6)} ${IVYWARD_WHATSAPP.slice(6, 9)} ${IVYWARD_WHATSAPP.slice(9)}`;
const WA = "#128C7E";

// setup's WhatsApp step (founder, 26 nov 2026: required for everyone who sets up on the web), as the three things
// that happen in order: they agree (an explicit opt-in, as Meta requires), send the code from their own WhatsApp
// (which links the number they sent it from, lib/whatsapp-server), and it's linked. the page checks every 3 seconds
// until the message arrives.
export function LinkWhatsApp({ state, onChange }: { state: WaState; onChange: (s: WaState) => void }) {
  const [busy, setBusy] = useState(false);
  const linked = isLinked(state);
  const pending = !linked && state.status === "pending" && !!state.code;
  const at = linked ? 3 : pending ? 2 : 1;

  useEffect(() => {
    if (!pending) return;
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
  }, [pending, onChange]);

  async function call(method: "GET" | "POST") {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp", { method, headers: { "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ action: "on", consent: true }) } : {}) });
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

  async function copy() {
    try {
      await navigator.clipboard.writeText(state.code ?? "");
      toast.success("Code copied");
    } catch {
      toast("Select the code and copy it");
    }
  }

  return (
    <ol className="space-y-2" aria-label="Link your WhatsApp in three steps">
      <Row n={1} at={at} title="Agree to messages" doneText="Agreed. Stop any time by replying STOP.">
        <p className="max-w-lg text-[14.5px] leading-relaxed">I agree to get messages from Ivyward on WhatsApp about my applications. I can stop them any time by replying STOP.</p>
        <Button size="lg" className="mt-4" disabled={busy} onClick={() => call("POST")}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          I agree, get my code
        </Button>
      </Row>

      <Row n={2} at={at} title="Send your code" doneText={state.phone ? `Sent from ${state.phone}.` : "Sent."}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[28px] font-bold tabular-nums tracking-[0.06em]">{state.code}</span>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted outline-none hover:bg-neutral-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus dark:hover:bg-neutral-800">
            <Copy className="size-3.5" aria-hidden /> Copy
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a href={state.link} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: WA }} className="inline-flex h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-semibold text-white outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus">
            <MessageCircle className="size-4" aria-hidden /> Open WhatsApp
          </a>
          <button type="button" disabled={busy} onClick={() => call("GET")} className="text-[14px] font-medium text-muted underline decoration-line underline-offset-4 hover:text-foreground disabled:opacity-50">
            I&apos;ve sent it
          </button>
        </div>
        <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-muted">
          WhatsApp opens with the message typed: press send. On a computer, send <span className="whitespace-nowrap font-semibold text-foreground">{state.code}</span> to <span className="whitespace-nowrap font-semibold text-foreground">{NUMBER}</span> from your phone.
        </p>
        <p className="mt-3 flex items-center gap-2 text-[13.5px] text-muted" role="status">
          <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden /> Waiting for your message
        </p>
      </Row>

      <Row n={3} at={at} title="Linked" doneText={state.status === "active" ? "Your welcome message and your shortlist are waiting in WhatsApp." : "You turned the messages off. Turn them back on in Settings."} last>
        {null}
      </Row>
    </ol>
  );
}

// one of the three: done ones fold to a line, the current one opens with its action, later ones wait dimmed
function Row({ n, at, title, doneText, last = false, children }: { n: number; at: number; title: string; doneText: string; last?: boolean; children: React.ReactNode }) {
  const done = n < at || (last && at === 3);
  const now = n === at && !done;
  return (
    <li className={`flex gap-3 rounded-2xl border p-4 sm:gap-4 sm:p-5 ${now ? "border-line bg-surface shadow-card" : "border-transparent"} ${!done && !now ? "opacity-55" : ""}`} aria-current={now ? "step" : undefined}>
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold ${done ? "bg-go/12 text-go" : now ? "text-white" : "border border-line text-muted"}`} style={now ? { backgroundColor: WA } : undefined} aria-hidden>
        {done ? <Check className="size-4" /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-[16px] font-bold tracking-[-0.015em]">
          {title}
          {done ? <span className="sr-only"> (done)</span> : null}
        </p>
        {done ? <p className="mt-0.5 text-[13.5px] text-muted">{doneText}</p> : now ? <div className="mt-3">{children}</div> : null}
      </div>
    </li>
  );
}

// what the messages look like: an example conversation, so the ask comes with its reason
export function WhatsAppPreview({ className = "" }: { className?: string }) {
  return (
    <figure className={`overflow-hidden rounded-[22px] border border-line shadow-card ${className}`}>
      <div className="flex items-center gap-2.5 px-4 py-3 text-white" style={{ backgroundColor: "#075E54" }}>
        <span className="grid size-8 place-items-center rounded-full bg-white">
          <Mark className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold leading-tight">Ivyward</span>
          <span className="block text-[11.5px] leading-tight text-white/75">Your applications</span>
        </span>
      </div>
      <div className="space-y-2 bg-[#efeae2] px-3 py-4 text-[13px] leading-snug text-[#111b21] dark:bg-[#0b141a] dark:text-[#e9edef]">
        <Bubble from="them" time="09:12">
          Hi Ada, your application to the University of Toronto is ready to sign. The deadline is 15 January.
          <span className="mt-2 block border-t border-black/10 pt-2 text-center font-semibold text-[#027eb5] dark:border-white/10 dark:text-[#53bdeb]">Open the application</span>
        </Bubble>
        <Bubble from="me" time="09:20">Can I still add my IELTS score?</Bubble>
        <Bubble from="them" time="09:20">Yes. Send the score report here and your agents add it before you sign.</Bubble>
      </div>
      <figcaption className="border-t border-line bg-surface px-4 py-2.5 text-[12px] leading-snug text-muted">An example. At most one message a week, more often only when a deadline is close.</figcaption>
    </figure>
  );
}

function Bubble({ from, time, children }: { from: "me" | "them"; time: string; children: React.ReactNode }) {
  const me = from === "me";
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <p className={`max-w-[85%] rounded-lg px-2.5 py-1.5 shadow-[0_1px_0.5px_rgb(0_0_0/0.13)] ${me ? "rounded-tr-none bg-[#d9fdd3] dark:bg-[#005c4b]" : "rounded-tl-none bg-white dark:bg-[#202c33]"}`}>
        {children}
        <span className="float-right ml-2 mt-1.5 text-[10.5px] leading-none text-black/45 dark:text-white/50">{time}</span>
      </p>
    </div>
  );
}
