"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export interface Decision {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  payload: { topic?: string; options?: string[]; link?: string | null; due?: string | null };
}

const VERBS: Record<string, [string, string, string]> = {
  // kind: [approve label, decline label, toast after approve]
  record_decision: ["Record it", "Not right", "Recorded"],
  school_action: ["Done", "Dismiss", "Marked done"],
};

// one-tap items in the applicant's queue. source conflicts get their options as buttons plus "neither".
export function Decisions({ items }: { items: Decision[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>({});

  async function decide(id: string, decision: "approve" | "reject", choice?: string, done?: string) {
    setBusy(id);
    const res = await fetch(`/api/approvals/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, choice }) });
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't save that");
    else toast.success(decision === "approve" ? done ?? "Saved" : "Dismissed");
    setBusy(null);
    router.refresh();
  }

  if (!items.length) return null;
  return (
    <ul className="grid gap-2">
      {items.map((d) => {
        const [yes, no, done] = VERBS[d.kind] ?? ["Approve", "Decline", "Approved"];
        return (
          <li key={d.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-start">
            <span className="mt-1.5 hidden size-2 shrink-0 rounded-full bg-signal sm:block" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{d.title}</p>
              {d.summary && <p className="mt-0.5 text-sm text-muted">{d.summary}</p>}
              {d.payload.link && (
                <a href={d.payload.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-foreground underline underline-offset-4">
                  Open the email <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
              {d.kind === "fact_confirm" && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(d.payload.options ?? []).map((o) => (
                      <Button key={o} size="sm" variant="secondary" disabled={busy === d.id} onClick={() => decide(d.id, "approve", o, "Saved to your profile")} className="h-auto min-h-8 whitespace-normal py-1.5 text-left">
                        {o}
                      </Button>
                    ))}
                  </div>
                  <form
                    className="flex max-w-lg gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = custom[d.id]?.trim();
                      if (v) decide(d.id, "approve", v, "Saved to your profile");
                    }}
                  >
                    <Input value={custom[d.id] ?? ""} onChange={(e) => setCustom((c) => ({ ...c, [d.id]: e.target.value }))} placeholder="Neither. The right answer is…" className="h-8" />
                    <Button size="sm" disabled={busy === d.id || !custom[d.id]?.trim()}>Save</Button>
                  </form>
                </div>
              )}
            </div>
            {d.kind !== "fact_confirm" && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant={d.kind === "record_decision" ? "signal" : "primary"} disabled={busy === d.id} onClick={() => decide(d.id, "approve", undefined, done)}>{yes}</Button>
                <Button size="sm" variant="ghost" disabled={busy === d.id} onClick={() => decide(d.id, "reject")}>{no}</Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
