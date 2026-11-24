"use client";
import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { ShareProps } from "@/lib/share-school";

// share one programme with a friend: the card, the text (to copy or send on whatsapp) and the image for a status.
// every share is counted (/api/share); nothing about the applicant goes in it.

const log = (programId: string, channel: string) => {
  fetch("/api/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ programId, channel }), keepalive: true }).catch(() => {});
};

const fileName = (school: string) => `ivyward-${school.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}.png`;

export function ShareDialog({ s, trigger, open, onOpenChange, onShared }: { s: ShareProps; trigger?: ReactNode; open?: boolean; onOpenChange?: (o: boolean) => void; onShared?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => setNative(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);
  const done = (channel: string) => {
    log(s.programId, channel);
    onShared?.();
  };
  const copy = async () => {
    await navigator.clipboard.writeText(s.text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    done("copy");
  };
  // on a phone, the share sheet takes the image straight to whatsapp status or instagram; elsewhere it downloads
  const saveImage = async () => {
    setSaving(true);
    try {
      const blob = await fetch(s.cardUrl).then((r) => r.blob());
      const file = new File([blob], fileName(s.school), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: s.text }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      done("image");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-lift sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="font-serif text-[22px] leading-snug">Share {s.school}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13.5px] leading-snug text-muted">The programme&apos;s details and a link to apply. If your friend joins through it and finishes setup, you both get one application free.</Dialog.Description>
            </div>
            <Dialog.Close className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800" aria-label="Close">
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.cardUrl} alt={`Card for ${s.school}${s.program ? `, ${s.program}` : ""}`} width={1080} height={1350} className="mx-auto mt-5 aspect-[4/5] w-44 rounded-xl border border-line object-cover shadow-card sm:w-52" />

          <label className="mt-5 block text-[13px] font-medium" htmlFor={`share-${s.programId}`}>
            Message
          </label>
          <textarea id={`share-${s.programId}`} readOnly value={s.text} rows={9} className="mt-1.5 w-full resize-none rounded-xl border border-line bg-background p-3 text-[13.5px] leading-relaxed" onFocus={(e) => e.currentTarget.select()} />

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(s.text)}`} target="_blank" rel="noopener" onClick={() => done("whatsapp")} className={buttonClass("primary", "md", "w-full")}>
              Send on WhatsApp
            </a>
            <button type="button" onClick={copy} className={buttonClass("secondary", "md", "w-full")}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy message"}
            </button>
            <button type="button" onClick={saveImage} disabled={saving} className={buttonClass("secondary", "md", "w-full")}>
              <Download className="size-4" aria-hidden />
              {saving ? "Getting the image" : "Save image for a status"}
            </button>
            {native && (
              <button
                type="button"
                onClick={() => {
                  navigator.share({ title: s.school, text: s.text }).then(() => done("native"), () => {});
                }}
                className={buttonClass("ghost", "md", "w-full")}
              >
                <Share2 className="size-4" aria-hidden /> More ways to share
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// the share button on a programme or an application ("pill" sits with the application page's small actions)
export function ShareButton({ s, label = "Share", size = "sm", pill = false }: { s: ShareProps; label?: string; size?: "sm" | "md"; pill?: boolean }) {
  return (
    <ShareDialog
      s={s}
      trigger={
        <button type="button" className={pill ? "tap inline-flex items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900" : buttonClass("secondary", size)}>
          <Share2 className="size-3.5" aria-hidden /> {label}
        </button>
      }
    />
  );
}

// the one-time ask: at the shortlist, and after signing or submitting. "Not now" or a share puts it away for good
// (on this browser).
export function ShareAsk({ s, storageKey, title, body }: { s: ShareProps; storageKey: string; title: string; body: string }) {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setShow(!localStorage.getItem(storageKey));
    } catch {
      setShow(true);
    }
  }, [storageKey]);
  const away = () => {
    setShow(false);
    try {
      localStorage.setItem(storageKey, new Date().toISOString());
    } catch {}
  };
  if (!show) return null;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--brand)_10%,var(--surface))] text-brand">
        <Share2 className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[19px] leading-snug">{title}</p>
        <p className="mt-1 text-[13.5px] leading-snug text-muted">{body}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={away} className={buttonClass("ghost", "sm")}>
          Not now
        </button>
        <ShareDialog
          s={s}
          open={open}
          onOpenChange={setOpen}
          onShared={away}
          trigger={
            <button type="button" className={buttonClass("primary", "sm")}>
              Share {s.school.length > 28 ? "it" : s.school}
            </button>
          }
        />
      </div>
    </div>
  );
}
