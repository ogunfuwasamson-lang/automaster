"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Audience = { key: string; label: string; hint: string };
type Msg = { subject: string; preheader: string; headline: string; body: string };
type Template = { key: string; label: string; msg: { subject: string; preheader?: string; headline: string; body: string } };

const EMPTY: Msg = { subject: "", preheader: "", headline: "", body: "Hi {first_name},\n\n" };
const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px]";

// staff: write one email to a group of applicants. preview it, send a test to yourself, then send it; the send
// asks you to confirm the exact number of people, and the server refuses if the group changed since.
export function Broadcast({ audiences, templates }: { audiences: Audience[]; templates: Template[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(EMPTY);
  const [audience, setAudience] = useState("team");
  const [country, setCountry] = useState("");
  const [bell, setBell] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ html: string; subject: string; problems: string[] } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/admin/broadcast", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, audience, country, msg, bell, ...extra }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: !!res?.ok, data };
  };

  // how many people the group is, whenever it changes
  useEffect(() => {
    let live = true;
    setCount(null);
    setConfirming(false);
    if (audience === "country" && !country.trim()) return;
    const t = setTimeout(async () => {
      const r = await call("count");
      if (live) setCount(typeof r.data.count === "number" ? r.data.count : null);
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, country]);

  const set = (k: keyof Msg) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMsg({ ...msg, [k]: e.target.value });
    setConfirming(false);
  };
  const aud = audiences.find((a) => a.key === audience);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="bc-tpl" className="block text-[12.5px] text-muted">Start from</label>
            <select
              id="bc-tpl"
              className={field}
              defaultValue=""
              onChange={(e) => {
                const t = templates.find((x) => x.key === e.target.value);
                setMsg(t ? { subject: t.msg.subject, preheader: t.msg.preheader ?? "", headline: t.msg.headline, body: t.msg.body } : EMPTY);
                setPreview(null);
                setConfirming(false);
              }}
            >
              <option value="">A blank email</option>
              {templates.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="bc-subject" className="block text-[12.5px] text-muted">Subject</label>
          <input id="bc-subject" value={msg.subject} onChange={set("subject")} maxLength={140} className={field} />
        </div>
        <div>
          <label htmlFor="bc-pre" className="block text-[12.5px] text-muted">Preview line (shown after the subject in the inbox)</label>
          <input id="bc-pre" value={msg.preheader} onChange={set("preheader")} maxLength={200} className={field} />
        </div>
        <div>
          <label htmlFor="bc-head" className="block text-[12.5px] text-muted">Headline</label>
          <input id="bc-head" value={msg.headline} onChange={set("headline")} maxLength={160} className={field} />
        </div>
        <div>
          <label htmlFor="bc-body" className="block text-[12.5px] text-muted">Message</label>
          <textarea id="bc-body" value={msg.body} onChange={set("body")} rows={18} className={`${field} font-mono text-[12.5px] leading-relaxed`} />
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            A blank line starts a paragraph. <code>### Title</code> then its lines makes a numbered card. <code>[[Button]](/dashboard)</code> on its own line makes a button. <code>[words](https://...)</code> is a link, <code>**bold**</code> is bold, <code>{"{first_name}"}</code> is the reader&apos;s first name.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="bc-aud" className="block text-[12.5px] text-muted">Send to</label>
            <select id="bc-aud" value={audience} onChange={(e) => setAudience(e.target.value)} className={field}>
              {audiences.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-muted">
              {aud?.hint}. {count === null ? "Counting..." : `${count} ${count === 1 ? "person" : "people"}.`} People who turned news emails off are left out.
            </p>
          </div>
          {audience === "country" && (
            <div>
              <label htmlFor="bc-country" className="block text-[12.5px] text-muted">Billing country code</label>
              <input id="bc-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="NG" maxLength={60} className={field} />
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={bell} onChange={(e) => setBell(e.target.checked)} />
          Also put it in their Ivyward notifications
        </label>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={!!busy}
            className="rounded-lg border border-line px-3.5 py-2 text-[13px] font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
            onClick={async () => {
              setBusy("preview");
              const r = await call("preview");
              setBusy(null);
              if (r.ok) setPreview({ html: String(r.data.html ?? ""), subject: String(r.data.subject ?? ""), problems: (r.data.problems as string[]) ?? [] });
              else setNote({ ok: false, text: String(r.data.error ?? "Preview failed.") });
            }}
          >
            {busy === "preview" ? "Rendering..." : "Preview"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            className="rounded-lg border border-line px-3.5 py-2 text-[13px] font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
            onClick={async () => {
              setBusy("test");
              setNote(null);
              const r = await call("test");
              setBusy(null);
              setNote(r.ok ? { ok: true, text: `Test sent to ${String(r.data.to)}.` } : { ok: false, text: String(r.data.error ?? "The test didn't send.") });
            }}
          >
            {busy === "test" ? "Sending..." : "Send a test to me"}
          </button>
          {!confirming ? (
            <button
              type="button"
              disabled={!!busy || !count}
              className="rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-semibold text-background disabled:opacity-40"
              onClick={() => setConfirming(true)}
            >
              Send to {count ?? "..."} {count === 1 ? "person" : "people"}
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 rounded-lg border border-stop/40 px-3 py-1.5 text-[13px]">
              Send &ldquo;{msg.subject || "(no subject)"}&rdquo; to {count} {count === 1 ? "person" : "people"} now? It can&apos;t be unsent.
              <button
                type="button"
                disabled={!!busy}
                className="rounded-md bg-stop px-2.5 py-1 font-semibold text-white"
                onClick={async () => {
                  setBusy("send");
                  setNote(null);
                  const r = await call("send", { confirm: count });
                  setBusy(null);
                  setConfirming(false);
                  if (r.ok) {
                    setNote({ ok: true, text: `Sent to ${String(r.data.sent)}${Number(r.data.failed) ? `; ${String(r.data.failed)} failed` : ""}.` });
                    router.refresh();
                  } else {
                    setNote({ ok: false, text: String(r.data.error ?? "It didn't send.") });
                    if (typeof r.data.count === "number") setCount(r.data.count);
                  }
                }}
              >
                {busy === "send" ? "Sending..." : "Yes, send"}
              </button>
              <button type="button" className="text-muted underline" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </span>
          )}
        </div>
        {note && <p className={`text-[13px] ${note.ok ? "text-go" : "text-stop"}`} role="status">{note.text}</p>}
      </form>

      <div className="min-w-0">
        <p className="text-[12.5px] text-muted">Preview{preview ? `: ${preview.subject}` : ""}</p>
        {preview?.problems.length ? <p className="mt-1 text-[13px] text-stop">{preview.problems.join(" ")}</p> : null}
        <div className="mt-1.5 overflow-hidden rounded-xl border border-line bg-white">
          {preview ? (
            <iframe title="Email preview" srcDoc={preview.html} className="h-[78vh] w-full" sandbox="" />
          ) : (
            <p className="p-6 text-[13px] text-muted">Press Preview to see the email as the first person in the group will get it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
