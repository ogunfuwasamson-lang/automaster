"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Copy, Mail, Puzzle, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { CAPABILITY_LABEL, MODE_LABEL, USER_SETTABLE } from "@/lib/dial";
import type { GrantMode } from "@/lib/policy";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

async function post(url: string, body?: Record<string, unknown>, method = "POST") {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json;
}

export function Dial({ grants }: { grants: { capability: string; mode: GrantMode; undo_seconds: number }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const order = Object.keys(CAPABILITY_LABEL);
  const sorted = [...grants].sort((a, b) => order.indexOf(a.capability) - order.indexOf(b.capability));
  return (
    <ul className="divide-y divide-line">
      {sorted.map((g) => {
        const label = CAPABILITY_LABEL[g.capability] ?? { name: g.capability, help: "" };
        const options = USER_SETTABLE[g.capability];
        return (
          <li key={g.capability} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">{label.name}</p>
              <p className="text-xs text-muted">{label.help}</p>
            </div>
            {options ? (
              <Select
                value={g.mode}
                disabled={busy === g.capability}
                aria-label={label.name}
                className="sm:w-52"
                onChange={async (e) => {
                  setBusy(g.capability);
                  try {
                    await post("/api/controls", { action: "set_grant", capability: g.capability, mode: e.target.value });
                    toast.success(`${label.name}: ${MODE_LABEL[e.target.value as GrantMode].toLowerCase()}`);
                  } catch (x) {
                    toast.error(x instanceof Error ? x.message : "Couldn't change it");
                  }
                  setBusy(null);
                  router.refresh();
                }}
              >
                {options.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                    {m === "auto_undo" && g.undo_seconds ? ` (${g.undo_seconds / 60} min)` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-sm text-muted">Always asks you</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function FeeEnvelope({ usd }: { usd: number }) {
  const [v, setV] = useState(String(usd));
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await post("/api/controls", { action: "set_fee_envelope", usd: Number(v || 0) });
          toast.success("Fee limit saved");
        } catch (x) {
          toast.error(x instanceof Error ? x.message : "Couldn't save");
        }
        setSaving(false);
        router.refresh();
      }}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Agents may pay up to</span>
        <span className="flex h-10 items-center rounded-lg border border-line bg-surface px-3 focus-within:border-focus">
          <span className="text-muted">$</span>
          <input inputMode="numeric" aria-label="Fee limit in dollars" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} className="w-16 bg-transparent pl-1 outline-none tabular" />
        </span>
        <span>in fees in total without asking.</span>
        <Button type="submit" variant="secondary" disabled={saving || Number(v || 0) === usd}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted">With $0, the agents stop at every payment page and ask you to pay.</p>
    </form>
  );
}

export function DigestToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">Morning digest at 7am</span>
        <span className="block text-xs text-muted">On your home page, and in your inbox when Gmail is connected</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={async () => {
          const next = !on;
          setOn(next);
          try {
            await post("/api/controls", { action: "set_digest", enabled: next });
            toast.success(next ? "Digest on" : "Digest off");
          } catch {
            setOn(!next);
            toast.error("Couldn't change it");
          }
        }}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-neutral-300 dark:bg-neutral-700"}`}
      >
        <span className={`absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export function MailCard({ available, email, status, error, notice }: { available: boolean; email: string | null; status: string | null; error: string | null; notice: string | null }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const NOTICE: Record<string, [string, "go" | "stop"]> = {
    connected: ["Gmail connected. Approved emails send from your address, and replies from schools appear on your home page.", "go"],
    declined: ["You cancelled on Google's screen, so nothing was connected.", "stop"],
    scope: ["Google didn't grant the Gmail permissions. Try again and tick each Gmail box.", "stop"],
    expired: ["That link expired. Try again.", "stop"],
    error: ["Couldn't connect Gmail. Try again.", "stop"],
    unavailable: ["Gmail isn't switched on for this app yet.", "stop"],
  };
  const n = notice ? NOTICE[notice] : null;
  return (
    <div className="space-y-4">
      {n && <p className={`rounded-lg border px-3.5 py-2.5 text-sm ${n[1] === "go" ? "border-go/40 bg-go/8" : "border-stop/40 bg-stop/8"}`}>{n[0]}</p>}
      {!available ? (
        <p className="text-sm text-muted">Sending from the app isn&apos;t switched on yet. Until then, drafts open in your own email app.</p>
      ) : email ? (
        <>
          <div className="flex items-center gap-3">
            <span className={`grid size-10 place-items-center rounded-full ${status === "active" ? "bg-go/10 text-go" : "bg-stop/10 text-stop"}`}>
              {status === "active" ? <CircleCheck className="size-5" aria-hidden /> : <TriangleAlert className="size-5" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{email}</span>
              <span className={`block text-xs ${status === "active" ? "text-muted" : "text-stop"}`}>{status === "active" ? "Connected" : error ?? "Needs reconnecting"}</span>
            </span>
          </div>
          <p className="text-sm text-muted">
            The agents send approved emails as you, read the codes portals send when they create your accounts, and sort replies from your schools. They never delete or change anything in your inbox.
          </p>
          <div className="flex gap-2">
            {status !== "active" && <ButtonLink href="/api/mail/connect">Reconnect Gmail</ButtonLink>}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await post("/api/mail/disconnect").catch(() => {});
                toast.success("Gmail disconnected");
                setBusy(false);
                router.refresh();
              }}
            >
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            Connect Gmail so approved emails go out from your own address, the agents can read the codes portals send when they create your accounts, and replies from your schools land on your home page.
          </p>
          <p className="text-xs text-muted">They never delete or change anything in your inbox.</p>
          <ButtonLink href="/api/mail/connect" variant="signal">
            <Mail className="size-4" aria-hidden /> Connect Gmail
          </ButtonLink>
        </>
      )}
    </div>
  );
}

export function RunnerCard({ tokens }: { tokens: { id: string; label: string | null; created_at: string; last_used_at: string | null }[] }) {
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <details className="group rounded-3xl border border-line bg-surface shadow-card">
      <summary className="flex cursor-pointer select-none items-center gap-3 px-5 py-4">
        <Puzzle className="size-4 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Browser extension (optional)</span>
          <span className="block text-xs text-muted">Only for portals that block our servers</span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-line px-5 py-4 text-sm">
        <p>You don&apos;t need this: the agents submit from our servers. The extension lets the same work run in your own Chrome for the few portals that refuse servers.</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-muted">
          <li>
            <a href="/automaster-runner.zip" className="font-medium text-foreground underline underline-offset-4">
              Download the extension
            </a>{" "}
            and unzip it.
          </li>
          <li>
            In Chrome, open <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">chrome://extensions</code>, turn on Developer mode, choose Load unpacked and pick the unzipped folder.
          </li>
          <li>Create a key below and paste it into the extension.</li>
        </ol>
        {fresh ? (
          <div className="space-y-2 rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
            <p className="text-xs text-muted">Your key. It&apos;s shown once, so paste it into the extension now.</p>
            <p className="break-all font-mono text-sm">{fresh}</p>
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(fresh).then(() => toast.success("Key copied"))}>
              <Copy className="size-3.5" aria-hidden /> Copy
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await post("/api/runner/token", { label: "chrome" }).catch(() => null);
              if (!r) toast.error("Couldn't create a key");
              setFresh(r?.token ?? null);
              setBusy(false);
              router.refresh();
            }}
          >
            Create extension key
          </Button>
        )}
        {tokens.length ? (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-muted">
                  {t.label ?? "Key"}, created {new Date(t.created_at).toLocaleDateString()}. {t.last_used_at ? `Last used ${new Date(t.last_used_at).toLocaleString()}` : "Not used yet"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-stop"
                  onClick={async () => {
                    await post(`/api/runner/token?id=${t.id}`, undefined, "DELETE").catch(() => {});
                    toast.success("Key revoked");
                    router.refresh();
                  }}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
