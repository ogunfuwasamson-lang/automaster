"use client";
import { useState } from "react";

// monthly scholarship deadline alerts, for readers who aren't ready to sign up
export function AlertSignup({ source, compact }: { source: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "already">("idle");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setErr("");
    const website = (new FormData(e.currentTarget).get("website") as string) || "";
    const r = await fetch("/api/alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, source, website }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setErr(j.error ?? "Something went wrong. Try again.");
      setState("idle");
      return;
    }
    setState(j.status === "already" ? "already" : "sent");
  }
  return (
    <aside className={`rounded-2xl border border-line bg-surface ${compact ? "p-5" : "my-12 p-6 sm:p-7"}`} aria-labelledby={`alerts-${source}`}>
      <p id={`alerts-${source}`} className="font-serif text-[22px] leading-snug">
        Get scholarship deadlines by email
      </p>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">Once a month: the big fully funded scholarships closing in the next few weeks, with links to the official pages. Unsubscribe any time.</p>
      {state === "sent" ? (
        <p className="mt-4 text-[15px] font-medium" role="status">
          Check your inbox and confirm your email to start getting alerts.
        </p>
      ) : state === "already" ? (
        <p className="mt-4 text-[15px] font-medium" role="status">
          You&apos;re already subscribed.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`alert-email-${source}`}>
            Email address
          </label>
          <input id={`alert-email-${source}`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-background px-3 text-[15px] outline-none focus:border-accent" />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <button disabled={state === "busy"} className="h-11 rounded-xl bg-ink px-5 text-[15px] font-medium text-on-ink disabled:opacity-50">
            {state === "busy" ? "Signing up…" : "Send me deadlines"}
          </button>
        </form>
      )}
      {err && (
        <p className="mt-2 text-[13.5px] text-stop" role="alert">
          {err}
        </p>
      )}
    </aside>
  );
}
