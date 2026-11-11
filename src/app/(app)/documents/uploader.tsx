"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "@/lib/upload-client";
import { Select } from "@/components/ui/field";
import { DOC_KINDS } from "@/lib/doc-kinds";
import { DriveImport } from "./drive-import";

const KINDS = DOC_KINDS;

export function Uploader({ userId, pickerKey = "" }: { userId: string; pickerKey?: string }) {
  const [kind, setKind] = useState<string>("cv");
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    let ok = 0;
    for (const file of list) {
      setBusy(file.name);
      const err = await uploadDocument(userId, file, kind);
      if (err) toast.error(err);
      else ok++;
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    if (ok) toast.success(ok === 1 ? "Uploaded. Reading it now." : `${ok} files uploaded. Reading them now.`);
    router.refresh();
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        upload(e.dataTransfer.files);
      }}
      className={`rounded-3xl border-2 border-dashed p-6 transition-colors sm:p-8 ${over ? "border-accent bg-accent/[0.06]" : "border-accent/25 bg-surface shadow-card"}`}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="bg-hero-gradient grid size-14 place-items-center rounded-2xl text-white">
          <UploadCloud className={`size-6 ${busy ? "animate-bounce" : ""}`} aria-hidden />
        </span>
        <div>
          <p className="font-bold">{busy ? `Uploading ${busy}…` : "Drop files here"}</p>
          <p className="mt-0.5 text-sm text-muted">PDF, Word, images or text, up to 10 MB each</p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="What kind of document">
            {KINDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={!!busy}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-ink px-4 text-sm font-semibold text-on-ink shadow-[0_8px_20px_-6px_rgb(15_18_34/0.35)] disabled:opacity-45"
          >
            Choose files
          </button>
          <DriveImport userId={userId} kind={kind} onDone={() => router.refresh()} pickerKey={pickerKey} />
        </div>
        <input ref={input} type="file" multiple accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>
    </div>
  );
}
