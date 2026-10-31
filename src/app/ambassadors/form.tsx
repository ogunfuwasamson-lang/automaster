"use client";
import { useState } from "react";

export function AmbassadorForm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setErr("");
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const r = await fetch("/api/ambassadors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setErr(j.error ?? "Something went wrong. Try again.");
      setState("idle");
      return;
    }
    setState("done");
  }
  if (state === "done")
    return (
      <p className="rounded-2xl border border-line bg-surface p-5 font-medium" role="status">
        Thanks. We&apos;ll be in touch by email. In the meantime, sign up and grab your invite link from Settings.
      </p>
    );
  const field = "mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2.5 text-[15px] outline-none focus:border-accent";
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
      <label className="text-[13.5px] font-medium">
        Your name
        <input name="name" required className={field} />
      </label>
      <label className="text-[13.5px] font-medium">
        Email
        <input name="email" type="email" required className={field} />
      </label>
      <label className="text-[13.5px] font-medium">
        Country
        <input name="country" className={field} />
      </label>
      <label className="text-[13.5px] font-medium">
        University, school or community
        <input name="institution" className={field} />
      </label>
      <label className="text-[13.5px] font-medium sm:col-span-2">
        Who would you tell about Ivyward?
        <textarea name="audience" rows={3} placeholder="For example: final-year engineering students at my university, a 5,000-member scholarship WhatsApp group" className={field} />
      </label>
      <label className="text-[13.5px] font-medium sm:col-span-2">
        Where (links to your groups, pages or channels)
        <textarea name="channels" rows={2} className={field} />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="sm:col-span-2">
        <button disabled={state === "busy"} className="h-11 rounded-xl bg-ink px-5 text-[15px] font-medium text-on-ink disabled:opacity-50">
          {state === "busy" ? "Sending…" : "Apply to be an ambassador"}
        </button>
        {err && (
          <p className="mt-2 text-[13.5px] text-stop" role="alert">
            {err}
          </p>
        )}
      </div>
    </form>
  );
}
