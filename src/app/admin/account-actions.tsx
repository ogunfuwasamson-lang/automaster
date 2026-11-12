"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// staff controls for one account: deactivate (reversible) and delete (for good, confirmed by typing the email).
// no browser confirm(): the delete step asks inline, so the decision is in front of you with what it removes.
export function AccountActions({ userId, email, deactivated, usersHref }: { userId: string; email: string; deactivated: boolean; usersHref: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "toggle" | "delete">("");
  const [err, setErr] = useState("");
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");

  async function send(body: Record<string, string>) {
    setErr("");
    const res = await fetch("/api/admin/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string };
    if (!res?.ok) {
      setErr(data?.error ?? "That didn't go through. Try again.");
      return false;
    }
    return true;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={async () => {
            setBusy("toggle");
            if (await send({ action: deactivated ? "reactivate" : "deactivate", userId })) router.refresh();
            setBusy("");
          }}
          className={`tap rounded-lg border px-3 py-1.5 text-[13px] transition disabled:opacity-50 ${deactivated ? "border-go/40 text-go hover:border-go" : "border-line hover:border-foreground/40"}`}
          title={deactivated ? "Let them sign in again and lift the pause on their agents" : "They can't sign in and their agents stop. Nothing is deleted; you can undo it."}
        >
          {busy === "toggle" ? "Saving" : deactivated ? "Reactivate account" : "Deactivate account"}
        </button>
        {!asking && (
          <button type="button" disabled={!!busy} onClick={() => setAsking(true)} className="tap rounded-lg border border-stop/40 px-3 py-1.5 text-[13px] text-stop transition hover:border-stop disabled:opacity-50">
            Delete account
          </button>
        )}
      </div>
      {asking && (
        <form
          className="max-w-xl space-y-2 rounded-xl border border-stop/40 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy("delete");
            if (await send({ action: "delete", userId, confirm: typed })) {
              router.push(usersHref);
              router.refresh();
              return;
            }
            setBusy("");
          }}
        >
          <p className="text-[13px]">
            This deletes the account, its profile, documents, essays, applications and history for good, and disconnects Gmail. It can&apos;t be undone. Type <b className="select-all">{email}</b> to confirm.
          </p>
          <label htmlFor="confirm-delete" className="sr-only">
            The account&apos;s email
          </label>
          <input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-[13.5px]" />
          <div className="flex gap-2">
            <button type="submit" disabled={!!busy || typed.trim().toLowerCase() !== email.toLowerCase()} className="tap rounded-lg bg-stop px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40">
              {busy === "delete" ? "Deleting" : "Delete for good"}
            </button>
            <button type="button" onClick={() => { setAsking(false); setTyped(""); setErr(""); }} className="tap rounded-lg border border-line px-3 py-1.5 text-[13px]">
              Keep the account
            </button>
          </div>
        </form>
      )}
      {err && <p role="alert" className="text-[13px] text-stop">{err}</p>}
    </div>
  );
}
