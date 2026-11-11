"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Trophy } from "lucide-react";
import { toast } from "sonner";
import { ATTESTATION } from "@/lib/attest";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/page";

// the applicant's own steps: sign the packet, confirm a self-submission, record what the school decided
export function Milestones({ id, status, essaysTotal, essaysApproved }: { id: string; status: string; essaysTotal: number; essaysApproved: number }) {
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState("admitted");
  const [aid, setAid] = useState("");
  const [note, setNote] = useState("");
  const [acceptBy, setAcceptBy] = useState("");
  const [attest, setAttest] = useState(false);
  const router = useRouter();

  async function act(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const res = await fetch(`/api/applications/${id}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't save that");
    else toast.success(ok);
    setBusy(false);
    router.refresh();
  }

  if (status === "preparing" || status === "ready_for_review") {
    const left = essaysTotal - essaysApproved;
    const pct = essaysTotal ? Math.round((essaysApproved / essaysTotal) * 100) : 0;
    return (
      <Panel id="sign" className="scroll-mt-24 space-y-4 p-5" tone={left === 0 && essaysTotal ? "signal" : "plain"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <PenLine className="size-4" aria-hidden />
            Sign your packet
          </h2>
          <span className="text-sm text-muted tabular">
            {essaysApproved} of {essaysTotal} pieces approved
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-label="Essays approved" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-bar-gradient transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-muted">
          {!essaysTotal
            ? "Pieces appear here once the strategist knows what this application asks for."
            : left
              ? `Approve ${left} more ${left === 1 ? "piece" : "pieces"} below, then sign. After that the agents find the portal, create your account and submit.`
              : "Everything is approved. Sign below and the agents find the portal, create your account and submit."}
        </p>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-background p-4 text-[13px] leading-relaxed">
          <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-foreground)]" />
          <span>{ATTESTATION}</span>
        </label>
        <Button disabled={busy || !attest || !essaysTotal || left > 0} onClick={() => act({ action: "approve_packet", attest: true }, "Signed. The agents are submitting it.")}>
          {busy ? "Signing…" : "Sign and submit for me"}
        </Button>
      </Panel>
    );
  }

  if (status === "packet_approved") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-surface px-5 py-3.5 text-sm shadow-card">
        <span className="text-muted">Signed. Submitted it yourself instead? Let us know so the agents stop.</span>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => act({ action: "mark_submitted" }, "Marked as submitted")}>
          I submitted it myself
        </Button>
      </div>
    );
  }

  if (["submitted", "under_review", "interview", "waitlisted"].includes(status)) {
    return (
      <Panel className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Heard back?</h2>
          <p className="mt-0.5 text-sm text-muted">The inbox watcher records most decisions for you. If one came another way, add it here. An admit with an aid offer starts the funding agent.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Decision">
            <Select value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="admitted">Admitted</option>
              <option value="interview">Interview invite</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="rejected">Not admitted</option>
            </Select>
          </Field>
          {decision === "admitted" && (
            <>
              <Field label="Aid offered per year, USD" hint="0 if none">
                <Input inputMode="decimal" value={aid} onChange={(e) => setAid(e.target.value.replace(/[^0-9.]/g, ""))} />
              </Field>
              <Field label="Aid details" hint="Scholarship name, assistantship, and so on">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Field label="Reply by">
                <Input type="date" value={acceptBy} onChange={(e) => setAcceptBy(e.target.value)} />
              </Field>
            </>
          )}
        </div>
        <Button
          disabled={busy}
          onClick={() =>
            act(
              { action: "record_decision", decision, ...(decision === "admitted" ? { aid_amount_usd: aid ? Number(aid) : 0, aid_note: note || undefined, accept_by: acceptBy || undefined } : {}) },
              "Decision recorded",
            )
          }
        >
          {busy ? "Saving…" : "Record decision"}
        </Button>
      </Panel>
    );
  }

  if (status === "admitted") {
    return (
      <Panel tone="go" className="flex items-start gap-3 p-5 text-sm">
        <Trophy className="mt-0.5 size-5 shrink-0 text-go" aria-hidden />
        <p>
          <span className="block font-semibold">Admitted.</span>
          The funding agent is working on this school. Its plan and any emails it drafted are below.
        </p>
      </Panel>
    );
  }
  return null;
}
