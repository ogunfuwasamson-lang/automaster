"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, Copy, Download, LoaderCircle, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { askExtension, useExtension } from "@/components/runner/use-extension";
import { EXTENSION_VERSION, olderThan } from "@/lib/extension";

// one-time setup: install the runner extension, then connect it to this account with one click
export function ConnectChrome({ then, store = null }: { then: { id: string; school: string } | null; store?: string | null }) {
  const { ext, checked, refresh } = useExtension(2500);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function connect() {
    setBusy(true);
    const r = await fetch("/api/runner/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label: "chrome" }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.token) {
      toast.error(j.error ?? "Couldn't connect");
      setBusy(false);
      return;
    }
    const res = await askExtension<{ ok?: boolean; error?: string }>("pair", { token: j.token }, 5000, "paired");
    if (!res || res.ok === false) {
      toast.error(res?.error ?? "Chrome didn't answer. Reload this page and try again");
      setBusy(false);
      return;
    }
    await refresh();
    toast.success("Chrome is connected");
    if (then) {
      await fetch(`/api/applications/${then.id}/runner`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "chrome" }) });
      await askExtension("run", { id: then.id });
      router.push(`/applications/${then.id}`);
    }
    setBusy(false);
  }

  const step = (n: number, done: boolean, title: string, body: React.ReactNode) => (
    <li className="flex gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-go text-white" : "bg-accent/10 text-accent"}`}>{done ? <CircleCheck className="size-4" aria-hidden /> : n}</span>
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <p className="font-semibold">{title}</p>
        {body}
      </div>
    </li>
  );

  return (
    <div className="space-y-4">
      {/* the runner is a desktop Chrome extension: on a phone the two steps below can't be done */}
      <div className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-4 text-sm md:hidden" role="note">
        <p className="font-semibold">This step needs a computer.</p>
        <p className="mt-1 leading-relaxed text-muted">The Ivyward runner works in Chrome, Edge or Brave on a laptop or desktop. Open this page there to connect it. Everything else works on your phone.</p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={async () => {
            const url = window.location.href;
            if (navigator.share) await navigator.share({ title: "Connect Chrome to Ivyward", url }).catch(() => {});
            else {
              await navigator.clipboard?.writeText(url).catch(() => {});
              toast.success("Link copied. Open it on your computer.");
            }
          }}
        >
          <Copy className="size-3.5" aria-hidden /> Send this page to my computer
        </Button>
      </div>
      <p className="text-sm leading-relaxed text-muted">
        Runs in Chrome need Chrome open on your computer. Closed, nothing is lost: the work waits, and when an application is waiting for Chrome we email you.
      </p>
      <p className="text-sm leading-relaxed text-muted">
        Some portals refuse any browser running in the cloud. Connect your Chrome once and, whenever that happens, the agents carry on in a background tab on this computer: same answers, same documents, your own
        connection. The Ivyward side panel shows every answer as it goes in and asks you before anything is submitted. Bot checks
        and payment wait there for you; the agents never solve those themselves.
        {then ? <span className="mt-2 block font-medium text-foreground">Next up: {then.school}.</span> : null}
      </p>
      {ext.installed && olderThan(ext.version) ? (
        <div className="mb-4 rounded-3xl border border-line bg-surface p-4 text-sm shadow-card">
          <p className="font-medium">An update is ready: version {EXTENSION_VERSION} (you have {ext.version}).</p>
          {store ? (
            <p className="text-muted">Chrome updates it by itself within a few hours. To update now, open chrome://extensions, switch on Developer mode and choose Update.</p>
          ) : (
            <p className="text-muted">Download it below and unzip it over the old folder, then open chrome://extensions and press the reload arrow on Ivyward runner. Your connection is kept.</p>
          )}
        </div>
      ) : null}
      <ol className="space-y-3">
        {step(
          1,
          ext.installed,
          "Add the Ivyward runner to Chrome",
          store ? (
            <>
              <p className="text-muted">One click from the Chrome Web Store. Works in Chrome, Edge and Brave on a computer.</p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={store} external size="sm" variant={ext.installed ? "secondary" : "primary"}>
                  <Download className="size-3.5" aria-hidden /> Add to Chrome
                </ButtonLink>
              </div>
              {!ext.installed && checked ? <p className="text-xs text-muted">Added it already? Reload this page so it can see the extension.</p> : null}
            </>
          ) : (
          <>
            <p className="text-muted">Download it, unzip it, open <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">chrome://extensions</code>, switch on Developer mode (top right), choose Load unpacked and pick the unzipped folder. Works in Chrome, Edge and Brave on a computer.</p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/ivyward-runner.zip" size="sm" variant={ext.installed ? "secondary" : "primary"}>
                <Download className="size-3.5" aria-hidden /> Download the extension
              </ButtonLink>
              <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText("chrome://extensions").then(() => toast.success("Copied. Paste it into the address bar"))}>
                <Copy className="size-3.5" aria-hidden /> Copy chrome://extensions
              </Button>
            </div>
            {!ext.installed && checked ? <p className="text-xs text-muted">Installed it already? Reload this page so it can see the extension.</p> : null}
          </>
          ),
        )}
        {step(
          2,
          ext.paired,
          "Connect it to your account",
          ext.paired ? (
            <p className="text-muted">Connected{ext.version ? ` (version ${ext.version})` : ""}. Keep Chrome open while applications are going in; it works in the background.{ext.running ? ` Working on ${ext.running.school} now: ${ext.running.phase}.` : ""}</p>
          ) : (
            <>
              <p className="text-muted">One click. This browser gets its own key, which you can remove in Settings at any time.</p>
              <Button size="sm" disabled={!ext.installed || busy} onClick={connect}>
                {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <PlugZap className="size-3.5" aria-hidden />} Connect Chrome
              </Button>
            </>
          ),
        )}
      </ol>
      {ext.paired && (
        <p className="text-sm">
          {then ? (
            <Link href={`/applications/${then.id}`} className="font-semibold text-brand hover:underline">
              Back to {then.school}
            </Link>
          ) : (
            <Link href="/applications" className="font-semibold text-brand hover:underline">
              Back to your applications
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
