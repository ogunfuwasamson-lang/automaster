"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ANGLES, PLACEHOLDERS, type Angle, type CreditPolicy } from "@/lib/credit-policy";
import { copy, type NudgeCtx } from "@/lib/nudge-rules";

// the operator edits every number and every word behind credit priority and the asks to pay. one save writes the
// whole policy; the server clamps anything out of range and sends back what it stored.

const ANGLE_LABEL: Record<Angle, [string, string]> = {
  deadline: ["Deadline", "Their nearest real deadline (shown when one is within 45 days; always leads inside 14)"],
  ready: ["Ready to send", "Applications written and waiting to go in"],
  progress: ["Progress so far", "Programmes found and essays drafted"],
  handsoff: ["Hands off", "The agents fill every portal page for them"],
  funding: ["Funding asks", "Fee waivers and funding emails count as submissions"],
  value: ["What's included", "What a pack or Pro covers"],
  freeleft: ["Free ones running out", "Pro countries only, with one or no free application left"],
};

const SAMPLE: Record<"pack" | "subscription", NudgeCtx> = {
  pack: { model: "pack", price: "₦10,000 for 5 submissions", programs: 12, essays: 4, ready: 2, nearest: { school: "University of Leeds", days: 9 }, freeLeft: null },
  subscription: { model: "subscription", price: "$20 a month", programs: 12, essays: 4, ready: 2, nearest: { school: "University of Leeds", days: 9 }, freeLeft: 1 },
};

const input = "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13.5px] tabular-nums";
const label = "block text-[12.5px] text-muted";

