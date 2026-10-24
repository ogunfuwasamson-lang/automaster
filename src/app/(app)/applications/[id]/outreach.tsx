"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Draft {
  id: string;
  purpose: string | null;
  to_email: string | null;
  subject: string | null;
  body: string;
  status: string;
  send_after?: string | null;
  last_error?: string | null;
}

const PURPOSE: Record<string, string> = {
  fee_waiver: "fee waiver request",
  aid_reconsideration: "aid reconsideration",
  assistantship_inquiry: "assistantship inquiry",
  scholarship_inquiry: "scholarship inquiry",
  supervisor_intro: "supervisor introduction",
  other: "email",
};

// emails go out from the applicant's own gmail (send-only access) after one tap and a short undo window.
// without gmail connected, the draft opens in their email app and they tell us it went out.
export function OutreachDraft({ d, mail }: { d: Draft; mail: string | null }) {
  const [to, setTo] = useState(d.to_email ?? "");
  const [subject, setSubject] = useState(d.subject ?? "");
  const [body, setBody] = useState(d.body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  const dirty = to !== (d.to_email ?? "") || subject !== (d.subject ?? "") || body !== d.body;
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/messages/${d.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
    setBusy(false);
    router.refresh();
  }

  const input = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700";
  return (
    <article className="space-y-2 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{PURPOSE[d.purpose ?? "other"] ?? "email"}</p>
        <span className="text-xs text-neutral-500">{d.status === "sent" ? "sent" : d.status === "scheduled" ? "sending" : d.status === "failed" ? "failed" : "draft"}</span>
      </div>
      {d.status === "scheduled" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>to {d.to_email} · {d.subject}</span>
          <span className="text-neutral-500">
            {d.send_after && Date.parse(d.send_after) > Date.now() ? `sends at ${new Date(d.send_after).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} from ${mail ?? "your gmail"}` : "sending now"}
          </span>
          <button disabled={busy} onClick={() => act({ action: "cancel" })} className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700">undo</button>
        </div>
      ) : d.status === "sent" ? (
        <>
          <p className="text-sm text-neutral-500">to {d.to_email ?? "?"} · {d.subject}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-500">what happened?</span>
            {[["replied", "they replied"], ["waived", "fee waived"], ["aid_increased", "aid increased"], ["declined", "declined"], ["no_reply", "no reply"]].map(([k, l]) => (
              <button key={k} disabled={busy} onClick={() => act({ action: "log_reply", outcome: k })} className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700">{l}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="to (official address)" className={input} />
          {!to && <p className="text-xs text-amber-700 dark:text-amber-400">no official email was published. check the notes in the plan above for the right channel.</p>}
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="subject" className={input} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(16, Math.max(6, Math.ceil(body.length / 90)))} className={`${input} leading-relaxed`} />
          {d.last_error && <p className="text-xs text-amber-700 dark:text-amber-400">{d.last_error}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={!dirty || busy} onClick={() => act({ action: "save", subject, body, to_email: to })} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700">save</button>
            {mail ? (
              <button
                disabled={busy || !to}
                onClick={async () => {
                  if (dirty) await act({ action: "save", subject, body, to_email: to });
                  await act({ action: "send" });
                }}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
              >
                approve &amp; send
              </button>
            ) : (
              <>
                <a href={mailto} className={`rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900 ${!to ? "pointer-events-none opacity-40" : ""}`}>open in my email</a>
                <button disabled={busy || dirty} title={dirty ? "save first" : ""} onClick={() => act({ action: "mark_sent" })} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700">I sent it</button>
              </>
            )}
            <button disabled={busy} onClick={() => act({ action: "discard" })} className="rounded-md px-3 py-1.5 text-sm text-neutral-500">discard</button>
          </div>
          {!mail && <p className="text-xs text-neutral-500"><a href="/settings" className="underline">connect gmail</a> to send with one tap.</p>}
        </>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </article>
  );
}
