"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

const KINDS = [
  ["cv", "CV / resume"],
  ["transcript", "transcript"],
  ["degree_certificate", "degree certificate"],
  ["test_score", "test score report"],
  ["reference_letter", "reference letter"],
  ["old_essay", "old essay / SOP"],
  ["other", "other"],
] as const;

const MAX = 10 * 1024 * 1024;

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(-120) || "file";
}

export function Uploader({ userId }: { userId: string }) {
  const [kind, setKind] = useState<string>("cv");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    const sb = browserClient();
    for (const file of Array.from(files)) {
      if (file.size > MAX) {
        setErr(`${file.name} is over 10MB`);
        continue;
      }
      setBusy(file.name);
      const id = crypto.randomUUID();
      const path = `${userId}/${id}/${safeName(file.name)}`;
      const { error } = await sb.storage.from("documents").upload(path, file, { contentType: file.type || undefined });
      if (error) {
        setErr(`${file.name}: ${error.message}`);
        continue;
      }
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, kind, filename: file.name, storagePath: path, mime: file.type || "", size: file.size }),
      });
      if (!res.ok) setErr(`${file.name}: ${(await res.json().catch(() => ({}))).error ?? res.statusText}`);
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    router.refresh();
    // extraction takes ~20-60s; refresh a couple of times so status updates
    setTimeout(() => router.refresh(), 20000);
    setTimeout(() => router.refresh(), 60000);
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-neutral-500" htmlFor="kind">this is a</label>
        <select
          id="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        >
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button
          onClick={() => input.current?.click()}
          disabled={!!busy}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {busy ? `uploading ${busy}…` : "choose files"}
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
