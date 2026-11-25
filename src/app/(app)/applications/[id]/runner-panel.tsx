"use client";
import { TellAgents } from "./tell-agents";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Laptop, Mail, CircleCheck, Copy, ExternalLink, Eye, KeyRound, LoaderCircle, MonitorPlay, Moon, Pause, Play, Send, Sparkles, TriangleAlert, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { sentence as asSentence } from "@/components/ui/status";
import { LiveBrowser } from "@/components/runner/live-browser";
import { PortalProgress } from "@/components/runner/portal-progress";
import { askExtension, useExtension } from "@/components/runner/use-extension";
import type { Stage } from "@/lib/portal-progress";

type Login = { host: string; email: string; password: string; answers?: string[] };

// the cloud runner: finds the portal, creates the account, fills, uploads and submits. nothing to install.
// the applicant sees where it stands (a line of milestones and one sentence) and only what is theirs to do; the
// agents' own notes and retries are for the operator
export function RunnerPanel(props: {
  id: string;
  status: string;
  runnerStatus: string;
  note: string | null;
  portalUrl: string | null;
  signupUrl?: string | null;
  liveUrl: string | null;
  fee: number | null;
  attested: boolean;
  hasLogin: boolean;
  loginEmail?: string | null;
  missing: string[];
  reason?: string | null;
  mode?: string | null;
  school: string;
  paused?: boolean;
  questions?: string[];
  mailConnected?: boolean;
  pageSaid?: string[];
  told?: { id: string; text: string; via: string }[];
  stages: Stage[];
  sentence: string;
  ours: boolean;
  resting?: boolean;
  isAdmin?: boolean;
}) {
  const { id, status, runnerStatus, note, portalUrl, liveUrl, fee, attested, hasLogin, missing, reason = null, mode = "cloud", school, paused = false, questions = [], mailConnected = true, pageSaid = [], stages, ours, resting = false, isAdmin = false } = props;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const { ext, checked } = useExtension(runnerStatus === "running" || runnerStatus === "ready" ? 8000 : 0);
  const inChrome = mode === "extension";
  const [url, setUrl] = useState(portalUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState<Login | null>(null);
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
  async function reveal(): Promise<Login | null> {
    if (login) return login;
    const res = await fetch(`/api/applications/${id}/login`, { method: "POST" });
    if (res.ok) {
      const l = (await res.json()) as Login;
      setLogin(l);
      return l;
    }
    toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't load the login");
    return null;
  }
  const copy = (text: string, what: string) => navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied`), () => toast.error("Couldn't copy. Select it and copy instead"));

  if (status === "submitted") {
    return (
      <section className="space-y-3 rounded-3xl border border-go/25 bg-[color-mix(in_oklab,var(--go)_6%,var(--surface))] p-5 shadow-card text-sm">
        <p className="flex items-start gap-2">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-go" aria-hidden />
          <span>
            <span className="font-semibold">{runnerStatus === "submitted" ? "Submitted by your agents." : "Submitted."}</span>
            <span className="block text-muted">{props.sentence}</span>
          </span>
        </p>
        {hasLogin && <LoginCard login={login} reveal={reveal} copy={copy} />}
      </section>
    );
  }

  const working = runnerStatus === "ready" || runnerStatus === "running";
  const yours = runnerStatus === "needs_you" && !ours;
  const notStarted = runnerStatus === "idle" && !paused;
  const head = paused
    ? "Paused"
    : resting
      ? "Resting until tomorrow"
      : ours
        ? "Ivyward is on it"
        : yours
          ? "One step needs you"
          : working
            ? inChrome
              ? "Working in your Chrome"
              : "Working on the portal"
            : "Ready to submit";
  const Icon = paused ? Pause : resting ? Moon : ours ? Wrench : yours ? TriangleAlert : working ? LoaderCircle : Send;

  // the Gmail ask sits under the step that is actually blocking, unless the block is about an email or a code
  const mailFirst = !mailConnected && yours && (reason === "verification" || reason === "account");
  const gmailCard = mailConnected ? null : (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-signal/30 bg-[color-mix(in_oklab,var(--signal)_8%,var(--surface))] p-3">
      <Mail className="size-4 shrink-0 text-signal" aria-hidden />
      <p className="min-w-0 flex-1 basis-56 text-sm">
        <span className="font-semibold">Connect Gmail so the agents don&apos;t stop at your inbox.</span>{" "}
        <span className="text-muted">Portals email a code or link when the agents create your account or reset a password. Without Gmail, each one waits for you.</span>
      </p>
      <ButtonLink href={`/api/mail/connect?next=/applications/${id}`} size="sm" variant="accent">
        Connect Gmail
      </ButtonLink>
    </div>
  );
  const portalLink = (label = "the portal") => (
    <a href={portalUrl ?? "#"} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
      {label}
    </a>
  );
  const browserButtons = (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button variant={yours && !inChrome ? "signal" : "secondary"} disabled={busy} onClick={() => setLiveOpen(true)}>
        <MonitorPlay className="size-4" aria-hidden />
        {yours || ours ? "Open live browser" : "Watch live"}
      </Button>
      {!(inChrome && working) && (
        <Button variant={yours && (reason === "captcha" || reason === "blocked") ? "signal" : "secondary"} disabled={busy} onClick={runInChrome}>
          <Laptop className="size-4" aria-hidden />
          {inChrome && yours ? "Try again in my Chrome" : checked && !ext.paired ? "Add Ivyward to Chrome" : "Run in my Chrome"}
        </Button>
      )}
    </div>
  );

  return (
    <section className={`space-y-4 rounded-3xl border p-5 shadow-card sm:p-6 ${yours ? "border-signal/30 bg-[color-mix(in_oklab,var(--signal)_6%,var(--surface))]" : "border-line bg-surface"}`}>
      {mailFirst && gmailCard}
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${yours ? "bg-signal text-white" : "bg-accent/10 text-accent"}`}>
          <Icon className={`size-4 ${working && !ours && !resting ? "animate-spin" : ""}`} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-[-0.02em]">{head}</h2>
          <p className="mt-0.5 text-sm text-muted">{props.sentence}</p>
        </div>
        {(working || runnerStatus === "needs_you" || runnerStatus === "failed" || paused) && (
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

      {!notStarted && <PortalProgress stages={stages} />}

      {liveOpen && <LiveBrowser applicationId={id} school={school} onClose={() => (setLiveOpen(false), router.refresh())} />}

      {inChrome && working && checked && !ext.paired && (
        <p className="rounded-2xl border border-signal/25 bg-signal/[0.06] px-4 py-3 text-sm">
          This one runs in your Chrome, but the Ivyward extension isn&apos;t connected on this computer.{" "}
          <Link href={`/connect-chrome?then=${id}`} className="font-semibold underline underline-offset-4">
            Add Ivyward to Chrome
          </Link>{" "}
          or open the live browser instead.
        </p>
      )}

      {/* the one thing that is the applicant's to do, when there is one */}
      {yours && reason === "account" && (
        <AccountCard school={school} signupUrl={props.signupUrl ?? portalUrl} email={props.loginEmail ?? null} login={login} reveal={reveal} copy={copy} hasLogin={hasLogin} />
      )}
      {yours && (reason === "captcha" || reason === "blocked") && attested && browserButtons}
      {yours && liveUrl && reason !== "account" && (
        <ButtonLink href={liveUrl} external variant="secondary">
          Open the live view <ExternalLink className="size-4" aria-hidden />
        </ButtonLink>
      )}
      {yours && !liveUrl && !["account", "captcha", "blocked", "unpaid"].includes(reason ?? "") && (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed">
          <p className="mb-2 text-xs font-bold text-muted">What to do</p>
          {reason === "question" && questions.length > 0 ? (
            <>
              <p>The form asks {questions.length === 1 ? "something" : `${questions.length} things`} your profile doesn&apos;t answer yet. Each answer is saved to your profile, and the agents carry on by themselves.</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">
                {questions.slice(0, 6).map((q) => (
                  <li key={q} className="truncate">
                    {q}
                  </li>
                ))}
              </ul>
              <ButtonLink href="#questions" size="sm" className="mt-3">
                Answer them
              </ButtonLink>
            </>
          ) : reason === "missing" || reason === "question" ? (
            <>
              <p>Add the missing detail to your profile. The agents restart this application on their own as soon as you save.</p>
              <ButtonLink href="/profile?tab=details" size="sm" className="mt-3">
                Open form details
              </ButtonLink>
            </>
          ) : reason === "documents" ? (
            <>
              <p>{asSentence(note)}</p>
              <ButtonLink href="/documents" size="sm" className="mt-3">
                Open documents
              </ButtonLink>
            </>
          ) : reason === "payment" || reason === "verification" || reason === "login" ? (
            <p>
              Open {portalLink()}
              {hasLogin ? ", sign in with the login below" : ""} and do that one step. The agents check every 5 minutes and carry on.
              {reason === "login" && note ? <span className="mt-1 block text-muted">The portal said: {asSentence(note)}</span> : null}
            </p>
          ) : (
            // a review hold, a closed intake: what the agents found is the applicant's to read
            <p>{asSentence(note)}</p>
          )}
        </div>
      )}
      {yours && pageSaid.length > 0 && (reason === "login" || reason === "review") && (
        <p className="text-sm">
          <span className="text-muted">The portal said: </span>
          {pageSaid.slice(0, 2).join(" ")}
        </p>
      )}

      {working && !ours && attested && !inChrome && (
        <button type="button" onClick={() => setLiveOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
          <MonitorPlay className="size-3.5" aria-hidden />
          Watch the agents live
        </button>
      )}

      {ours && !isAdmin && attested && (
        <details className="rounded-2xl border border-line bg-surface p-4 text-sm">
          <summary className="cursor-pointer select-none font-medium">Prefer to finish this step yourself?</summary>
          <p className="mt-2 text-muted">You don&apos;t have to. If you&apos;d like to, open the portal in the live browser or your own Chrome, move past the page, and the agents carry on from there.</p>
          <div className="mt-3">{browserButtons}</div>
        </details>
      )}

      {hasLogin && reason !== "account" && <LoginCard login={login} reveal={reveal} copy={copy} />}

      {missing.length > 0 && !ours && (
        <p className="rounded-2xl border border-signal/25 bg-signal/[0.06] px-4 py-3 text-sm">
          Portals will ask for things your profile doesn&apos;t have yet: {missing.join(", ")}.{" "}
          <Link href="/profile?tab=details" className="font-medium underline underline-offset-4">
            Add them to your profile
          </Link>
        </p>
      )}

      {/* starting, resuming, or telling the agents a step is done */}
      {notStarted ? (
        <div className="space-y-2">
          <label htmlFor="portal-link" className="block text-[13px] font-medium leading-snug text-muted">
            Portal link <span className="font-normal">(optional: the agents find and check it themselves)</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="portal-link" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://apply.school.edu" />
            <Button disabled={busy || !attested} onClick={() => (inChrome ? runInChrome() : act("queue"))} title={attested ? "" : "Sign the packet first"}>
              <Send className="size-4" aria-hidden />
              Submit it for me
            </Button>
          </div>
        </div>
      ) : paused ? (
        <Button disabled={busy || !attested} onClick={() => act("resume")}>
          <Play className="size-4" aria-hidden />
          Resume
        </Button>
      ) : yours && !["question", "missing", "unpaid", "closed"].includes(reason ?? "") ? (
        <Button variant="secondary" disabled={busy || !attested} onClick={() => (inChrome ? runInChrome() : act("queue"))}>
          <Sparkles className="size-4" aria-hidden />
          {reason === "review" ? "I've checked it, carry on" : "I've done it, carry on"}
        </Button>
      ) : null}

      <TellAgents id={id} initial={props.told ?? []} />

      {!mailFirst && !ours && gmailCard}

      {isAdmin && (
        <details className="rounded-2xl border border-dashed border-line p-4 text-sm">
          <summary className="cursor-pointer select-none font-medium">Operator: agent notes and retry</summary>
          <dl className="mt-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
            <dt className="text-muted">Runner</dt>
            <dd>
              {runnerStatus}
              {reason ? ` (${reason})` : ""}
              {mode === "extension" ? ", in Chrome" : ""}
            </dd>
            <dt className="text-muted">Note</dt>
            <dd className="break-words">{note ?? "none"}</dd>
            {pageSaid.length > 0 && (
              <>
                <dt className="text-muted">Page said</dt>
                <dd className="break-words">{pageSaid.slice(0, 4).join(" | ")}</dd>
              </>
            )}
          </dl>
          <div className="mt-3 space-y-2">
            {attested && browserButtons}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label="Portal link" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://apply.school.edu" />
              <Button variant="secondary" disabled={busy || !attested} onClick={() => (inChrome && runnerStatus !== "idle" ? runInChrome() : act("queue"))}>
                <Send className="size-4" aria-hidden />
                Try again
              </Button>
            </div>
          </div>
        </details>
      )}

      <details className="text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-foreground">What the agents do here</summary>
        <p className="mt-2 leading-relaxed">
          They find the portal and check it&apos;s the real one, create your account with your email, fill each section from your profile, upload your approved essays and documents, tick the certification with the statement you signed
          {attested ? "" : " (sign the packet first)"}, and submit. You&apos;re only asked when a portal shows a bot check, wants the {fee ? `$${fee} ` : ""}fee paid, or asks something your profile doesn&apos;t answer. Anything else that goes wrong on a portal is ours to fix.
        </p>
      </details>
    </section>
  );
}

// the portal account the applicant creates themselves: where, and exactly which email and password, with copy buttons
function AccountCard({ school, signupUrl, email, login, reveal, copy, hasLogin }: { school: string; signupUrl: string | null; email: string | null; login: Login | null; reveal: () => Promise<Login | null>; copy: (t: string, what: string) => void; hasLogin: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <KeyRound className="size-4" aria-hidden />
        Create your {school} account
      </p>
      <ol className="mt-3 space-y-3">
        <li className="flex flex-wrap items-center justify-between gap-2">
          <span>1. Open the sign-up page</span>
          {signupUrl ? (
            <ButtonLink href={signupUrl} external size="sm" variant="secondary">
              Open {school}&apos;s portal <ExternalLink className="size-3.5" aria-hidden />
            </ButtonLink>
          ) : null}
        </li>
        <li>
          <span className="block">2. Use this email</span>
          {/* the email isn't a secret: shown as it is */}
          <CopyRow value={login?.email ?? email} hidden={!login && !email} onShow={reveal} onCopy={(v) => copy(v, "Email")} label="email" disabled={!hasLogin} />
        </li>
        <li>
          <span className="block">3. And this password</span>
          <CopyRow value={login?.password ?? null} hidden={!login} onShow={reveal} onCopy={(v) => copy(v, "Password")} label="password" mono disabled={!hasLogin} />
        </li>
      </ol>
      <p className="mt-3 text-xs text-muted">Use exactly these. Once the account exists, the agents sign in with them and finish the application, usually within 5 minutes. Already made one with a different password? Change it on the portal to this one.</p>
    </div>
  );
}

function CopyRow({ value, hidden, onShow, onCopy, label, mono = false, disabled = false }: { value: string | null; hidden: boolean; onShow: () => Promise<Login | null>; onCopy: (v: string) => void; label: string; mono?: boolean; disabled?: boolean }) {
  if (disabled) return <span className="mt-1 block text-xs text-muted">Shown here once the agents have made it. Refresh in a minute.</span>;
  return (
    <span className="mt-1 flex items-center gap-2">
      <code className={`min-w-0 flex-1 truncate rounded-lg bg-neutral-100 px-2 py-1.5 dark:bg-neutral-800 ${mono ? "" : "font-sans"}`}>{hidden ? "••••••••••" : value}</code>
      {hidden ? (
        <button type="button" onClick={() => void onShow()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <Eye className="size-3.5" aria-hidden />
          Show
        </button>
      ) : null}
      <button
        type="button"
        onClick={async () => {
          const v = value ?? (label === "email" ? (await onShow())?.email : (await onShow())?.password);
          if (v) onCopy(v);
        }}
        className="rounded-lg p-1.5 text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
        aria-label={`Copy ${label}`}
      >
        <Copy className="size-3.5" />
      </button>
    </span>
  );
}

function LoginCard({ login, reveal, copy }: { login: Login | null; reveal: () => Promise<Login | null>; copy: (t: string, what: string) => void }) {
  return (
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
          <dd className="flex items-center gap-2">
            <span className="truncate">{login.email}</span>
            <button onClick={() => copy(login.email, "Email")} className="rounded p-1 text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800" aria-label="Copy email">
              <Copy className="size-3.5" />
            </button>
          </dd>
          <dt className="text-muted">Password</dt>
          <dd className="flex items-center gap-2">
            <code className="truncate rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{login.password}</code>
            <button onClick={() => copy(login.password, "Password")} className="rounded p-1 text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800" aria-label="Copy password">
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
            <Link href="/logins" className="mr-1 font-semibold text-brand hover:underline">
              All portal logins.
            </Link>
            The agents made this account for you. Change the password on the portal once you&apos;ve submitted, if you like.
          </dd>
        </dl>
      ) : (
        <button onClick={() => void reveal()} className="mt-2 inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
          <Eye className="size-3.5" aria-hidden />
          Show the email and password
        </button>
      )}
    </div>
  );
}
