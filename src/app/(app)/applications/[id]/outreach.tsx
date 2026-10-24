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
}

const PURPOSE: Record<string, string> = {
  fee_waiver: "fee waiver request",
  aid_reconsideration: "aid reconsideration",
  assistantship_inquiry: "assistantship inquiry",
  scholarship_inquiry: "scholarship inquiry",
  supervisor_intro: "supervisor introduction",
  other: "email",
};

// emails go out from the applicant's own inbox. we draft, they send, they tell us.
export function OutreachDraft({ d }: { d: Draft }) {
  const [to, setTo] = useState(d.to_email ?? "");
  const [subject, setSubject] = useState(d.subject ?? "");
  const [body, setBody] = useState(d.body);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const dirty = to !== (d.to_email ?? "") || subject !== (d.subject ?? "") || body !== d.body;
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/messages/${d.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    router.refresh();
  }

  const input = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700";
  return (
    <article className="space-y-2 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{PURPOSE[d.purpose ?? "other"] ?? "email"}</p>
        <span className="text-xs text-neutral-500">{d.status === "sent" ? "sent by you" : "draft"}</span>
      </div>
      {d.status === "sent" ? (
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
          <div className="flex flex-wrap gap-2">
            <button disabled={!dirty || busy} onClick={() => act({ action: "save", subject, body, to_email: to })} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700">save</button>
            <a href={mailto} className={`rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900 ${!to ? "pointer-events-none opacity-40" : ""}`}>open in my email</a>
            <button disabled={busy || dirty} title={dirty ? "save first" : ""} onClick={() => act({ action: "mark_sent" })} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700">I sent it</button>
            <button disabled={busy} onClick={() => act({ action: "discard" })} className="rounded-md px-3 py-1.5 text-sm text-neutral-500">discard</button>
          </div>
        </>
      )}
    </article>
  );
}
