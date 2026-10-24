"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";

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
  fee_waiver: "Fee waiver request",
  aid_reconsideration: "Aid reconsideration",
  assistantship_inquiry: "Assistantship inquiry",
  scholarship_inquiry: "Scholarship inquiry",
  supervisor_intro: "Supervisor introduction",
  other: "Email",
};

const STATE: Record<string, [string, string]> = {
  sent: ["Sent", "text-go"],
  scheduled: ["Sending", "text-foreground"],
  failed: ["Didn't send", "text-stop"],
  draft: ["Draft", "text-muted"],
};

// emails go out from the applicant's own gmail after one tap and a short undo window.
// without gmail connected, the draft opens in their email app and they tell us it went out.
export function OutreachDraft({ d, mail }: { d: Draft; mail: string | null }) {
  const [to, setTo] = useState(d.to_email ?? "");
  const [subject, setSubject] = useState(d.subject ?? "");
  const [body, setBody] = useState(d.body);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const dirty = to !== (d.to_email ?? "") || subject !== (d.subject ?? "") || body !== d.body;
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const [label, tone] = STATE[d.status] ?? STATE.draft;

  async function act(payload: Record<string, unknown>, ok?: string) {
    setBusy(true);
    const res = await fetch(`/api/messages/${d.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't do that");
    else if (ok) toast.success(ok);
    setBusy(false);
    router.refresh();
    return res.ok;
  }

  return (
    <article className="space-y-3 rounded-3xl border border-line bg-surface shadow-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium">
          <Mail className="size-4 text-muted" aria-hidden />
          {PURPOSE[d.purpose ?? "other"] ?? "Email"}
        </p>
        <span className={`text-xs font-medium ${tone}`}>{label}</span>
      </div>

      {d.status === "scheduled" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="block truncate">{d.subject}</span>
            <span className="text-muted">
              To {d.to_email},{" "}
              {d.send_after && Date.parse(d.send_after) > Date.now()
                ? `sends at ${new Date(d.send_after).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} from ${mail ?? "your Gmail"}`
                : "sending now"}
            </span>
          </span>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => act({ action: "cancel" }, "Held back. It's a draft again.")}>
            <Undo2 className="size-3.5" aria-hidden />
            Undo
          </Button>
        </div>
      ) : d.status === "sent" ? (
        <>
          <p className="text-sm text-muted">
            To {d.to_email ?? "unknown"}: {d.subject}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">What happened?</span>
            {[
              ["replied", "They replied"],
              ["waived", "Fee waived"],
              ["aid_increased", "Aid increased"],
              ["declined", "Declined"],
              ["no_reply", "No reply"],
            ].map(([k, l]) => (
              <Button key={k} size="sm" variant="secondary" disabled={busy} onClick={() => act({ action: "log_reply", outcome: k }, "Noted")}>
                {l}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To (official address)" aria-label="To" />
          {!to && <p className="text-xs text-muted">No official address was published. The plan above says which channel to use.</p>}
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(16, Math.max(6, Math.ceil(body.length / 90)))} aria-label="Message" />
          {d.last_error && <p className="text-xs text-stop">{d.last_error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {mail ? (
              <Button
                disabled={busy || !to}
                onClick={async () => {
                  if (dirty && !(await act({ action: "save", subject, body, to_email: to }))) return;
                  await act({ action: "send" }, "Sending in a few minutes. You can still undo.");
                }}
              >
                <Send className="size-4" aria-hidden />
                Approve and send
              </Button>
            ) : (
              <>
                <a href={mailto} className={buttonClass("primary", "md", !to ? "pointer-events-none opacity-45" : "")}>
                  Open in my email
                </a>
                <Button variant="secondary" disabled={busy || dirty} title={dirty ? "Save first" : ""} onClick={() => act({ action: "mark_sent" }, "Marked as sent")}>
                  I sent it
                </Button>
              </>
            )}
            <Button variant="secondary" disabled={!dirty || busy} onClick={() => act({ action: "save", subject, body, to_email: to }, "Saved")}>
              Save
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => act({ action: "discard" }, "Discarded")}>
              Discard
            </Button>
          </div>
          {!mail && (
            <p className="text-xs text-muted">
              <Link href="/settings" className="underline underline-offset-4">
                Connect Gmail
              </Link>{" "}
              to send with one tap.
            </p>
          )}
        </>
      )}
    </article>
  );
}
