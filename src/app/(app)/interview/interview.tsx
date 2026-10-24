"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import * as Popover from "@radix-ui/react-popover";
import { ArrowUp, MessagesSquare, Mic, RotateCcw, Settings2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

type Turn = { role: "agent" | "user"; content: string };
type Phase = "idle" | "listening" | "thinking" | "speaking";

// minimal typing for the web speech api (not in the ts dom lib everywhere)
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function load<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// best-sounding english voices first; browsers ship very different sets
function rankVoice(v: SpeechSynthesisVoice) {
  const n = v.name.toLowerCase();
  let s = 0;
  if (!v.lang.toLowerCase().startsWith("en")) return -100;
  if (/natural|neural|online/.test(n)) s += 50;
  if (/google/.test(n)) s += 30;
  if (/premium|enhanced/.test(n)) s += 25;
  if (/samantha|aria|jenny|guy|daniel|serena/.test(n)) s += 10;
  if (/en-ng|nigeria/.test(v.lang.toLowerCase() + n)) s += 5;
  if (v.localService === false) s += 5;
  return s;
}

const LANGS = [
  ["en-NG", "English (Nigeria)"],
  ["en-US", "English (US)"],
  ["en-GB", "English (UK)"],
] as const;

export function Interview({
  initialSessionId,
  initialTurns,
  initialCompleteness,
  embedded = false,
}: {
  initialSessionId: string | null;
  initialTurns: Turn[];
  initialCompleteness: number;
  embedded?: boolean; // inside the chat panel: fills it, no page chrome
}) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [pct, setPct] = useState(initialCompleteness);
  const [phase, setPhase] = useState<Phase>("idle");
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [voiceOk, setVoiceOk] = useState(false);
  const [speak, setSpeak] = useState(true);
  const [handsFree, setHandsFree] = useState(true);
  const [lang, setLang] = useState("en-NG");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [pauseMs, setPauseMs] = useState(3000);

  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  // refs so callbacks created once (speech events) always see current values
  const settings = useRef({ speak, handsFree, lang, voiceName, voiceOk, voices, pauseMs });
  settings.current = { speak, handsFree, lang, voiceName, voiceOk, voices, pauseMs };
  const sendRef = useRef<(text: string | null, viaVoice: boolean) => Promise<void>>(async () => {});
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceOk(!!getRecognition());
    setSpeak(load("am.speak", "1") === "1");
    setHandsFree(load("am.handsfree", "1") === "1");
    setLang(load("am.lang", "en-NG"));
    setVoiceName(load("am.voice", ""));
    setPauseMs(parseInt(load("am.pause", "3000"), 10) || 3000);
    const synth = window.speechSynthesis;
    if (!synth) return;
    const refresh = () => {
      const list = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en")).sort((a, b) => rankVoice(b) - rankVoice(a));
      setVoices(list);
    };
    refresh();
    synth.addEventListener?.("voiceschanged", refresh);
    return () => synth.removeEventListener?.("voiceschanged", refresh);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, phase, interim]);

  // ---- listening ----------------------------------------------------------
  // we never let the browser decide when you're done: recognition runs continuously and
  // we send only after YOUR chosen pause length with no new words (or when you tap).
  // browsers end long sessions on their own; we quietly restart and keep what you said.
  const wantRef = useRef(false);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    if (idleRef.current) clearTimeout(idleRef.current);
    silenceRef.current = idleRef.current = null;
  };

  const finish = useCallback((send: boolean) => {
    wantRef.current = false;
    clearTimers();
    const text = (finalRef.current + " " + interimRef.current).replace(/\s+/g, " ").trim();
    finalRef.current = "";
    interimRef.current = "";
    setInterim("");
    try {
      recRef.current?.stop();
    } catch {}
    recRef.current = null;
    if (send && text) void sendRef.current(text, true);
    else setPhase((p) => (p === "listening" ? "idle" : p));
  }, []);

  const armSilence = useCallback(() => {
    if (!settings.current.handsFree) return;
    if (silenceRef.current) clearTimeout(silenceRef.current);
    silenceRef.current = setTimeout(() => finish(true), settings.current.pauseMs);
  }, [finish]);

  const startListening = useCallback(
    (fresh = true) => {
      const Ctor = getRecognition();
      if (!Ctor) return;
      window.speechSynthesis?.cancel();
      try {
        recRef.current?.abort();
      } catch {}
      const rec = new Ctor();
      rec.lang = settings.current.lang;
      rec.interimResults = true;
      rec.continuous = true;
      if (fresh) {
        finalRef.current = "";
        interimRef.current = "";
        setInterim("");
        // nobody spoke for a long while: stop listening rather than hold the mic forever
        if (idleRef.current) clearTimeout(idleRef.current);
        idleRef.current = setTimeout(() => {
          if (!(finalRef.current + interimRef.current).trim()) finish(false);
        }, 45_000);
      }
      wantRef.current = true;
      rec.onresult = (e) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalRef.current += r[0].transcript + " ";
          else live += r[0].transcript;
        }
        interimRef.current = live;
        setInterim((finalRef.current + live).trim());
        armSilence();
      };
      rec.onerror = (e) => {
        if (e.error === "language-not-supported" && settings.current.lang !== "en-US") {
          setLang("en-US");
          save("am.lang", "en-US");
          setErr("Your browser doesn't support that accent setting, so it switched to English (US). Tap the mic again.");
          wantRef.current = false;
        } else if (e.error === "not-allowed") {
          setErr("The microphone is blocked. Allow mic access for this site in your browser settings.");
          wantRef.current = false;
        } else if (e.error !== "aborted" && e.error !== "no-speech") {
          setErr(`Microphone problem: ${e.error}`);
        }
      };
      rec.onend = () => {
        if (recRef.current !== rec) return;
        if (wantRef.current) {
          // browser cut the session; keep the words and carry on
          finalRef.current += interimRef.current ? interimRef.current + " " : "";
          interimRef.current = "";
          startListening(false);
        } else {
          setPhase((p) => (p === "listening" ? "idle" : p));
        }
      };
      recRef.current = rec;
      setErr("");
      setPhase("listening");
      try {
        rec.start();
      } catch {
        setPhase("idle");
      }
    },
    [armSilence, finish],
  );

  function stopAndSend() {
    finish(true);
  }

  // ---- speaking -----------------------------------------------------------
  const say = useCallback(
    (text: string, then: () => void) => {
      const synth = window.speechSynthesis;
      if (!settings.current.speak || !synth) return then();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const vs = settings.current.voices;
      const v = vs.find((x) => x.name === settings.current.voiceName) ?? vs[0];
      if (v) u.voice = v;
      u.rate = 1.02;
      u.onend = then;
      u.onerror = () => then();
      setPhase("speaking");
      synth.speak(u);
    },
    [],
  );

  // ---- turn ---------------------------------------------------------------
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;

  async function send(text: string | null, viaVoice: boolean) {
    setErr("");
    if (text) setTurns((t) => [...t, { role: "user", content: text }]);
    setPhase("thinking");
    try {
      const res = await fetch("/api/interview/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionRef.current, text, viaVoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setSessionId(data.sessionId);
      setTurns((t) => [...t, { role: "agent", content: data.reply }]);
      setPct(data.completeness);
      say(data.reply, () => {
        if (settings.current.handsFree && settings.current.voiceOk && !data.wrapUp) startListening(true);
        else setPhase("idle");
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  sendRef.current = send;

  function micTap() {
    if (phase === "listening") return stopAndSend();
    if (phase === "thinking") return;
    startListening(true); // also interrupts speech
  }

  const started = turns.length > 0;
  const toggle = (key: string, value: boolean, set: (b: boolean) => void) => {
    set(value);
    save(key, value ? "1" : "0");
    if (key === "am.speak" && !value) window.speechSynthesis?.cancel();
  };

  const status =
    phase === "listening"
      ? handsFree
        ? `Listening. Sends after a ${pauseMs / 1000} second pause, or tap to send now.`
        : "Listening. Tap to send."
      : phase === "speaking"
        ? "Speaking. Tap the mic to interrupt."
        : phase === "thinking"
          ? "Thinking…"
          : "";

  return (
    <div className={embedded ? "flex h-full min-h-0 flex-col px-4 pt-4 sm:px-6" : "mx-auto flex min-h-[calc(100dvh-13rem)] max-w-3xl flex-col rounded-[28px] border border-line bg-surface px-4 pt-6 shadow-card sm:px-8 sm:pt-8 lg:min-h-[calc(100dvh-10rem)]"}>
      <header className={`flex flex-wrap items-end justify-between gap-3 pb-4 ${embedded ? "pr-10" : ""}`}>
        <div>
          {embedded ? <h2 className="text-lg font-bold tracking-[-0.03em]">Your interviewer</h2> : <h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Interview</h1>}
          <div className={`flex items-center gap-3 text-sm text-muted ${embedded ? "mt-1.5" : "mt-3"}`}>
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <span className="block h-full rounded-full bg-bar-gradient transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </span>
            Profile {pct}% complete
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button variant="ghost" size="sm" aria-label="Voice settings">
                <Settings2 className="size-4" aria-hidden />
                Voice
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" sideOffset={6} className="z-[70] w-80 space-y-4 rounded-3xl border border-line bg-surface shadow-card p-4 text-sm shadow-lg">
                <label className="flex items-center justify-between gap-3">
                  Read replies out loud
                  <input type="checkbox" className="size-4 accent-[var(--color-foreground)]" checked={speak} onChange={(e) => toggle("am.speak", e.target.checked, setSpeak)} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>
                    Hands-free
                    <span className="block text-xs text-muted">Listens again after it speaks</span>
                  </span>
                  <input type="checkbox" className="size-4 accent-[var(--color-foreground)]" checked={handsFree} onChange={(e) => toggle("am.handsfree", e.target.checked, setHandsFree)} />
                </label>
                <Field label="Send after you pause for">
                  <Select
                    value={pauseMs}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setPauseMs(v);
                      save("am.pause", String(v));
                    }}
                  >
                    {[2000, 3000, 4000, 6000, 8000].map((ms) => (
                      <option key={ms} value={ms}>
                        {ms / 1000} seconds
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Your accent, for recognition">
                  <Select
                    value={lang}
                    onChange={(e) => {
                      setLang(e.target.value);
                      save("am.lang", e.target.value);
                    }}
                  >
                    {LANGS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Its voice">
                  <Select
                    value={voiceName}
                    onChange={(e) => {
                      setVoiceName(e.target.value);
                      save("am.voice", e.target.value);
                    }}
                  >
                    <option value="">Best available</option>
                    {voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </Select>
                </Field>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          {started && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                finish(false);
                window.speechSynthesis?.cancel();
                setSessionId(null);
                setTurns([]);
                setPhase("idle");
              }}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              New session
            </Button>
          )}
        </div>
      </header>

      <section className={`flex-1 space-y-4 border-t border-line py-6 ${embedded ? "min-h-0 overflow-y-auto" : ""}`} aria-live="polite">
        {!started && (
          <div className="mx-auto max-w-md py-10 text-center">
            <span className="bg-hero-gradient mx-auto grid size-16 place-items-center rounded-3xl text-white shadow-[0_16px_32px_-12px_rgb(79_70_229/0.6)]">
              <MessagesSquare className="size-7" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-semibold">A conversation, not a form</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              It asks one thing at a time and fills your profile as you go. With hands-free on, just talk: it sends when you pause and listens again after it answers. Stop whenever you like.
            </p>
            <Button size="lg" className="mt-6" onClick={() => send(null, false)} disabled={phase === "thinking"}>
              {phase === "thinking" ? "Starting…" : "Start the interview"}
            </Button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {turns.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={t.role === "user" ? "flex justify-end" : "flex gap-3"}
            >
              {t.role === "agent" && (
                <span className="bg-hero-gradient mt-1 grid size-8 shrink-0 place-items-center rounded-xl text-[11px] font-bold text-white" aria-hidden>
                  am
                </span>
              )}
              <p
                className={`max-w-[85%] whitespace-pre-wrap text-[15px] leading-relaxed ${
                  t.role === "user" ? "rounded-[20px] rounded-br-md bg-hero-gradient px-4 py-2.5 text-white shadow-[0_8px_20px_-10px_rgb(79_70_229/0.6)]" : "pt-1"
                }`}
              >
                {t.content}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        {interim && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md border border-dashed border-neutral-400 px-4 py-2.5 text-[15px] text-muted">{interim}</p>
          </div>
        )}
        {phase === "thinking" && started && (
          <div className="flex items-center gap-3">
            <span className="bg-hero-gradient grid size-8 place-items-center rounded-xl text-[11px] font-bold text-white" aria-hidden>
              am
            </span>
            <span className="flex gap-1" aria-label="Thinking">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
          </div>
        )}
        <div ref={bottom} />
      </section>

      {err && <p className="mb-2 rounded-lg border border-stop/40 bg-stop/8 px-3 py-2 text-sm">{err.charAt(0).toUpperCase() + err.slice(1)}</p>}

      {started && (
        <footer className={embedded ? "-mx-4 border-t border-line bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 sm:-mx-6 sm:px-6" : "sticky bottom-24 -mx-4 rounded-b-[28px] border-t border-line bg-surface/95 px-4 pb-4 pt-2 backdrop-blur sm:-mx-8 sm:px-8 lg:bottom-0"}>
          <p className="mb-2 h-4 text-xs text-muted">{status}</p>
          <div className="flex items-end gap-2">
            {voiceOk && (
              <button
                onClick={micTap}
                disabled={phase === "thinking"}
                aria-label={phase === "listening" ? "Stop and send" : "Talk"}
                className={`relative grid size-12 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ${
                  phase === "listening" ? "bg-stop text-white" : "bg-hero-gradient text-white shadow-[0_10px_24px_-8px_rgb(79_70_229/0.6)] hover:-translate-y-px"
                }`}
              >
                {phase === "listening" && <span className="absolute inset-0 animate-ping rounded-full bg-stop/40" aria-hidden />}
                {phase === "listening" ? <Square className="relative size-4 fill-current" /> : <Mic className="size-5" />}
              </button>
            )}
            <form
              className="flex flex-1 items-end gap-2 rounded-[20px] border border-line bg-background p-1.5 transition-shadow focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/12"
              onSubmit={(e) => {
                e.preventDefault();
                const t = draft.trim();
                if (!t || phase === "thinking") return;
                finish(false);
                window.speechSynthesis?.cancel();
                setDraft("");
                void send(t, false);
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    (e.currentTarget.form as HTMLFormElement).requestSubmit();
                  }
                }}
                rows={1}
                aria-label="Your answer"
                placeholder={voiceOk ? "Or type your answer" : "Type your answer (voice works in Chrome)"}
                className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] outline-none field-sizing-content"
              />
              <button
                disabled={phase === "thinking" || !draft.trim()}
                aria-label="Send"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-on-ink transition disabled:opacity-30"
              >
                <ArrowUp className="size-4" />
              </button>
            </form>
          </div>
        </footer>
      )}
    </div>
  );
}
