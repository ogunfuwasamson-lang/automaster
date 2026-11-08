"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Laptop, Mail, CircleCheck, Copy, ExternalLink, Eye, KeyRound, LoaderCircle, MonitorPlay, Pause, Play, Send, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { sentence } from "@/components/ui/status";
import { LiveBrowser } from "@/components/runner/live-browser";
import { askExtension, useExtension } from "@/components/runner/use-extension";

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
  reason?: string | null;
  mode?: string | null;
  school: string;
  paused?: boolean;
  questions?: string[];
  mailConnected?: boolean;
}) {
  const { id, status, runnerStatus, note, portalUrl, liveUrl, fee, attested, hasLogin, missing, reason = null, mode = "cloud", school, paused = false, questions = [], mailConnected = true } = props;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const { ext, checked } = useExtension(runnerStatus === "running" || runnerStatus === "ready" ? 8000 : 0);
  const inChrome = mode === "extension";
  const [url, setUrl] = useState(portalUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState<{ host: string; email: string; password: string; answers?: string[] } | null>(null);
  const router = useRouter();

  // hand this application to the applicant's own chrome
  async function runInChrome() {
    if (!ext.installed || !ext.paired) {
      router.push(`/connect-chrome?then=${id}`);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/applications/${id}/runner`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "chrome" }) });
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't do that");
    else {
      const r = await askExtension<{ ok?: boolean; error?: string }>("run", { id });
      if (r && r.ok === false) toast.message(r.error ?? "Chrome will pick it up shortly");
      else toast.success("Running in your Chrome. A tab opens in the background");
    }
    setBusy(false);
    router.refresh();
  }

  async function act(action: "queue" | "pause" | "resume" | "cancel") {
    setBusy(true);
    const res = await fetch(`/api/applications/${id}/runner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...(action === "queue" && url && url !== portalUrl ? { portal_url: url } : {}) }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(j.error ?? "Couldn't do that");
    else {
      toast.success({ queue: "The agents are on it", pause: "Paused. Nothing happens until you resume", resume: "Resuming where it stopped", cancel: "Cancelled. The agents have stopped" }[action]);
      // a chrome job: tell the extension to pick it up now
      if (action === "resume" && j.mode === "extension") await askExtension("run", { id });
    }
    setConfirmCancel(false);
    setBusy(false);
    router.refresh();
  }
  async function reveal() {
    const res = await fetch(`/api/applications/${id}/login`, { method: "POST" });
    if (res.ok) setLogin(await res.json());
    else toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't load the login");
  }

  const loginCard = hasLogin ? (
    <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
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
          {login.answers?.length ? (
            <>
              <dt className="text-muted">Security answers</dt>
              <dd className="text-xs text-muted">
                If the portal asked security questions, the agents answered them in order with <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">{login.answers.join(", ")}</code>. They&apos;re made up, not about you.
              </dd>
            </>
          ) : null}
          <dd className="col-span-2 pt-1 text-xs text-muted">
            <Link href="/logins" className="mr-1 font-semibold text-brand hover:underline">All portal logins.</Link>The agents made this account for you. Change the password on the portal once you&apos;ve submitted, if you like.</dd>
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
      <section className="space-y-3 rounded-3xl border border-go/25 bg-[color-mix(in_oklab,var(--go)_6%,var(--surface))] p-5 shadow-card text-sm">
        <p className="flex items-start gap-2">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-go" aria-hidden />
          <span>
            <span className="font-semibold">{runnerStatus === "submitted" ? "Submitted by your agents." : "Submitted."}</span>
            {note ? <span className="block text-muted">{sentence(note)}</span> : null}
          </span>
        </p>
        {loginCard}
      </section>
    );
  }

  const stuck = runnerStatus === "needs_you" || runnerStatus === "failed";
  const blocked = reason === "captcha" || reason === "blocked" || reason === "account";
  const fixInProfile = reason === "question" || reason === "missing" || /in profile|your profile|add your|upload it/i.test(note ?? "");
  const working = runnerStatus === "ready" || runnerStatus === "running";
  const head = {
    idle: paused ? "Paused" : "Ready to submit",
    ready: inChrome ? "Queued for your Chrome" : "Starting: finding the portal",
    running: inChrome ? "Working in your Chrome" : "Working on the portal now",
    needs_you: "One step needs you",
    failed: "Submission hit a problem",
    submitted: "Submitted",
  }[runnerStatus] ?? runnerStatus;

  return (
    <section className={`space-y-4 rounded-3xl border p-5 shadow-card sm:p-6 ${stuck ? "border-signal/30 bg-[color-mix(in_oklab,var(--signal)_6%,var(--surface))]" : "border-line bg-surface"}`}>
      {!mailConnected && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-signal/30 bg-[color-mix(in_oklab,var(--signal)_8%,var(--surface))] p-3">
          <Mail className="size-4 shrink-0 text-signal" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Connect Gmail so the agents don&apos;t stop at your inbox.</span>{" "}
            <span className="text-muted">Portals email a code or link when the agents create your account or reset a password. Without Gmail, each one waits for you.</span>
          </p>
          <ButtonLink href={`/api/mail/connect?next=/applications/${id}`} size="sm" variant="accent">
            Connect Gmail
          </ButtonLink>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${stuck ? "bg-signal text-white" : "bg-accent/10 text-accent"}`}>
          {working ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : stuck ? <TriangleAlert className="size-4" aria-hidden /> : paused ? <Pause className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-[-0.02em]">{head}</h2>
          {paused ? (
            <p className="mt-0.5 text-sm text-muted">The agents have stopped and kept their place. Resume carries on from the same page.</p>
          ) : note && !(runnerStatus === "idle" && /cancelled by you|stopped by you/.test(note)) ? (
            <p className="mt-0.5 text-sm text-muted">{sentence(note)}</p>
          ) : null}
        </div>
        {(working || stuck || paused) && (
          <div className="flex shrink-0 gap-1.5">
            {!paused && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => act("pause")} aria-label="Pause">
                <Pause className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Pause</span>
              </Button>
            )}
            <Button
              size="sm"
              variant={confirmCancel ? "danger" : "ghost"}
              disabled={busy}
              onClick={() => {
                if (confirmCancel) return act("cancel");
                setConfirmCancel(true);
                setTimeout(() => setConfirmCancel(false), 5000);
              }}
              aria-label={confirmCancel ? "Confirm cancel" : "Cancel"}
            >
              <X className="size-3.5" aria-hidden />
              <span className={confirmCancel ? "" : "hidden sm:inline"}>{confirmCancel ? "Cancel submission?" : "Cancel"}</span>
            </Button>
          </div>
        )}
      </div>
      {confirmCancel && <p className="-mt-2 text-xs text-muted">Cancelling stops the agents and clears their progress on the portal. Any portal account they made stays in Portal logins. Tap again to confirm.</p>}

      {liveOpen && <LiveBrowser applicationId={id} school={school} onClose={() => (setLiveOpen(false), router.refresh())} />}

      {inChrome && (runnerStatus === "ready" || runnerStatus === "running") && checked && !ext.paired && (
        <p className="rounded-2xl border border-signal/25 bg-signal/[0.06] px-4 py-3 text-sm">
          This one runs in your Chrome, but Chrome isn&apos;t connected on this computer.{" "}
          <Link href={`/connect-chrome?then=${id}`} className="font-semibold underline underline-offset-4">
            Connect Chrome
          </Link>{" "}
          or open the live browser instead.
        </p>
      )}

      {(stuck || working) && attested && !fixInProfile && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant={stuck && !inChrome ? "signal" : "secondary"} disabled={busy} onClick={() => setLiveOpen(true)}>
            <MonitorPlay className="size-4" aria-hidden />
            {stuck ? "Open live browser" : "Watch live"}
          </Button>
          {!(inChrome && working) && (
            <Button variant={stuck && blocked ? "signal" : "secondary"} disabled={busy} onClick={runInChrome}>
              <Laptop className="size-4" aria-hidden />
              {inChrome && stuck ? "Try again in my Chrome" : "Run in my Chrome"}
            </Button>
          )}
        </div>
      )}

      {runnerStatus === "needs_you" && liveUrl && (
        <ButtonLink href={liveUrl} external variant="secondary">
          Open the live view <ExternalLink className="size-4" aria-hidden />
        </ButtonLink>
      )}
      {runnerStatus === "needs_you" && !liveUrl && !(reason === "captcha" || reason === "blocked") && (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed">
          <p className="mb-2 text-xs font-bold text-muted">What to do</p>
          {reason === "question" && questions.length > 0 ? (
            <>
              <p>
                The form asks {questions.length === 1 ? "something" : `${questions.length} things`} your profile doesn&apos;t answer yet. Ivyward AI asks you; each answer is saved to your profile, and the agents carry on by themselves.
              </p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">
                {questions.slice(0, 6).map((q) => (
                  <li key={q} className="truncate">
                    {q}
                  </li>
                ))}
              </ul>
              <ButtonLink href="?chat=open" size="sm" className="mt-3">
                Answer with Ivyward AI
              </ButtonLink>
            </>
          ) : fixInProfile ? (
            <>
              <p>Add the missing detail to your profile. The agents restart this application on their own as soon as you save; you don&apos;t need to press anything else.</p>
              <ButtonLink href="/profile?tab=details" size="sm" className="mt-3">
                Open form details
              </ButtonLink>
            </>
          ) : reason === "account" ? (
            <p>
              Quickest: choose Run in my Chrome and the agents create the account there. Or create it yourself on{" "}
              <a href={portalUrl ?? "#"} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
                the portal
              </a>{" "}
              with the email and password below, exactly as shown. The agents check every 5 minutes, sign in with them and finish the application.
            </p>
          ) : reason === "payment" || reason === "verification" || reason === "login" ? (
            <p>
              Open{" "}
              <a href={portalUrl ?? "#"} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
                the portal
              </a>
              {hasLogin ? ", sign in with the login below" : ""} and do that one step. The agents check every 5 minutes and carry on.
            </p>
          ) : (
            <p>
              Choose Try again first: the agents look at the page fresh. If it stops at the same place, open{" "}
              <a href={portalUrl ?? "#"} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
                the portal
              </a>
              {hasLogin ? " with the login below" : ""}, move past that page, then choose Try again.
            </p>
          )}
        </div>
      )}
      {loginCard}

      {missing.length > 0 && (
        <p className="rounded-2xl border border-signal/25 bg-signal/[0.06] px-4 py-3 text-sm">
          Portals will ask for things your profile doesn&apos;t have yet: {missing.join(", ")}.{" "}
          <Link href="/profile?tab=details" className="font-medium underline underline-offset-4">
            Add them to your profile
          </Link>
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Portal link (optional, the agents find it)" aria-label="Portal link" />
        {working ? null : paused ? (
          <Button disabled={busy || !attested} onClick={() => act("resume")}>
            <Play className="size-4" aria-hidden />
            Resume
          </Button>
        ) : (
          <Button disabled={busy || !attested} onClick={() => (inChrome && runnerStatus !== "idle" ? runInChrome() : act("queue"))} title={attested ? "" : "Sign the packet first"}>
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
