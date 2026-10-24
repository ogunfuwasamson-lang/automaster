"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAPABILITY_LABEL, MODE_LABEL, USER_SETTABLE } from "@/lib/dial";
import type { GrantMode } from "@/lib/policy";

async function post(url: string, body?: Record<string, unknown>, method = "POST") {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "failed");
  return json;
}

const card = "space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800";
const btn = "rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900";
const ghost = "rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700";

export function Dial({ grants }: { grants: { capability: string; mode: GrantMode; undo_seconds: number }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const order = Object.keys(CAPABILITY_LABEL);
  const sorted = [...grants].sort((a, b) => order.indexOf(a.capability) - order.indexOf(b.capability));
  return (
    <div className="space-y-1">
      {sorted.map((g) => {
        const label = CAPABILITY_LABEL[g.capability] ?? { name: g.capability, help: "" };
        const options = USER_SETTABLE[g.capability];
        return (
          <div key={g.capability} className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 py-2 last:border-0 dark:border-neutral-800">
            <div className="min-w-0">
              <p className="text-sm">{label.name}</p>
              <p className="text-xs text-neutral-500">{label.help}</p>
            </div>
            {options ? (
              <select
                value={g.mode}
                disabled={busy === g.capability}
                onChange={async (e) => {
                  setBusy(g.capability);
                  setErr("");
                  await post("/api/controls", { action: "set_grant", capability: g.capability, mode: e.target.value }).catch((x) => setErr(x.message));
                  setBusy(null);
                  router.refresh();
                }}
                className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
              >
                {options.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}{m === "auto_undo" && g.undo_seconds ? ` (${g.undo_seconds / 60} min)` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-neutral-500">always asks you</span>
            )}
          </div>
        );
      })}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function FeeEnvelope({ usd }: { usd: number }) {
  const [v, setV] = useState(String(usd));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>agents may pay up to</span>
      <span className="flex items-center rounded-md border border-neutral-300 px-2 dark:border-neutral-700">
        $<input value={v} onChange={(e) => { setV(e.target.value.replace(/\D/g, "")); setState("idle"); }} className="w-16 bg-transparent py-1 pl-1 outline-none" />
      </span>
      <span>in application fees in total without asking.</span>
      <button
        disabled={state === "saving" || Number(v || 0) === usd}
        onClick={async () => {
          setState("saving");
          await post("/api/controls", { action: "set_fee_envelope", usd: Number(v || 0) }).catch(() => {});
          setState("saved");
          router.refresh();
        }}
        className={ghost}
      >
        {state === "saved" ? "saved" : "save"}
      </button>
      <p className="w-full text-xs text-neutral-500">$0 means the runner stops at every payment page for you. your card stays in your browser; we never see it.</p>
    </div>
  );
}

export function DigestToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={on}
        onChange={async (e) => {
          setOn(e.target.checked);
          await post("/api/controls", { action: "set_digest", enabled: e.target.checked }).catch(() => setOn(!e.target.checked));
        }}
      />
      morning digest at 7am (on the dashboard, and to your inbox when gmail is connected)
    </label>
  );
}

export function MailCard({ available, email, status, error, notice }: { available: boolean; email: string | null; status: string | null; error: string | null; notice: string | null }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const NOTICE: Record<string, string> = {
    connected: "gmail connected. approved emails now send from your address.",
    declined: "you cancelled on google's screen. nothing was connected.",
    scope: "google didn't grant send permission. try again and tick the gmail box.",
    expired: "that link expired. try again.",
    error: "couldn't connect gmail. try again.",
    unavailable: "email sending isn't switched on for this app yet.",
  };
  return (
    <section className={card}>
      <h2 className="text-sm font-medium">email</h2>
      {notice && NOTICE[notice] && <p className="text-sm text-neutral-600 dark:text-neutral-400">{NOTICE[notice]}</p>}
      {!available ? (
        <p className="text-sm text-neutral-500">sending from the app isn&apos;t switched on yet. until then, drafts open in your own email app.</p>
      ) : email ? (
        <>
          <p className="text-sm">
            sending as <span className="font-medium">{email}</span>
            {status !== "active" && <span className="text-red-600"> · {error ?? "needs reconnecting"}</span>}
          </p>
          <p className="text-xs text-neutral-500">automaster sends as you and looks only for portal verification emails. sent emails appear in your gmail sent folder.</p>
          <div className="flex gap-2">
            {status !== "active" && <a href="/api/mail/connect" className={btn}>reconnect</a>}
            <button disabled={busy} onClick={async () => { setBusy(true); await post("/api/mail/disconnect").catch(() => {}); setBusy(false); router.refresh(); }} className={ghost}>disconnect</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">connect gmail so approved emails go out from your own address, and so the agents can read the verification codes portals send when they create your accounts.</p>
          <p className="text-xs text-neutral-500">the agents only search your inbox for portal verification emails. they never delete or change anything.</p>
          <a href="/api/mail/connect" className={`${btn} inline-block`}>connect gmail</a>
        </>
      )}
    </section>
  );
}

export function RunnerCard({ tokens }: { tokens: { id: string; label: string | null; created_at: string; last_used_at: string | null }[] }) {
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <section className={card}>
      <h2 className="text-sm font-medium">optional: browser extension</h2>
      <p className="text-sm">you don&apos;t need this: the agents submit from our servers. the extension is for portals that block servers, so the same work can run in your own Chrome instead.</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
        <li><a href="/automaster-runner.zip" className="underline">download the extension</a> and unzip it.</li>
        <li>in Chrome open <span className="font-mono text-xs">chrome://extensions</span>, switch on developer mode, click &quot;load unpacked&quot; and pick the unzipped folder.</li>
        <li>create a key below and paste it into the extension.</li>
      </ol>
      {fresh ? (
        <div className="space-y-1 rounded-md bg-neutral-100 p-3 dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">your key (shown once; paste it into the extension now):</p>
          <p className="break-all font-mono text-sm">{fresh}</p>
          <button onClick={() => navigator.clipboard.writeText(fresh)} className={ghost}>copy</button>
        </div>
      ) : (
        <button disabled={busy} onClick={async () => { setBusy(true); const r = await post("/api/runner/token", { label: "chrome" }).catch(() => null); setFresh(r?.token ?? null); setBusy(false); router.refresh(); }} className={btn}>
          create extension key
        </button>
      )}
      {tokens.length ? (
        <ul className="space-y-1 text-sm">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2">
              <span className="text-neutral-600 dark:text-neutral-400">{t.label ?? "key"} · created {new Date(t.created_at).toLocaleDateString()} · {t.last_used_at ? `last used ${new Date(t.last_used_at).toLocaleString()}` : "not used yet"}</span>
              <button onClick={async () => { await post(`/api/runner/token?id=${t.id}`, undefined, "DELETE").catch(() => {}); router.refresh(); }} className="text-xs text-red-600">revoke</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
