"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS: Record<string, string> = {
  idle: "not started",
  ready: "starting: finding the portal",
  running: "working on the portal now",
  needs_you: "needs you",
  submitted: "submitted",
  failed: "hit a problem",
};

// the cloud runner: finds the portal, creates your account, fills, uploads and submits. nothing to install.
export function RunnerPanel(props: {
  id: string;
  status: string;
  runnerStatus: string;
  note: string | null;
  portalUrl: string | null;
  liveUrl: string | null;
  fee: number | null;
  attested: boolean;
  hasLogin: boolean;
  missing: string[];
}) {
  const { id, status, runnerStatus, note, portalUrl, liveUrl, fee, attested, hasLogin, missing } = props;
  const [url, setUrl] = useState(portalUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [login, setLogin] = useState<{ host: string; email: string; password: string } | null>(null);
  const router = useRouter();

  async function act(action: "queue" | "stop") {
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/applications/${id}/runner`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...(action === "queue" && url && url !== portalUrl ? { portal_url: url } : {}) }) });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
    setBusy(false);
    router.refresh();
  }
  async function reveal() {
    const res = await fetch(`/api/applications/${id}/login`, { method: "POST" });
    if (res.ok) setLogin(await res.json());
    else setErr((await res.json().catch(() => ({}))).error ?? "failed");
  }

  const loginCard = hasLogin ? (
    <div className="space-y-1 rounded-md bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
      <p className="font-medium">your portal login</p>
      {login ? (
        <>
          <p>
            <span className="text-neutral-500">site</span> {login.host} · <span className="text-neutral-500">email</span> {login.email}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-neutral-500">password</span> <span className="font-mono">{login.password}</span>
            <button onClick={() => navigator.clipboard.writeText(login.password)} className="rounded border border-neutral-300 px-1.5 text-xs dark:border-neutral-700">copy</button>
          </p>
          <p className="text-xs text-neutral-500">the agents created this account for you. change the password on the portal after you&apos;ve submitted if you like.</p>
        </>
      ) : (
        <button onClick={reveal} className="text-sm underline">show the email and password the agents used</button>
      )}
    </div>
  ) : null;

  if (status === "submitted") {
    return (
      <section className="space-y-3 rounded-md border border-emerald-300 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
        <p>{runnerStatus === "submitted" ? `submitted by the agents${note ? `: ${note}` : ""}.` : "submitted."}</p>
        {loginCard}
      </section>
    );
  }

  const tone = runnerStatus === "needs_you" || runnerStatus === "failed" ? "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30" : "border-neutral-200 dark:border-neutral-800";
  const working = runnerStatus === "ready" || runnerStatus === "running";
  return (
    <section className={`space-y-3 rounded-md border p-4 ${tone}`}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">submission</h2>
      <p className="text-sm">
        <span className="font-medium">{STATUS[runnerStatus] ?? runnerStatus}</span>
        {note ? <span className="text-neutral-600 dark:text-neutral-400"> · {note}</span> : null}
      </p>
      {runnerStatus === "needs_you" && liveUrl && (
        <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-block rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900">open the live view</a>
      )}
      {runnerStatus === "needs_you" && !liveUrl && portalUrl && (
        <p className="text-sm">
          open <a href={portalUrl} target="_blank" rel="noreferrer" className="underline">the portal</a>, sign in with the login below, do that one step, and the agents carry on within 10 minutes.
        </p>
      )}
      {loginCard}
      <p className="text-xs text-neutral-500">
        the agents find the portal, create your account with your email, fill every section from your profile, upload your approved essays and documents, tick the certification with the statement you signed{attested ? "" : " (sign the packet first)"}, and submit.
        you&apos;re only asked if a portal shows a bot check{fee ? `, for the $${fee} fee` : ", for a fee"}, or for a question your profile doesn&apos;t answer.
      </p>
      {missing.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          portals will ask for things your profile doesn&apos;t have yet: {missing.join(", ")}. add them under <a href="/profile" className="underline">profile → details for application forms</a>.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="portal link (optional: the agents find it)" className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700" />
        {working ? (
          <button disabled={busy} onClick={() => act("stop")} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">stop</button>
        ) : (
          <button disabled={busy} onClick={() => act("queue")} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900">
            {runnerStatus === "idle" ? "submit it for me" : "try again"}
          </button>
        )}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </section>
  );
}
