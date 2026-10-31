"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ClipboardPaste, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// paste a school's email: the follow-up engine registers for the event, claims the waiver or fills the form, and
// puts dates in the calendar, exactly as for emails it reads from a connected Gmail
export function PasteEmail({ schools }: { schools: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [app, setApp] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <Dialog.Trigger asChild>
        <Button variant="secondary">
          <ClipboardPaste className="size-4" aria-hidden /> Paste a school email
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 shadow-lift">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-serif text-[21px]">Paste an email from a school</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13.5px] text-muted">
                A webinar invite, a fee-waiver offer, a form to fill. Ivyward AI opens the links and does it for you, and puts any dates in your calendar. Copy the whole email, links included.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-muted hover:text-foreground" aria-label="Close">
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          {schools.length > 0 && (
            <label className="mt-4 block text-[13px] text-muted">
              Which school sent it?
              <select value={app} onChange={(e) => setApp(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-[14px] text-foreground">
                <option value="">Not sure / another school</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Paste the email here…" className="mt-4 w-full resize-y rounded-lg border border-line bg-background p-3 text-[14px] outline-none focus:border-neutral-400" />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              disabled={busy || text.trim().length < 20}
              onClick={async () => {
                setBusy(true);
                const r = await fetch("/api/followups/paste", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, applicationId: app || null }) });
                const j = (await r.json().catch(() => ({}))) as { found?: number; error?: string };
                setBusy(false);
                if (!r.ok) return toast.error(j.error ?? "Couldn't read that email");
                toast.success(j.found ? `Ivyward AI is on ${j.found === 1 ? "it" : `${j.found} things from it`}. Check your notifications.` : "Nothing in it to act on. Ask Ivyward AI if you think that's wrong.");
                setText("");
                setOpen(false);
                router.refresh();
              }}
            >
              {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              Hand it to Ivyward AI
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
