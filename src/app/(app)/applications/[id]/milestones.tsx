"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// the applicant's own steps: approve the packet, confirm they submitted, record what the school decided
export function Milestones({ id, status, essaysTotal, essaysApproved }: { id: string; status: string; essaysTotal: number; essaysApproved: number }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [decision, setDecision] = useState("admitted");
  const [aid, setAid] = useState("");
  const [note, setNote] = useState("");
  const [acceptBy, setAcceptBy] = useState("");
  const router = useRouter();

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/applications/${id}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
    setBusy(false);
    router.refresh();
  }

  const btn = "rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900";
  const input = "rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700";

  return (
    <section className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">status: {status.replace(/_/g, " ")}</h2>

      {(status === "preparing" || status === "ready_for_review") && (
        <div className="space-y-2 text-sm">
          <p>{essaysApproved}/{essaysTotal} pieces approved by you. when all are approved, approve the packet: that&apos;s your statement that everything in it is yours and true.</p>
          <button disabled={busy || !essaysTotal || essaysApproved < essaysTotal} onClick={() => act({ action: "approve_packet" })} className={btn}>approve packet</button>
        </div>
      )}

      {status === "packet_approved" && (
        <div className="space-y-2 text-sm">
          <p>packet approved. submit it on the school&apos;s portal (copy your approved essays from below), then confirm here so deadlines and follow-ups switch to post-submission mode.</p>
          <button disabled={busy} onClick={() => act({ action: "mark_submitted" })} className={btn}>I submitted it</button>
        </div>
      )}

      {["submitted", "under_review", "interview", "waitlisted"].includes(status) && (
        <div className="space-y-2 text-sm">
          <p>heard back? record it. an admit with your aid offer starts the funding agent on this school.</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={decision} onChange={(e) => setDecision(e.target.value)} className={input}>
              <option value="admitted">admitted</option>
              <option value="interview">interview invite</option>
              <option value="waitlisted">waitlisted</option>
              <option value="rejected">rejected</option>
            </select>
            {decision === "admitted" && (
              <>
                <input value={aid} onChange={(e) => setAid(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="aid offered, USD/yr (0 if none)" className={`${input} w-56`} />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="aid details (scholarship name, assistantship...)" className={`${input} min-w-0 flex-1`} />
                <label className="flex items-center gap-1 text-neutral-500">reply by <input type="date" value={acceptBy} onChange={(e) => setAcceptBy(e.target.value)} className={input} /></label>
              </>
            )}
            <button
              disabled={busy}
              onClick={() =>
                act({
                  action: "record_decision",
                  decision,
                  ...(decision === "admitted" ? { aid_amount_usd: aid ? Number(aid) : 0, aid_note: note || undefined, accept_by: acceptBy || undefined } : {}),
                })
              }
              className={btn}
            >
              save
            </button>
          </div>
        </div>
      )}

      {status === "admitted" && <p className="text-sm">admitted. the funding agent is working on this school: see the funding plan and drafts below.</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </section>
  );
}
