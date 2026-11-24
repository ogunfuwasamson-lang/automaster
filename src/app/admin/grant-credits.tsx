"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// staff: give one account credits from the console (api/admin/credits)
export function GrantCredits({ userId }: { userId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("10");
  const [days, setDays] = useState("0");
  const [note, setNote] = useState("");
  const [tell, setTell] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const field = "rounded-lg border border-line bg-surface px-3 py-1.5 text-[13.5px]";
  return (
    <form
      className="space-y-3 px-4 py-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch("/api/admin/credits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, amount: Number(amount), days: Number(days), note, tell }) }).catch(() => null);
        const data = (await res?.json().catch(() => ({}))) as { error?: string; balance?: number };
        setBusy(false);
        if (!res?.ok) return setMsg({ ok: false, text: data?.error ?? "That didn't go through. Try again." });
        setMsg({ ok: true, text: `Done. They now have ${data.balance} credits to use.` });
        setNote("");
        router.refresh();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-[12.5px] text-muted">
          Credits
          <input type="number" min={1} max={500} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} w-24 text-foreground`} />
        </label>
        <label className="grid gap-1 text-[12.5px] text-muted">
          Last for
          <select value={days} onChange={(e) => setDays(e.target.value)} className={`${field} text-foreground`}>
            <option value="0">Never expire</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
        <label className="grid min-w-[14rem] flex-1 gap-1 text-[12.5px] text-muted">
          Why (kept in the log)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Refund for a failed check" maxLength={200} className={`${field} text-foreground`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} />
          Tell them in their notifications
        </label>
        <button disabled={busy || note.trim().length < 3} className="tap rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-on-ink disabled:opacity-50">
          {busy ? "Giving" : `Give ${Number(amount) || 0} credits`}
        </button>
        {msg && <span className={`text-[13px] ${msg.ok ? "text-go" : "text-stop"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
