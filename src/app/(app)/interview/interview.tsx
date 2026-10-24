"use client";
import { useCallback, useEffect, useRef, useState } from "react";

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
}: {
  initialSessionId: string | null;
  initialTurns: Turn[];
  initialCompleteness: number;
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
    bottom.current?.scrollIntoView({ behavior: "smooth" });
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
          setErr("your browser doesn't support that accent setting; switched to English (US). tap the mic again.");
          wantRef.current = false;
        } else if (e.error === "not-allowed") {
          setErr("microphone blocked. allow mic access for this site in your browser settings.");
          wantRef.current = false;
        } else if (e.error !== "aborted" && e.error !== "no-speech") {
          setErr(`mic: ${e.error}`);
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

  return (
    <main className="mx-auto flex min-h-[calc(100vh-49px)] max-w-2xl flex-col px-4 py-6">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">interview</h1>
          <p className="text-sm text-neutral-500">profile {pct}% complete</p>
        </div>
        {started && (
          <button
            onClick={() => {
              finish(false);
              window.speechSynthesis?.cancel();
              setSessionId(null);
              setTurns([]);
              setPhase("idle");
            }}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-700"
          >
            new session
          </button>
        )}
      </header>

      <details className="mb-3 text-sm">
        <summary className="cursor-pointer text-neutral-500">voice settings</summary>
        <div className="mt-2 grid gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800 sm:grid-cols-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={speak} onChange={(e) => toggle("am.speak", e.target.checked, setSpeak)} />
            read replies out loud
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={handsFree} onChange={(e) => toggle("am.handsfree", e.target.checked, setHandsFree)} />
            hands-free (listens again after it speaks)
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-neutral-500">hands-free: send after you pause for</span>
            <select
              value={pauseMs}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setPauseMs(v);
                save("am.pause", String(v));
              }}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
            >
              {[2000, 3000, 4000, 6000, 8000].map((ms) => <option key={ms} value={ms}>{ms / 1000} seconds{ms === 3000 ? " (default)" : ""}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500">your accent (for recognition)</span>
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                save("am.lang", e.target.value);
              }}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
            >
              {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500">its voice</span>
            <select
              value={voiceName}
              onChange={(e) => {
                setVoiceName(e.target.value);
                save("am.voice", e.target.value);
              }}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
            >
              <option value="">best available</option>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
          </label>
        </div>
      </details>

      <div className="mb-2 h-1 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full bg-neutral-900 transition-all dark:bg-neutral-100" style={{ width: `${pct}%` }} />
      </div>

      <section className="flex-1 space-y-3 overflow-y-auto py-4">
        {!started && (
          <div className="rounded-md border border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            it asks one thing at a time and fills your profile as you go. with hands-free on, just talk: it sends when you
            pause and listens again after it answers. tap the mic anytime to interrupt it. you can stop whenever.
            <div className="mt-3">
              <button
                onClick={() => send(null, false)}
                disabled={phase === "thinking"}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {phase === "thinking" ? "starting…" : "start interview"}
              </button>
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex"}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-[15px] leading-relaxed ${
                t.role === "user" ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-900"
              }`}
            >
              {t.content}
            </p>
          </div>
        ))}
        {interim && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl border border-dashed border-neutral-400 px-4 py-2 text-[15px] text-neutral-500">{interim}</p>
          </div>
        )}
        {phase === "thinking" && started && (
          <div className="flex gap-1 px-2 py-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}
        <div ref={bottom} />
      </section>

      {err && <p className="mb-2 text-sm text-red-600">{err}</p>}

      {started && (
        <footer className="sticky bottom-0 border-t border-neutral-200 bg-[var(--background)] pt-3 pb-2 dark:border-neutral-800">
          <p className="mb-2 h-4 text-xs text-neutral-500">
            {phase === "listening" ? (handsFree ? `listening… sends after a ${pauseMs / 1000}s pause, or tap to send now` : "listening… tap to send") : phase === "speaking" ? "speaking… tap the mic to interrupt" : phase === "thinking" ? "thinking…" : ""}
          </p>
          <div className="flex items-end gap-2">
            {voiceOk && (
              <button
                onClick={micTap}
                disabled={phase === "thinking"}
                aria-label={phase === "listening" ? "stop and send" : "talk"}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40 ${
                  phase === "listening" ? "animate-pulse bg-red-600" : "bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900"
                }`}
              >
                {phase === "listening" ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                )}
              </button>
            )}
            <form
              className="flex flex-1 gap-2"
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
                placeholder={voiceOk ? "or type…" : "type your answer… (voice works in chrome)"}
                className="min-h-12 flex-1 resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-3 text-[15px] outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
              />
              <button
                disabled={phase === "thinking" || !draft.trim()}
                className="h-12 rounded-md bg-neutral-900 px-4 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
              >
                send
              </button>
            </form>
          </div>
        </footer>
      )}
    </main>
  );
}
