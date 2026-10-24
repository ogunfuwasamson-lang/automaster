"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PORTAL_DETAIL_FIELDS, type PortalDetails, type RecommenderRow } from "@/lib/portal-fields";

const input = "w-full rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm dark:border-neutral-700";
const blankRec = (): RecommenderRow => ({ name: "", email: "", title: "", organization: "", relationship: "", phone: "" });

// what application portals ask that the study profile doesn't cover. the runner fills forms from this.
export function PortalDetailsForm({ details, recommenders }: { details: PortalDetails; recommenders: RecommenderRow[] }) {
  const [d, setD] = useState<PortalDetails>(details);
  const [recs, setRecs] = useState<RecommenderRow[]>(recommenders.length ? recommenders : [blankRec()]);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [err, setErr] = useState("");
  const router = useRouter();
  const setRec = (i: number, k: keyof RecommenderRow, v: string) => {
    setRecs(recs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    setState("idle");
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {PORTAL_DETAIL_FIELDS.map((f) => (
          <label key={f.key} className="space-y-1 text-xs text-neutral-500">
            <span>{f.label}{f.required ? " *" : ""}</span>
            <input
              type={f.type ?? "text"}
              value={(d[f.key] as string | null | undefined) ?? ""}
              onChange={(e) => {
                setD({ ...d, [f.key]: e.target.value });
                setState("idle");
              }}
              className={input}
            />
          </label>
        ))}
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium">recommenders</p>
        {recs.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-3 dark:border-neutral-800">
            {(["name", "email", "title", "organization", "relationship", "phone"] as const).map((k) => (
              <input key={k} value={r[k] ?? ""} onChange={(e) => setRec(i, k, e.target.value)} placeholder={k} className={input} />
            ))}
            <button onClick={() => setRecs(recs.filter((_, j) => j !== i))} className="justify-self-start text-xs text-neutral-500 underline">remove</button>
          </div>
        ))}
        {recs.length < 6 && <button onClick={() => setRecs([...recs, blankRec()])} className="text-sm underline">add a recommender</button>}
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={state === "saving"}
          onClick={async () => {
            setState("saving");
            setErr("");
            const res = await fetch("/api/profile/details", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ details: d, recommenders: recs.filter((r) => r.name.trim()) }),
            });
            if (!res.ok) {
              setErr((await res.json().catch(() => ({}))).error ?? "failed");
              setState("idle");
              return;
            }
            setState("saved");
            router.refresh();
          }}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {state === "saving" ? "saving…" : state === "saved" ? "saved" : "save"}
        </button>
        <span className="text-xs text-neutral-500">{err ? <span className="text-red-600">{err}</span> : "passport and id numbers are never stored; the runner leaves those fields for you."}</span>
      </div>
    </div>
  );
}
