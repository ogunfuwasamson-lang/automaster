"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "@/lib/upload-client";

const ACCEPT = ".pdf,.doc,.docx,.txt,.md,image/png,image/jpeg,image/webp";

// upload one or more files as `kind`, plus (on phones) a camera button: a photo of a certificate is enough for
// the agents to read it. refreshes the page when done so checklists tick over.
export function UploadButtons({ userId, kind, label = "Upload", compact = false }: { userId: string; kind: string; label?: string; compact?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const router = useRouter();
  async function upload(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    let ok = 0;
    for (const f of files) {
      setBusy(f.name);
      const err = await uploadDocument(userId, f, kind);
      if (err) toast.error(err);
      else ok++;
    }
    setBusy(null);
    if (file.current) file.current.value = "";
    if (cam.current) cam.current.value = "";
    if (ok) toast.success(ok === 1 ? "Uploaded. Your agents are reading it." : `${ok} files uploaded. Your agents are reading them.`);
    router.refresh();
  }
  const btn = `inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface font-medium hover:bg-neutral-50 disabled:opacity-50 dark:hover:bg-neutral-800 ${compact ? "h-8 px-2.5 text-[13px]" : "h-10 px-3.5 text-[14px]"}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={btn} disabled={!!busy} onClick={() => file.current?.click()}>
        {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <FileUp className="size-3.5" aria-hidden />}
        {busy ? "Uploading…" : label}
      </button>
      {/* phones open the camera; on a computer this is the same file picker, so it's hidden there */}
      <button type="button" className={`${btn} sm:hidden`} disabled={!!busy} onClick={() => cam.current?.click()}>
        <Camera className="size-3.5" aria-hidden />
        Take a photo
      </button>
      <input ref={file} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} />
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files)} />
    </span>
  );
}

// the line under every upload: who sees the files, and that they can go
export function DocTrust({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12.5px] leading-relaxed text-muted ${className}`}>
      Only you and your agents can see your files. They&apos;re stored privately and encrypted, never shared with anyone but the schools you approve, and you can delete any of them in one click on{" "}
      <a href="/documents" className="underline decoration-current/30 underline-offset-4 hover:text-foreground">
        Documents
      </a>
      .
    </p>
  );
}
