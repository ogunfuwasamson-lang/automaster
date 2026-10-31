"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { TriangleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// a destructive action that can't be undone: says exactly what goes, and asks the person to type a word first
export function ConfirmDelete({
  trigger,
  title,
  lines,
  word,
  action,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  lines: string[];
  word: string;
  action: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = typed.trim().toLowerCase() === word.toLowerCase();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        setOpen(o);
        if (!o) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 shadow-lift">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-stop/10 text-stop">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="font-serif text-[21px] leading-snug">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13.5px] text-muted">This can&apos;t be undone.</Dialog.Description>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-[14px] leading-relaxed">
            {lines.map((l) => (
              <li key={l} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-stop/60" aria-hidden />
                {l}
              </li>
            ))}
          </ul>
          <label className="mt-5 block text-[13px] text-muted">
            Type <span className="font-semibold text-foreground">{word}</span> to confirm
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-background px-3 text-[14px] text-foreground outline-none focus:border-neutral-400"
              autoComplete="off"
            />
          </label>
          {error && <p className="mt-2 text-[13px] text-stop">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>
                Keep it
              </Button>
            </Dialog.Close>
            <Button
              variant="danger"
              disabled={!ok || busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onConfirm();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
                  setBusy(false);
                }
              }}
            >
              {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {action}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
