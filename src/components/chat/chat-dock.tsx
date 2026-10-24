"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, MessagesSquare, X } from "lucide-react";
import { Interview } from "@/app/(app)/interview/interview";

type History = { sessionId: string | null; turns: { role: "agent" | "user"; content: string }[]; completeness: number };

// the interviewer lives in a panel that opens from any page: a floating button, or any link with ?chat=open
export function ChatDock() {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<History | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/interview/history");
    if (res.ok) setHist(await res.json());
  }, []);

  useEffect(() => {
    if (params.get("chat") === "open") {
      setOpen(true);
      // drop the flag so a refresh or back doesn't reopen it
      const next = new URLSearchParams(params);
      next.delete("chat");
      router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
    }
  }, [params, path, router]);

  useEffect(() => {
    if (open && !hist) void load();
  }, [open, hist, load]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) router.refresh(); // the interview may have filled the profile
      }}
    >
      <Dialog.Trigger asChild>
        <button
          className="bg-hero-gradient fixed bottom-[calc(env(safe-area-inset-bottom)+92px)] right-4 z-30 flex items-center gap-2 rounded-full py-3 pl-3.5 pr-4 text-sm font-bold text-white shadow-[0_16px_36px_-10px_rgb(79_70_229/0.7)] transition-transform hover:-translate-y-0.5 lg:bottom-8 lg:right-8"
          aria-label="Talk to your interviewer"
        >
          <MessagesSquare className="size-5" aria-hidden />
          <span className="hidden sm:inline">Interviewer</span>
        </button>
      </Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-[#0f1222]/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-lift sm:inset-y-3 sm:right-3 sm:w-[30rem] sm:rounded-[28px] sm:border sm:border-line"
                initial={{ x: "105%" }}
                animate={{ x: 0 }}
                exit={{ x: "105%" }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
              >
                <Dialog.Title className="sr-only">Interviewer</Dialog.Title>
                <Dialog.Close className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-xl text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800" aria-label="Close">
                  <X className="size-5" />
                </Dialog.Close>
                {hist ? (
                  <Interview embedded initialSessionId={hist.sessionId} initialTurns={hist.turns} initialCompleteness={hist.completeness} />
                ) : (
                  <div className="grid flex-1 place-items-center text-muted">
                    <LoaderCircle className="size-6 animate-spin" aria-label="Loading" />
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
