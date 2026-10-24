"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Turn = { role: "agent" | "user"; content: string };

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

function readPref(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

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
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [speak, setSpeak] = useState(true);
  const [err, setErr] = useState("");
  const [voiceOk, setVoiceOk] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceOk(!!getRecognition());
    setSpeak(readPref("am.speak", true));
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, thinking, interim]);

  const say = useCallback(
    (text: string) => {
      if (!speak || typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    },
    [speak],
  );

  const send = useCallback(
    async (text: string | null, viaVoice: boolean) => {
      setErr("");
      if (text) setTurns((t) => [...t, { role: "user", content: text }]);
      setThinking(true);
      try {
        const res = await fetch("/api/interview/turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, text, viaVoice }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        setSessionId(data.sessionId);
        setTurns((t) => [...t, { role: "agent", content: data.reply }]);
        setPct(data.completeness);
        say(data.reply);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setThinking(false);
      }
    },
    [sessionId, say],
  );

  function startListening() {
    const Ctor = getRecognition();
    if (!Ctor || thinking) return;
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    finalRef.current = "";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      setInterim((finalRef.current + interimText).trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") setErr(`mic: ${e.error}`);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setInterim("");
    setListening(true);
    rec.start();
  }

  function stopListening() {
    recRef.current?.stop();
    setListening(false);
    // give the recogniser a beat to flush its final result
    setTimeout(() => {
      const text = (finalRef.current || "").trim() || interimRef.current.trim();
      setInterim("");
      if (text) send(text, true);
    }, 400);
  }
  const interimRef = useRef("");
  useEffect(() => {
    interimRef.current = interim;
  }, [interim]);

  function toggleSpeak() {
    const next = !speak;
    setSpeak(next);
    if (!next) window.speechSynthesis?.cancel();
    try {
      localStorage.setItem("am.speak", next ? "1" : "0");
    } catch {}
  }

  const started = turns.length > 0;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-49px)] max-w-2xl flex-col px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">interview</h1>
          <p className="text-sm text-neutral-500">profile {pct}% complete</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleSpeak} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-700">
            voice replies {speak ? "on" : "off"}
          </button>
          {started && (
            <button
              onClick={() => {
                setSessionId(null);
                setTurns([]);
              }}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-700"
            >
              new session
            </button>
          )}
        </div>
      </header>

      <div className="mb-2 h-1 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full bg-neutral-900 transition-all dark:bg-neutral-100" style={{ width: `${pct}%` }} />
      </div>

      <section className="flex-1 space-y-3 overflow-y-auto py-4">
        {!started && (
          <div className="rounded-md border border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            upload your CV and transcript first so it doesn&apos;t ask what it can read. then talk: tap the mic, speak, tap
            again to send. it asks one thing at a time and fills your profile as you go. you can stop anytime.
            <div className="mt-3">
              <button
                onClick={() => send(null, false)}
                disabled={thinking}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {thinking ? "starting…" : "start interview"}
              </button>
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex"}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-[15px] leading-relaxed ${
                t.role === "user"
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-900"
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
        {thinking && started && <p className="text-sm text-neutral-500">…</p>}
        <div ref={bottom} />
      </section>

      {err && <p className="mb-2 text-sm text-red-600">{err}</p>}

      {started && (
        <footer className="sticky bottom-0 flex items-end gap-2 border-t border-neutral-200 bg-[var(--background)] pt-3 pb-2 dark:border-neutral-800">
          {voiceOk && (
            <button
              onClick={listening ? stopListening : startListening}
              disabled={thinking}
              aria-label={listening ? "stop and send" : "start talking"}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40 ${
                listening ? "animate-pulse bg-red-600" : "bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900"
              }`}
            >
              {listening ? (
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
              if (!t || thinking) return;
              setDraft("");
              send(t, false);
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
              disabled={thinking || !draft.trim()}
              className="h-12 rounded-md bg-neutral-900 px-4 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
            >
              send
            </button>
          </form>
        </footer>
      )}
    </main>
  );
}
