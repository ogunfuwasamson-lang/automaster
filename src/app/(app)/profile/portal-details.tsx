"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PORTAL_DETAIL_FIELDS, type PortalDetails, type RecommenderRow } from "@/lib/portal-fields";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const blankRec = (): RecommenderRow => ({ name: "", email: "", title: "", organization: "", relationship: "", phone: "" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const REC_FIELDS: [keyof RecommenderRow, string, string?][] = [
  ["name", "Name"],
  ["email", "Email", "email"],
  ["title", "Job title"],
  ["organization", "Organization"],
  ["relationship", "How they know you"],
  ["phone", "Phone", "tel"],
];

// what application portals ask that the study profile doesn't cover. the runner fills forms from this.
export function PortalDetailsForm({ details, recommenders }: { details: PortalDetails; recommenders: RecommenderRow[] }) {
  const [d, setD] = useState<PortalDetails>(details);
  const [recs, setRecs] = useState<RecommenderRow[]>(recommenders.length ? recommenders : [blankRec()]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const setRec = (i: number, k: keyof RecommenderRow, v: string) => {
    setRecs(recs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    setDirty(true);
  };

  return (
    <form
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch("/api/profile/details", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ details: d, recommenders: recs.filter((r) => r.name.trim()) }),
        });
        setSaving(false);
        if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't save");
        setDirty(false);
        toast.success("Saved. The agents use these on every form.");
        router.refresh();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {PORTAL_DETAIL_FIELDS.map((f) => (
          <Field key={f.key} label={`${cap(f.label)}${f.required ? "" : " (optional)"}`}>
            <Input
              type={f.type ?? "text"}
              required={false}
              value={(d[f.key] as string | null | undefined) ?? ""}
              onChange={(e) => {
                setD({ ...d, [f.key]: e.target.value });
                setDirty(true);
              }}
            />
          </Field>
        ))}
      </div>

      <fieldset className="space-y-3">
        <legend className="font-semibold">Recommenders</legend>
        <p className="-mt-1 text-sm text-muted">Portals email them a link to upload their letter. Tell them it&apos;s coming.</p>
        {recs.map((r, i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{r.name.trim() || `Recommender ${i + 1}`}</span>
              <button
                type="button"
                onClick={() => {
                  setRecs(recs.filter((_, j) => j !== i));
                  setDirty(true);
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-neutral-100 hover:text-stop dark:hover:bg-neutral-800"
              >
                <Trash2 className="size-3.5" aria-hidden /> Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {REC_FIELDS.map(([k, label, type]) => (
                <Field key={k} label={label}>
                  <Input type={type ?? "text"} value={r[k] ?? ""} onChange={(e) => setRec(i, k, e.target.value)} />
                </Field>
              ))}
            </div>
          </div>
        ))}
        {recs.length < 6 && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setRecs([...recs, blankRec()])}>
            <Plus className="size-3.5" aria-hidden /> Add a recommender
          </Button>
        )}
      </fieldset>

      <div className="sticky bottom-20 flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface shadow-card/95 p-3 backdrop-blur md:bottom-4">
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? "Saving…" : dirty ? "Save details" : "Saved"}
        </Button>
        <span className="text-xs text-muted">Passport and ID numbers are never stored. The agents leave those fields for you.</span>
      </div>
    </form>
  );
}
