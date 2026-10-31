"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type L = { id: string; agent: string; task: string | null; topic: string | null; text: string; status: string; evidence: Record<string, unknown>; created_at: string; retired_reason?: string | null; uses?: number };

const AGENT: Record<string, string> = { runner: "Portal agent", closer: "Outreach", writer: "Essays", recon: "Research & shortlist", strategist: "Essay planning", interviewer: "Ivyward AI" };

async function act(id: string, action: string, text?: string) {
  const r = await fetch("/api/admin/lessons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action, ...(text ? { text } : {}) }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Couldn't save");
}

function Row({ l, proposed }: { l: L; proposed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(l.text);
  const go = async (action: string) => {
    setBusy(true);
    try {
      await act(l.id, action, action === "approve" && text !== l.text ? text : undefined);
      toast.success(action === "approve" ? "Approved: agents use it from now on" : action === "reject" ? "Rejected" : "Retired");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
    setBusy(false);
  };
  const why = typeof l.evidence?.why === "string" ? l.evidence.why : null;
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{AGENT[l.agent] ?? l.agent}</span>
        {l.topic && <span>{l.topic}</span>}
        <span>{new Date(l.created_at).toLocaleDateString()}</span>
        {typeof l.uses === "number" && <span>used in {l.uses} calls</span>}
      </div>
      {proposed ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent" aria-label="Lesson text" />
      ) : (
        <p className="text-sm">{l.text}</p>
      )}
      {why && <p className="text-xs text-muted">Why: {why}</p>}
      {l.retired_reason && <p className="text-xs text-muted">{l.retired_reason}</p>}
      <div className="flex gap-2">
        {proposed ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => go("approve")}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => go("reject")}>
              Reject
            </Button>
          </>
        ) : l.status === "active" ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => go("retire")}>
            Retire
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function LessonsAdmin({ proposed, active, retired, personal }: { proposed: L[]; active: L[]; retired: L[]; personal: { users: number; lessons: number } }) {
  const list = (xs: L[], p: boolean, empty: string) => (
    <ul className="divide-y divide-line rounded-3xl border border-line bg-surface shadow-card">{xs.length ? xs.map((l) => <Row key={l.id} l={l} proposed={p} />) : <li className="px-4 py-3 text-sm text-muted">{empty}</li>}</ul>
  );
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Lessons about one applicant ({personal.lessons} across {personal.users} applicants) and notes about one portal are used straight away. Lessons for everyone wait here. Anything that makes results worse is retired automatically.
      </p>
      <div className="space-y-2">
        <h3 className="font-semibold">Waiting for approval ({proposed.length})</h3>
        {list(proposed, true, "Nothing waiting.")}
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">In use ({active.length})</h3>
        {list(active, false, "No lessons in use yet.")}
      </div>
      {retired.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Retired recently</h3>
          {list(retired, false, "")}
        </div>
      )}
    </div>
  );
}

export function MyLessons({ lessons }: { lessons: { id: string; agent: string; text: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (!lessons.length) return <p className="text-sm text-muted">Nothing yet. As you edit essays and sort your shortlist, the agents learn how you write and what you want, and it shows here.</p>;
  return (
    <ul className="space-y-2">
      {lessons.map((l) => (
        <li key={l.id} className="flex items-start gap-3 text-sm">
          <span className="min-w-0 flex-1">
            <span className="mr-2 text-xs text-muted">{l.agent === "writer" ? "Essays" : l.agent === "recon" ? "Shortlist" : l.agent}</span>
            {l.text}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy === l.id}
            onClick={async () => {
              setBusy(l.id);
              const r = await fetch(`/api/lessons/${l.id}`, { method: "DELETE" });
              if (r.ok) {
                toast.success("Removed. The agents won't use it again.");
                router.refresh();
              } else toast.error("Couldn't remove it");
              setBusy(null);
            }}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
