"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ReconButton({ running, hasRows }: { running: boolean; hasRows: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={busy || running}
        onClick={async () => {
          setBusy(true);
          setErr("");
          const res = await fetch("/api/recon/start", { method: "POST" });
          if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
          setBusy(false);
          router.refresh();
        }}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {running ? "recon running…" : hasRows ? "find more programs" : "build my shortlist"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

export function MoveButton({ id, to, label }: { id: string; to: "shortlisted" | "dropped"; label: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/applications/${id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: to }),
        });
        router.refresh();
      }}
      className={`rounded-md px-2.5 py-1 text-xs disabled:opacity-50 ${
        to === "dropped" ? "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400" : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
      }`}
    >
      {label}
    </button>
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
    <button
      disabled={busy || running}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/recon/scholarships", { method: "POST" });
        setBusy(false);
        router.refresh();
      }}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
    >
      {running ? "hunting scholarships…" : "hunt scholarships"}
    </button>
  );
}

const DEGREES = ["MS / MSc", "MA", "MBA", "MiM", "MEng", "MPhil (research)", "MRes", "LLM", "MPP / MPA", "MFA", "MPH", "MEd"];

// where and what to study. saved straight to the profile; recon reads it on the next run.
export function Preferences({ regions, degreeTypes, allRegions }: { regions: string[]; degreeTypes: string[]; allRegions: Record<string, string> }) {
  const [sel, setSel] = useState<string[]>(regions);
  const [deg, setDeg] = useState<string[]>(degreeTypes);
  const [other, setOther] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const router = useRouter();
  const dirty = JSON.stringify([...sel].sort()) !== JSON.stringify([...regions].sort()) || JSON.stringify([...deg].sort()) !== JSON.stringify([...degreeTypes].sort());
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${on ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900" : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"}`;

  return (
    <section className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <p className="mb-2 text-sm font-medium">where do you want to study?</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(allRegions).map(([k, label]) => (
            <button key={k} onClick={() => toggle(sel, setSel, k)} className={chip(sel.includes(k))}>{label}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">which degrees would you consider?</p>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...DEGREES, ...deg])].map((d) => (
            <button key={d} onClick={() => toggle(deg, setDeg, d)} className={chip(deg.includes(d))}>{d}</button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = other.trim();
              if (v && !deg.includes(v)) setDeg([...deg, v]);
              setOther("");
            }}
          >
            <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="other…" className="w-28 rounded-full border border-dashed border-neutral-300 bg-transparent px-3 py-1 text-sm dark:border-neutral-700" />
          </form>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={!dirty || state === "saving" || !sel.length}
          onClick={async () => {
            setState("saving");
            await fetch("/api/profile/preferences", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ regions: sel, degree_types: deg }),
            });
            setState("saved");
            router.refresh();
          }}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {state === "saving" ? "saving…" : "save"}
        </button>
        <span className="text-xs text-neutral-500">
          {!sel.length ? "pick at least one region." : state === "saved" && !dirty ? "saved. run \"find more programs\" to search these." : "recon searches each region from its top-ranked schools down."}
        </span>
      </div>
    </section>
  );
}
