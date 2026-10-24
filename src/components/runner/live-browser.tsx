"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Hand, LoaderCircle, MonitorPlay, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// the live browser: the portal as the agents see it, streamed from the cloud. you can watch the agents work,
// take control for a step only you can do (a bot check, a payment), and hand back.
const VIEW = { width: 1280, height: 860 };
const KEYS = new Set([
  "Enter",
  "Backspace",
  "Tab",
  "Escape",
  "Delete",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

type Live = {
  status: "starting" | "agent" | "you" | "ended";
  prompt: string | null;
  url: string | null;
  seq: number;
  endsAt: string | null;
};
type In = {
  kind: "click" | "type" | "key" | "scroll" | "control";
  data: Record<string, unknown>;
};

export function LiveBrowser({
  applicationId,
  school,
  onClose,
}: {
  applicationId: string;
  school: string;
  onClose: () => void;
}) {
  const [id, setId] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(-1);
  const queue = useRef<In[]>([]);
  const typed = useRef("");
  const screen = useRef<HTMLDivElement>(null);

  // start (or join) the session
  useEffect(() => {
    let off = false;
    (async () => {
      const r = await fetch("/api/live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const j = await r.json().catch(() => ({}));
      if (off) return;
      if (!r.ok || !j.id) setError(j.error ?? "Couldn't open the live browser");
      else setId(j.id);
    })();
    return () => {
      off = true;
    };
  }, [applicationId]);

  // frames and status
  useEffect(() => {
    if (!id) return;
    let off = false;
    const tick = async () => {
      const r = await fetch(`/api/live/${id}?seq=${seq.current}`, {
        cache: "no-store",
      }).catch(() => null);
      const j = r && r.ok ? await r.json() : null;
      if (off) return;
      if (j) {
        if (j.frame) {
          setFrame(j.frame);
          seq.current = j.seq;
        }
        setLive(j);
        if (j.status === "ended") return;
      }
      setTimeout(tick, j?.status === "you" ? 450 : 800);
    };
    tick();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      off = true;
      clearInterval(clock);
    };
  }, [id]);

  // inputs go out in small batches
  const flush = useCallback(async () => {
    if (!id) return;
    if (typed.current) {
      queue.current.push({ kind: "type", data: { text: typed.current } });
      typed.current = "";
    }
    if (!queue.current.length) return;
    const inputs = queue.current.splice(0, 40);
    const r = await fetch(`/api/live/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs }),
    }).catch(() => null);
    if (r && r.status === 409)
      setLive((l) => (l ? { ...l, status: "ended" } : l));
  }, [id]);
  useEffect(() => {
    const t = setInterval(flush, 160);
    return () => clearInterval(t);
  }, [flush]);

  const send = (i: In) => queue.current.push(i);
  const control = async (action: "take" | "continue" | "end") => {
    send({ kind: "control", data: { action } });
    await flush();
    if (action === "end")
      toast.success("Closing the live browser. The agents carry on from here.");
  };

  const yours = live?.status === "you";
  const at = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - r.left) / r.width) * VIEW.width),
      y: Math.round(((e.clientY - r.top) / r.height) * VIEW.height),
    };
  };
  const left = live?.endsAt
    ? Math.max(0, Math.round((new Date(live.endsAt).getTime() - now) / 1000))
    : null;
  const ended = live?.status === "ended";

  if (typeof document === "undefined") return null;
  // rendered on <body>: page sections create their own stacking contexts and would trap it under the top bar
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_oklab,var(--ink)_55%,transparent)] p-2 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Live browser for ${school}`}
    >
      <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-2xl ${yours ? "bg-signal text-white" : "bg-accent/10 text-accent"}`}
          >
            {yours ? (
              <Hand className="size-4" aria-hidden />
            ) : live && !ended ? (
              <Sparkles className="size-4" aria-hidden />
            ) : (
              <MonitorPlay className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {ended
                ? "Live browser closed"
                : yours
                  ? "Your turn"
                  : live?.status === "agent"
                    ? "The agents are working"
                    : "Opening the live browser"}{" "}
              · {school}
            </p>
            <p className="truncate text-xs text-muted">
              {error ?? live?.prompt ?? "Starting a browser in the cloud…"}
            </p>
          </div>
          {left !== null && !ended ? (
            <span className="hidden shrink-0 text-xs tabular-nums text-muted sm:block">
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left
            </span>
          ) : null}
          <button
            onClick={() =>
              ended || error ? onClose() : control("end").then(onClose)
            }
            className="rounded-full p-2 text-muted hover:bg-background hover:text-foreground"
            aria-label="Close live browser"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-auto bg-background">
          <div
            ref={screen}
            tabIndex={0}
            className={`relative mx-auto aspect-[1280/860] w-full max-w-[1280px] outline-none ${yours ? "cursor-pointer ring-2 ring-inset ring-signal/60" : "cursor-default"}`}
            onClick={(e) => {
              screen.current?.focus();
              if (yours) send({ kind: "click", data: at(e) });
            }}
            onWheel={(e) =>
              yours &&
              send({ kind: "scroll", data: { dy: Math.round(e.deltaY) } })
            }
            onKeyDown={(e) => {
              if (!yours) return;
              if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
                typed.current += e.key;
                e.preventDefault();
              } else if (KEYS.has(e.key)) {
                if (typed.current) {
                  queue.current.push({
                    kind: "type",
                    data: { text: typed.current },
                  });
                  typed.current = "";
                }
                send({ kind: "key", data: { key: e.key } });
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              if (!yours) return;
              typed.current += e.clipboardData.getData("text").slice(0, 400);
              e.preventDefault();
            }}
          >
            {frame ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/jpeg;base64,${frame}`}
                alt={`The ${school} portal`}
                className="absolute inset-0 size-full select-none object-contain"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted">
                {error ? (
                  error
                ) : ended ? (
                  live?.prompt
                ) : (
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />{" "}
                    Starting a browser in the cloud…
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <p className="min-w-0 flex-1 text-xs text-muted">
            {yours
              ? "Click and type in the picture as you would on the portal. What you type goes straight to the portal and isn't kept."
              : "You can watch, or take control for a step only you can do. The agents never solve bot checks or enter card details."}
            {live?.url ? (
              <span className="mt-0.5 block truncate">{live.url}</span>
            ) : null}
          </p>
          {!ended && !error && live && live.status !== "starting" ? (
            yours ? (
              <Button onClick={() => control("continue")}>
                <Sparkles className="size-4" aria-hidden /> Hand back to agents
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => control("take")}>
                <Hand className="size-4" aria-hidden /> Take control
              </Button>
            )
          ) : null}
          {ended || error ? (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
