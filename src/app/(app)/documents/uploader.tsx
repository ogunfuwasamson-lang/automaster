"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "@/lib/upload-client";
import { Select } from "@/components/ui/field";
import { DOC_KINDS } from "@/lib/doc-kinds";

const KINDS = DOC_KINDS;

export function Uploader({ userId }: { userId: string }) {
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
      className={`rounded-2xl border-2 border-dashed p-6 transition-colors sm:p-8 ${over ? "border-foreground bg-neutral-100 dark:bg-neutral-900" : "border-line bg-surface"}`}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <UploadCloud className={`size-5 ${busy ? "animate-bounce" : ""}`} aria-hidden />
        </span>
        <div>
          <p className="font-medium">{busy ? `Uploading ${busy}…` : "Drop files here"}</p>
          <p className="mt-0.5 text-sm text-muted">PDF, Word, images or text, up to 10 MB each</p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
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
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-neutral-700 disabled:opacity-45 dark:hover:bg-neutral-200"
          >
            Choose files
          </button>
        </div>
        <input ref={input} type="file" multiple accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>
    </div>
  );
}
