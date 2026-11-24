"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, LoaderCircle } from "lucide-react";

// the operator's creator buttons (admin console, Creators; api/admin/creators). no browser dialogs: a reason or a
// reference is typed into a small inline field.

async function act(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/creators", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { error?: string; number?: string };
  if (!r.ok) throw new Error(j.error ?? "That didn't work.");
  return j;
}

const btn = "inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-line px-2.5 text-[12.5px] font-medium hover:border-foreground/40 disabled:opacity-50";
const input = "h-7 min-w-0 rounded-md border border-line bg-surface px-2 text-[12.5px] outline-none focus:border-foreground/40";

function useAct() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      const j = await act(body);
      toast.success(done);
      router.refresh();
      return j;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

// approve, reject, pause or resume a creator; a note is shown to them when they're paused or turned down
export function CreatorStatus({ id, status }: { id: string; status: string }) {
  const { busy, run } = useAct();
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState<"rejected" | "paused" | null>(null);
  if (asking)
    return (
      <form
        className="flex flex-wrap gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          await run({ action: "status", id, status: asking, note: note.trim() || undefined }, asking === "paused" ? "Paused" : "Rejected");
          setAsking(null);
        }}
      >
        <input className={`${input} w-48`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={asking === "paused" ? "Why (they see this)" : "Reason (optional, they see it)"} maxLength={300} autoFocus />
        <button className={btn} disabled={busy}>
          {asking === "paused" ? "Pause" : "Reject"}
        </button>
        <button type="button" className={btn} onClick={() => setAsking(null)}>
          Cancel
        </button>
      </form>
    );
  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "pending" || status === "paused" || status === "rejected" ? (
        <button className={btn} disabled={busy} onClick={() => run({ action: "status", id, status: "active" }, status === "pending" ? "Approved: they've been emailed" : "Active again")}>
          {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
          {status === "pending" ? "Approve" : "Make active"}
        </button>
      ) : null}
      {status === "pending" ? (
        <button className={btn} disabled={busy} onClick={() => setAsking("rejected")}>
          Reject
        </button>
      ) : null}
      {status === "active" ? (
        <button className={btn} disabled={busy} onClick={() => setAsking("paused")}>
          Pause
        </button>
      ) : null}
    </div>
  );
}

export function RateEditor({ id, rate }: { id: string; rate: number }) {
  const { busy, run } = useAct();
  const [v, setV] = useState(String(rate));
  const changed = Number(v) !== rate;
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ action: "rate", id, rate: Number(v) }, "Rate changed: it applies to sign-ups that qualify from now on");
      }}
    >
      <span className="text-[12.5px] text-muted">₦</span>
      <input className={`${input} w-16 tabular-nums`} value={v} onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" aria-label="Rate per qualified sign-up" />
      {changed ? (
        <button className={btn} disabled={busy}>
          Save
        </button>
      ) : null}
    </form>
  );
}

// a payout: see the full account number to make the transfer, then mark it paid with the transfer reference, or
// reject it (the amount goes back to their balance)
export function PayoutActions({ id }: { id: string }) {
  const { busy, run } = useAct();
  const [num, setNum] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [why, setWhy] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      {num ? (
        <button
          type="button"
          className={`${btn} font-mono tabular-nums`}
          onClick={async () => {
            await navigator.clipboard.writeText(num).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {num} {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        </button>
      ) : (
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={async () => {
            const j = await act({ action: "account", id }).catch((e: Error) => {
              toast.error(e.message);
              return null;
            });
            if (j?.number) setNum(j.number);
          }}
        >
          Show account number
        </button>
      )}
      {rejecting ? (
        <form
          className="flex flex-wrap gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void run({ action: "reject_payout", id, note: why.trim() }, "Rejected: they've been told and the amount is back in their balance");
          }}
        >
          <input className={`${input} w-44`} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why (they see this)" minLength={3} maxLength={300} required autoFocus />
          <button className={btn} disabled={busy}>
            Reject
          </button>
          <button type="button" className={btn} onClick={() => setRejecting(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <form
          className="flex flex-wrap gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void run({ action: "paid", id, reference: ref.trim() }, "Marked paid: they've been emailed");
          }}
        >
          <input className={`${input} w-40`} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transfer reference" minLength={3} maxLength={120} required />
          <button className={btn} disabled={busy || ref.trim().length < 3}>
            {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
            Mark paid
          </button>
          <button type="button" className={btn} onClick={() => setRejecting(true)}>
            Reject
          </button>
        </form>
      )}
    </div>
  );
}

export function PostReview({ id, status }: { id: string; status: string }) {
  const { busy, run } = useAct();
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  if (asking)
    return (
      <form
        className="flex flex-wrap gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ action: "post", id, status: "rejected", note: note.trim() || undefined }, "Marked as needing changes");
          setAsking(false);
        }}
      >
        <input className={`${input} w-48`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to change (they see this)" maxLength={300} autoFocus />
        <button className={btn} disabled={busy}>
          Send
        </button>
        <button type="button" className={btn} onClick={() => setAsking(false)}>
          Cancel
        </button>
      </form>
    );
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "approved" ? (
        <button className={btn} disabled={busy} onClick={() => run({ action: "post", id, status: "approved" }, "Approved")}>
          Approve
        </button>
      ) : null}
      {status !== "rejected" ? (
        <button className={btn} disabled={busy} onClick={() => setAsking(true)}>
          Needs changes
        </button>
      ) : null}
    </div>
  );
}

// take a sign-up out of a creator's count (fraud, a test account) or put it back
export function ReferralToggle({ id, status }: { id: string; status: string }) {
  const { busy, run } = useAct();
  const [why, setWhy] = useState("");
  const [asking, setAsking] = useState(false);
  if (status === "rejected" || status === "duplicate")
    return (
      <button className={btn} disabled={busy} onClick={() => run({ action: "referral", id, status: "pending" }, "Counted again (it qualifies once it has a CV and a profile)")}>
        Count it
      </button>
    );
  if (asking)
    return (
      <form
        className="flex flex-wrap gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ action: "referral", id, status: "rejected", reason: why.trim() || undefined }, "Taken out of their count");
          setAsking(false);
        }}
      >
        <input className={`${input} w-40`} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Reason (they see it)" maxLength={200} autoFocus />
        <button className={btn} disabled={busy}>
          Remove
        </button>
        <button type="button" className={btn} onClick={() => setAsking(false)}>
          Cancel
        </button>
      </form>
    );
  return (
    <button className={btn} disabled={busy} onClick={() => setAsking(true)}>
      Don&apos;t count
    </button>
  );
}
