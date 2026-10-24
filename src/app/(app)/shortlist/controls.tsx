"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Check, Plus, Radar, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

export function ReconButton({ running, hasRows }: { running: boolean; hasRows: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      disabled={busy || running}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/recon/start", { method: "POST" });
        if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't start the search");
        else toast.success("Recon is searching. New programs appear here as they're checked.");
        setBusy(false);
        router.refresh();
      }}
    >
      <Radar className={`size-4 ${running ? "animate-pulse" : ""}`} aria-hidden />
      {running ? "Searching…" : hasRows ? "Find more programs" : "Build my shortlist"}
    </Button>
  );
}

export function MoveButton({ id, to, label }: { id: string; to: "shortlisted" | "dropped"; label: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant={to === "dropped" ? "ghost" : "primary"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/applications/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: to }) });
        if (!res.ok) toast.error("Couldn't move it");
        else toast.success(to === "dropped" ? "Dropped" : "Added to your shortlist");
        router.refresh();
      }}
    >
      {to === "dropped" ? <X className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
      {label}
    </Button>
  );
}

export function AutoRefresh({ every }: { every: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [every, router]);
  return null;
}

export function ScholarshipButton({ running }: { running: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      disabled={busy || running}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/recon/scholarships", { method: "POST" });
        if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't start");
        else toast.success("Looking for scholarships that fit you");
        setBusy(false);
        router.refresh();
      }}
    >
      <Award className="size-4" aria-hidden />
      {running ? "Finding scholarships…" : "Find scholarships"}
    </Button>
  );
}

const DEGREES: Record<string, string[]> = {
  undergraduate: ["BA", "BSc", "BEng", "BBA", "Liberal arts", "Foundation year"],
  masters: ["MS / MSc", "MA", "MBA", "MiM", "MEng", "MPhil (research)", "MRes", "LLM", "MPP / MPA", "MFA", "MPH", "MEd"],
  phd: ["PhD", "DPhil", "MPhil/MRes route to PhD", "Professional doctorate (EdD, DBA)"],
};
const LEVELS: [string, string][] = [
  ["undergraduate", "Bachelor's"],
  ["masters", "Master's"],
  ["phd", "PhD"],
];

// where and what to study. saved straight to the profile; recon reads it on the next run.
export function Preferences({ regions, degreeTypes, allRegions, level, maxRegions }: { regions: string[]; degreeTypes: string[]; allRegions: Record<string, string>; level: string | null; maxRegions: number }) {
  const [lvl, setLvl] = useState<string>(level ?? "masters");
  const [sel, setSel] = useState<string[]>(regions);
  const [deg, setDeg] = useState<string[]>(degreeTypes);
  const [other, setOther] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const dirty =
    lvl !== (level ?? "masters") || JSON.stringify([...sel].sort()) !== JSON.stringify([...regions].sort()) || JSON.stringify([...deg].sort()) !== JSON.stringify([...degreeTypes].sort());
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const levelLabel = LEVELS.find(([k]) => k === (level ?? "masters"))?.[1];
  const summary = [levelLabel, regions.map((r) => allRegions[r] ?? r).join(", ") || "No regions yet"].join(" in ");

  return (
    <details className="group rounded-xl border border-line bg-surface" open={!regions.length}>
      <summary className="flex cursor-pointer select-none items-center gap-3 px-5 py-3.5">
        <SlidersHorizontal className="size-4 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">What recon searches for</span>
          <span className="block truncate text-sm text-muted">{summary}</span>
        </span>
        <span className="text-sm text-muted group-open:hidden">Change</span>
      </summary>
      <div className="space-y-5 border-t border-line px-5 py-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Level</legend>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map(([k, label]) => (
              <Chip
                key={k}
                on={lvl === k}
                onClick={() => {
                  setLvl(k);
                  setDeg(deg.filter((d) => DEGREES[k].includes(d)));
                }}
              >
                {label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Regions{maxRegions < 9 ? <span className="font-normal text-muted"> (up to {maxRegions} on your plan)</span> : null}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(allRegions).map(([k, label]) => (
              <Chip key={k} on={sel.includes(k)} onClick={() => toggle(sel, setSel, k)}>
                {label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Degrees you&apos;d consider</legend>
          <div className="flex flex-wrap items-center gap-1.5">
            {[...new Set([...DEGREES[lvl], ...deg])].map((d) => (
              <Chip key={d} on={deg.includes(d)} onClick={() => toggle(deg, setDeg, d)}>
                {d}
              </Chip>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = other.trim();
                if (v && !deg.includes(v)) setDeg([...deg, v]);
                setOther("");
              }}
            >
              <input
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="Add another"
                aria-label="Add another degree"
                className="h-8 w-32 rounded-full border border-dashed border-line bg-transparent px-3 text-[13px] outline-none focus:border-focus"
              />
            </form>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={!dirty || saving || !sel.length}
            onClick={async () => {
              setSaving(true);
              const res = await fetch("/api/profile/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ regions: sel, degree_types: deg, study_level: lvl }) });
              setSaving(false);
              if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't save");
              toast.success("Saved. Choose Find more programs to search these.");
              router.refresh();
            }}
          >
            <Check className="size-4" aria-hidden />
            {saving ? "Saving…" : "Save"}
          </Button>
          <span className="text-xs text-muted">{!sel.length ? "Pick at least one region." : "Recon searches each region from its top-ranked schools down."}</span>
        </div>
      </div>
    </details>
  );
}
