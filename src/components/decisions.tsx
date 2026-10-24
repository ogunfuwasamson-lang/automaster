"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Decision {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  payload: { topic?: string; options?: string[] };
}

// one-tap queue items. fact conflicts get their options as buttons plus a free-text escape hatch.
export function Decisions({ items }: { items: Decision[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  async function decide(id: string, decision: "approve" | "reject", choice?: string) {
    setBusy(id);
    setErr("");
    const res = await fetch(`/api/approvals/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, choice }),
    });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
    setBusy(null);
    router.refresh();
  }

  if (!items.length) return null;
  return (
    <div className="space-y-3">
      {items.map((d) => (
        <div key={d.id} className="rounded-md border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium">{d.title}</p>
          {d.summary && <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{d.summary}</p>}
          {d.kind === "fact_confirm" ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {(d.payload.options ?? []).map((o) => (
                  <button
                    key={o}
                    disabled={busy === d.id}
                    onClick={() => decide(d.id, "approve", o)}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-left text-sm hover:border-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-100"
                  >
                    {o}
                  </button>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = custom[d.id]?.trim();
                  if (v) decide(d.id, "approve", v);
                }}
              >
                <input
                  value={custom[d.id] ?? ""}
                  onChange={(e) => setCustom((c) => ({ ...c, [d.id]: e.target.value }))}
                  placeholder="neither, the correct value is…"
                  className="flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
                />
                <button disabled={busy === d.id || !custom[d.id]?.trim()} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900">
                  save
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button disabled={busy === d.id} onClick={() => decide(d.id, "approve")} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900">
                approve
              </button>
              <button disabled={busy === d.id} onClick={() => decide(d.id, "reject")} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700">
                reject
              </button>
            </div>
          )}
        </div>
      ))}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
