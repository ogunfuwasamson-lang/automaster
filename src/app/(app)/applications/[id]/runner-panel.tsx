"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleCheck, Copy, ExternalLink, Eye, KeyRound, LoaderCircle, Send, Square, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

// the cloud runner: finds the portal, creates the account, fills, uploads and submits. nothing to install.
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
  const [login, setLogin] = useState<{ host: string; email: string; password: string } | null>(null);
  const router = useRouter();

  async function act(action: "queue" | "stop") {
    setBusy(true);
    const res = await fetch(`/api/applications/${id}/runner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...(action === "queue" && url && url !== portalUrl ? { portal_url: url } : {}) }),
    });
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't do that");
    else toast.success(action === "stop" ? "Stopped" : "The agents are on it");
    setBusy(false);
    router.refresh();
  }
  async function reveal() {
    const res = await fetch(`/api/applications/${id}/login`, { method: "POST" });
    if (res.ok) setLogin(await res.json());
    else toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't load the login");
  }

  const loginCard = hasLogin ? (
    <div className="rounded-lg border border-line bg-background p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <KeyRound className="size-4" aria-hidden />
        Your portal login
      </p>
      {login ? (
        <dl className="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          <dt className="text-muted">Site</dt>
          <dd className="truncate">{login.host}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="truncate">{login.email}</dd>
          <dt className="text-muted">Password</dt>
          <dd className="flex items-center gap-2">
            <code className="truncate rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{login.password}</code>
            <button
              onClick={() => navigator.clipboard.writeText(login.password).then(() => toast.success("Password copied"))}
              className="rounded p-1 text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
              aria-label="Copy password"
            >
              <Copy className="size-3.5" />
            </button>
          </dd>
          <dd className="col-span-2 pt-1 text-xs text-muted">The agents made this account for you. Change the password on the portal once you&apos;ve submitted, if you like.</dd>
        </dl>
      ) : (
        <button onClick={reveal} className="mt-2 inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
          <Eye className="size-3.5" aria-hidden />
          Show the email and password
        </button>
      )}
    </div>
  ) : null;

  if (status === "submitted") {
    return (
      <section className="space-y-3 rounded-xl border border-go/40 bg-go/8 p-5 text-sm">
        <p className="flex items-start gap-2">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-go" aria-hidden />
          <span>
            <span className="font-semibold">{runnerStatus === "submitted" ? "Submitted by your agents." : "Submitted."}</span>
            {note ? <span className="block text-muted">{note}</span> : null}
          </span>
        </p>
        {loginCard}
      </section>
    );
  }

  const stuck = runnerStatus === "needs_you" || runnerStatus === "failed";
  const working = runnerStatus === "ready" || runnerStatus === "running";
  const head = {
    idle: "Ready to submit",
    ready: "Starting: finding the portal",
    running: "Working on the portal now",
    needs_you: "One step needs you",
    failed: "Submission hit a problem",
    submitted: "Submitted",
  }[runnerStatus] ?? runnerStatus;

  return (
    <section className={`space-y-4 rounded-xl border p-5 ${stuck ? "border-signal bg-signal/10" : "border-line bg-surface"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${stuck ? "bg-signal text-neutral-950" : "bg-neutral-100 dark:bg-neutral-800"}`}>
          {working ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : stuck ? <TriangleAlert className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">{head}</h2>
          {note ? <p className="mt-0.5 text-sm text-muted">{note}</p> : null}
        </div>
      </div>

      {runnerStatus === "needs_you" && liveUrl && (
        <ButtonLink href={liveUrl} external variant="signal">
          Open the live view <ExternalLink className="size-4" aria-hidden />
        </ButtonLink>
      )}
      {runnerStatus === "needs_you" && !liveUrl && portalUrl && (
        <p className="text-sm">
          Open{" "}
          <a href={portalUrl} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
            the portal
          </a>
          , sign in with the login below and do that one step. The agents carry on within 10 minutes.
        </p>
      )}
      {loginCard}

      {missing.length > 0 && (
        <p className="rounded-lg border border-signal/60 bg-signal/10 px-3.5 py-2.5 text-sm">
          Portals will ask for things your profile doesn&apos;t have yet: {missing.join(", ")}.{" "}
          <Link href="/profile#details" className="font-medium underline underline-offset-4">
            Add them to your profile
          </Link>
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Portal link (optional, the agents find it)" aria-label="Portal link" />
        {working ? (
          <Button variant="secondary" disabled={busy} onClick={() => act("stop")}>
            <Square className="size-3.5" aria-hidden />
            Stop
          </Button>
        ) : (
          <Button disabled={busy || !attested} onClick={() => act("queue")} title={attested ? "" : "Sign the packet first"}>
            <Send className="size-4" aria-hidden />
            {runnerStatus === "idle" ? "Submit it for me" : "Try again"}
          </Button>
        )}
      </div>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-foreground">What the agents do here</summary>
        <p className="mt-2 leading-relaxed">
          They find the portal, create your account with your email, fill each section from your profile, upload your approved essays and documents, tick the certification with the statement you signed
          {attested ? "" : " (sign the packet first)"}, and submit. You&apos;re only asked when a portal shows a bot check, wants the {fee ? `$${fee} ` : ""}fee paid, or asks something your profile doesn&apos;t answer.
        </p>
      </details>
    </section>
  );
}
