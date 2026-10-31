"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, MessagesSquare, X } from "lucide-react";
import { Interview } from "@/app/(app)/interview/interview";

type History = { sessionId: string | null; turns: { role: "agent" | "user"; content: string }[]; completeness: number };
type Question = { id: string; question: string; school: string | null; applicationId: string | null };

const SEEN = "am.q.seen";
const seen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN) ?? "[]");
  } catch {
    return [];
  }
};
const markSeen = (ids: string[]) => {
  try {
    localStorage.setItem(SEEN, JSON.stringify([...new Set([...seen(), ...ids])].slice(-200)));
  } catch {
    /* private mode */
  }
};

// the interviewer lives in a panel that opens from any page: a floating button, or any link with ?chat=open.
// it also pops up by itself when an agent stops on a portal question the profile doesn't answer.
export function ChatDock() {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<History | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [kickoff, setKickoff] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  // opened from the last step of setup: closing the panel, finished or not, starts the agents
  const fromSetup = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/interview/history");
    if (res.ok) setHist(await res.json());
  }, []);

  // what the agents are waiting on; a question nobody has seen yet opens the panel
  const check = useCallback(
    async (allowPop: boolean) => {
      const r = await fetch("/api/questions", { cache: "no-store" }).catch(() => null);
      if (!r?.ok) return;
      const qs = ((await r.json()).questions ?? []) as Question[];
      setQuestions(qs);
      const fresh = qs.filter((q) => !seen().includes(q.id));
      if (allowPop && fresh.length && !open && !path.startsWith("/onboarding")) {
        markSeen(qs.map((q) => q.id));
        setKickoff(true);
        setHist(null);
        setOpen(true);
      }
    },
    [open, path],
  );

  useEffect(() => {
    void check(true);
    const t = setInterval(() => void check(true), 60_000);
    return () => clearInterval(t);
  }, [check]);

  useEffect(() => {
    if (params.get("chat") === "open") {
      const said = params.get("say");
      setSay(said || null);
      if (params.get("setup") === "1") fromSetup.current = true;
      setKickoff(!!said || questions.length > 0);
      if (said) setHist(null);
      setOpen(true);
      // drop the flag so a refresh or back doesn't reopen it
      const next = new URLSearchParams(params);
      next.delete("chat");
      next.delete("say");
      next.delete("setup");
      router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
    }
  }, [params, path, router, questions.length]);

  useEffect(() => {
    if (open && !hist) void load();
  }, [open, hist, load]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setKickoff(questions.length > 0);
        if (!o) {
          setKickoff(false);
          setSay(null);
          markSeen(questions.map((q) => q.id));
          void check(false);
          if (fromSetup.current) {
            fromSetup.current = false;
            void fetch("/api/onboarding/kickoff", { method: "POST" }).finally(() => router.refresh());
          } else router.refresh(); // the interview may have filled the profile
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          hidden={path.startsWith("/messages")}
          className="bg-hero-gradient fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] right-4 z-30 flex items-center gap-2 rounded-full py-3 pl-3.5 pr-4 text-sm font-medium text-white shadow-lift transition-opacity hover:opacity-90 lg:bottom-8 lg:right-8"
          aria-label={questions.length ? `Ivyward AI: ${questions.length} questions waiting` : "Ivyward AI"}
        >
          <MessagesSquare className="size-5" aria-hidden />
          <span className="hidden sm:inline">Ivyward AI</span>
          {questions.length > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-signal px-1.5 text-[11px] font-bold leading-5 text-white">{questions.length}</span>}
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
                className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-lift sm:inset-y-3 sm:right-3 sm:w-[30rem] sm:rounded-2xl sm:border sm:border-line"
                initial={{ x: "105%" }}
                animate={{ x: 0 }}
                exit={{ x: "105%" }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
              >
                <Dialog.Title className="sr-only">Ivyward AI</Dialog.Title>
                <Dialog.Close className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-xl text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800" aria-label="Close">
                  <X className="size-5" />
                </Dialog.Close>
                {hist ? (
                  <Interview embedded kickoff={kickoff} say={say} waiting={questions} onTurn={() => void check(false)} initialSessionId={hist.sessionId} initialTurns={hist.turns} initialCompleteness={hist.completeness} />
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
