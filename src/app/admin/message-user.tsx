"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// staff: write to one applicant. it lands in their Ivyward bell, marked important, and by email if ticked.
export function MessageUser({ userId, firstName }: { userId: string; firstName: string | null }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(firstName ? `Hi ${firstName},\n\n` : "");
  const [href, setHref] = useState("/dashboard");
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const field = "w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-[13.5px]";
  return (
    <form
      className="space-y-2.5 px-4 py-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch("/api/admin/message", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, title, body, href, actionLabel: label, email }) }).catch(() => null);
        const data = (await res?.json().catch(() => ({}))) as { error?: string; emailed?: boolean };
        setBusy(false);
        if (!res?.ok) return setMsg({ ok: false, text: data?.error ?? "Didn't send. Try again." });
        setMsg({ ok: true, text: email ? (data.emailed ? "Sent to their Ivyward notifications and by email." : "Sent to their Ivyward notifications. The email couldn't go out.") : "Sent to their Ivyward notifications." });
        setTitle("");
        setBody(firstName ? `Hi ${firstName},\n\n` : "");
        router.refresh();
      }}
    >
      <div>
        <label htmlFor="msg-title" className="block text-[12.5px] text-muted">Subject</label>
        <input id="msg-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required className={field} placeholder="Your Ivyward Pro payment: a quick fix" />
      </div>
      <div>
        <label htmlFor="msg-body" className="block text-[12.5px] text-muted">Message</label>
        <textarea id="msg-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} required rows={7} className={field} />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div>
          <label htmlFor="msg-href" className="block text-[12.5px] text-muted">Button opens</label>
          <input id="msg-href" value={href} onChange={(e) => setHref(e.target.value)} className={field} placeholder="/dashboard" />
        </div>
        <div>
          <label htmlFor="msg-label" className="block text-[12.5px] text-muted">Button says</label>
          <input id="msg-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} className={field} placeholder="Open Ivyward" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-[13.5px]">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="size-4" />
          Also email it
        </label>
        <button type="submit" disabled={busy || !title.trim() || !body.trim()} className="tap rounded-lg bg-foreground px-3.5 py-1.5 text-[13.5px] font-medium text-background disabled:opacity-40">
          {busy ? "Sending" : "Send message"}
        </button>
        {msg && <p role="status" className={`text-[13px] ${msg.ok ? "text-go" : "text-stop"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