function Num({ name, value, onChange, step = "0.01", min = 0, max, hint, suffix }: { name: string; value: number; onChange: (n: number) => void; step?: string; min?: number; max?: number; hint: string; suffix?: string }) {
  const id = `f-${name.replace(/\W+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13.5px] font-medium">
        {name}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input id={id} type="number" inputMode="decimal" step={step} min={min} max={max} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))} className={`${input} max-w-[9rem]`} />
        {suffix && <span className="text-[13px] text-muted">{suffix}</span>}
      </div>
      <p className="mt-1 text-[12.5px] text-muted">{hint}</p>
    </div>
  );
}

function Toggle({ on, onChange, children }: { on: boolean; onChange: (b: boolean) => void; children: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px]">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-current" />
      {children}
    </label>
  );
}

export function CreditEditor({ initial, defaults }: { initial: CreditPolicy; defaults: CreditPolicy }) {
  const router = useRouter();
  const [p, setP] = useState<CreditPolicy>(initial);
  const [days, setDays] = useState(initial.nudges.emailDays.join(", "));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [model, setModel] = useState<"pack" | "subscription">("pack");
  const [open, setOpen] = useState<Angle | null>(null);
  const dirty = useMemo(() => JSON.stringify({ ...p, nudges: { ...p.nudges, emailDays: days } }) !== JSON.stringify({ ...initial, nudges: { ...initial.nudges, emailDays: initial.nudges.emailDays.join(", ") } }), [p, days, initial]);

  const set = <K extends keyof CreditPolicy>(k: K, v: CreditPolicy[K]) => setP((x) => ({ ...x, [k]: v }));
  const setN = <K extends keyof CreditPolicy["nudges"]>(k: K, v: CreditPolicy["nudges"][K]) => setP((x) => ({ ...x, nudges: { ...x.nudges, [k]: v } }));
  const setA = (a: Angle, patch: Partial<CreditPolicy["nudges"]["angles"][Angle]>) => setP((x) => ({ ...x, nudges: { ...x.nudges, angles: { ...x.nudges.angles, [a]: { ...x.nudges.angles[a], ...patch } } } }));

  async function save(next: CreditPolicy, emailDays: string) {
    setBusy(true);
    setMsg(null);
    const body = { ...next, nudges: { ...next.nudges, emailDays: emailDays.split(/[\s,]+/).filter(Boolean).map(Number) } };
    const res = await fetch("/api/admin/credit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { policy?: CreditPolicy; error?: string };
    setBusy(false);
    if (!res?.ok || !data.policy) {
      setMsg({ ok: false, text: data?.error ?? "Didn't save. Try again." });
      return;
    }
    setP(data.policy);
    setDays(data.policy.nudges.emailDays.join(", "));
    setMsg({ ok: true, text: "Saved. Agents use the new settings within a minute." });
    router.refresh();
  }

  const limit = Number.isFinite(p.dailyLimitUsd) ? p.dailyLimitUsd : 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save(p, days);
      }}
    >
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <h2 className="text-[14.5px] font-semibold">Who gets AI credit first</h2>
        <p className="text-[12.5px] text-muted">
          Interview, document reading and profile work always run. These limits apply to research (finding and checking programmes) and writing.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Num name="Daily limit for the whole platform" value={p.dailyLimitUsd} onChange={(n) => set("dailyLimitUsd", n)} suffix="USD a day" hint="Total AI spend in a UTC day before starters' work waits for tomorrow. 0 switches it off. You get one email the first time each day it's reached." />
          <Num name="Starter allowance" value={p.starterUsd} onChange={(n) => set("starterUsd", n)} suffix="USD a month" hint="Research and writing for an account with no document, no Gmail and nothing signed. Past it, their work waits until they upload or connect. A full first shortlist has cost $1 to $2.30." />
          <Num name="Admin accounts" value={p.staffMonthlyUsd} onChange={(n) => set("staffMonthlyUsd", n)} suffix="USD a month each" hint="Each admin account, including the nightly learning pass that runs under one. Team accounts keep the normal allowance but are never held. A budget override set by hand on an account still wins." />
          <Num name="Starters wait from" value={Math.round(p.starterShareOfDay * 100)} step="5" max={100} onChange={(n) => set("starterShareOfDay", n / 100)} suffix={`% of the limit ($${(limit * p.starterShareOfDay).toFixed(2)})`} hint="So engaged and paying accounts go first on a busy day." />
          <Num name="Everyone unpaid waits from" value={p.runawayMultiple} step="0.5" min={1} onChange={(n) => set("runawayMultiple", n)} suffix={`× the limit ($${(limit * p.runawayMultiple).toFixed(2)})`} hint="A runaway day. Past it only paying and staff accounts run." />
          <Num name="Pause research after" value={p.inactiveDays} step="1" onChange={(n) => set("inactiveDays", n)} suffix="days away" hint="Unpaid accounts nobody has used in this long get no new research until they're back. 0 switches it off." />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <h2 className="text-[14.5px] font-semibold">Asking engaged applicants to pay</h2>
        <p className="text-[12.5px] text-muted">Only accounts that uploaded a document, connected Gmail or signed, and haven&apos;t paid. They stop the moment someone pays.</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <Toggle on={p.nudges.inApp} onChange={(b) => setN("inApp", b)}>
            Card on their dashboard (a different angle each day)
          </Toggle>
          <Toggle on={p.nudges.email} onChange={(b) => setN("email", b)}>
            Email sequence (10am their time, only if they get our emails)
          </Toggle>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="f-days" className="block text-[13.5px] font-medium">
              Email on these days
            </label>
            <input id="f-days" value={days} onChange={(e) => setDays(e.target.value)} className={`${input} mt-1`} />
            <p className="mt-1 text-[12.5px] text-muted">Days after they became engaged, comma separated. One email per day listed.</p>
          </div>
          <Num name="At least this long between emails" value={p.nudges.emailGapDays} step="1" onChange={(n) => setN("emailGapDays", n)} suffix="days" hint="So someone who signed up weeks ago doesn't get several at once." />
          <Num name={`"Not now" hides the card for`} value={p.nudges.snoozeDays} step="1" onChange={(n) => setN("snoozeDays", n)} suffix="days" hint="On that browser." />
        </div>

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[13.5px] font-semibold">Angles and wording</h3>
          <div className="flex items-center gap-2 text-[12.5px] text-muted">
            Preview as
            <select value={model} onChange={(e) => setModel(e.target.value as "pack" | "subscription")} className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[12.5px]" aria-label="Preview as">
              <option value="pack">Africa (packs)</option>
              <option value="subscription">Elsewhere (Pro)</option>
            </select>
          </div>
        </div>
        <p className="text-[12.5px] text-muted">
          Leave a box empty to use the built-in wording. You can use {PLACEHOLDERS.join(" ")}. Prices show in the app only, never in emails.
        </p>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {ANGLES.map((a) => {
            const s = p.nudges.angles[a];
            const prev = copy(a, SAMPLE[model], { prices: true }, { [a]: s });
            const isOpen = open === a;
            return (
              <li key={a} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Toggle on={s.on} onChange={(b) => setA(a, { on: b })}>
                    {ANGLE_LABEL[a][0]}
                  </Toggle>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{ANGLE_LABEL[a][1]}</span>
                  {(s.headline || s.body || s.cta) && <span className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-muted">Your wording</span>}
                  <button type="button" onClick={() => setOpen(isOpen ? null : a)} aria-expanded={isOpen} className="text-[13px] underline decoration-current/30 underline-offset-4">
                    {isOpen ? "Close" : "Edit wording"}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <div>
                        <label className={label} htmlFor={`h-${a}`}>Headline</label>
                        <input id={`h-${a}`} value={s.headline} placeholder={copy(a, SAMPLE[model]).headline} onChange={(e) => setA(a, { headline: e.target.value })} className={input} maxLength={120} />
                      </div>
                      <div>
                        <label className={label} htmlFor={`b-${a}`}>Message</label>
                        <textarea id={`b-${a}`} value={s.body} placeholder={copy(a, SAMPLE[model]).body} onChange={(e) => setA(a, { body: e.target.value })} className={`${input} min-h-24`} maxLength={600} />
                      </div>
                      <div>
                        <label className={label} htmlFor={`c-${a}`}>Button</label>
                        <input id={`c-${a}`} value={s.cta} placeholder={copy(a, SAMPLE[model]).cta} onChange={(e) => setA(a, { cta: e.target.value })} className={`${input} max-w-xs`} maxLength={40} />
                      </div>
                      {(s.headline || s.body || s.cta) && (
                        <button type="button" onClick={() => setA(a, { headline: "", body: "", cta: "" })} className="text-[12.5px] text-muted underline underline-offset-4">
                          Back to the built-in wording
                        </button>
                      )}
                    </div>
                    <div className="rounded-xl border border-line p-3" aria-label="Preview">
                      <p className="text-[11.5px] text-muted">Preview with a sample applicant</p>
                      <p className="mt-1 font-serif text-[18px] leading-snug">{prev.headline}</p>
                      <p className="mt-1 text-[13.5px] text-muted">{prev.body}</p>
                      <span className="mt-2 inline-block rounded-lg bg-foreground px-3 py-1.5 text-[13px] font-medium text-background">{prev.cta}</span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-background/95 px-3 py-2.5 backdrop-blur">
        <button type="submit" disabled={busy || !dirty} className="tap rounded-lg bg-foreground px-3.5 py-1.5 text-[13.5px] font-medium text-background disabled:opacity-40">
          {busy ? "Saving" : "Save changes"}
        </button>
        <button type="button" disabled={busy || !dirty} onClick={() => { setP(initial); setDays(initial.nudges.emailDays.join(", ")); setMsg(null); }} className="tap rounded-lg border border-line px-3 py-1.5 text-[13.5px] disabled:opacity-40">
          Discard
        </button>
        <button type="button" disabled={busy} onClick={() => { setP(defaults); setDays(defaults.nudges.emailDays.join(", ")); }} className="text-[13px] text-muted underline decoration-current/30 underline-offset-4">
          Fill in the defaults
        </button>
        {msg && (
          <p role="status" className={`text-[13px] ${msg.ok ? "text-go" : "text-stop"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
