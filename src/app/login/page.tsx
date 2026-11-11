"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { CampusInk } from "@/components/landing/campus-ink";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, Check } from "lucide-react";
import { motion } from "motion/react";
import { browserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { ThemeButton } from "@/components/theme";
import { emailTypo } from "@/lib/email-typo";
import { Turnstile, TURNSTILE_KEY, type CheckState } from "@/components/turnstile";

function LoginForm() {
  const params = useSearchParams();
  const signup = params.get("mode") === "signup";
  const next = params.get("next") ?? "";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const token = useRef<string | null>(null);
  const check = useRef<CheckState>("loading");
  const [visibleCheck, setVisibleCheck] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onToken = (t: string | null) => {
    token.current = t;
  };
  const [err, setErr] = useState(params.get("error") === "link" ? "That sign-in link was already used, has expired, or was opened in a different browser from the one you asked in. Enter your email for a fresh one and open it here." : "");

  // "Continue with Google" appears only when Google sign-in is switched on for this project
  const [google, setGoogle] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setGoogle(!!j?.external?.google))
      .catch(() => {});
  }, []);
  const backTo = () => (next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "");
  async function withGoogle() {
    setLeaving(true);
    setErr("");
    const { error } = await browserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback${backTo()}` } });
    if (error) {
      setErr("Google sign-in didn't start. Use the email link below instead.");
      setLeaving(false);
    }
  }
  const meant = emailTypo(email);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setErr("");
    const back = backTo();
    // the bot check usually finishes on its own within a few seconds: wait for it rather than turn the person away
    for (let i = 0; TURNSTILE_KEY && !token.current && check.current === "loading" && i < 100; i++) await new Promise((r) => setTimeout(r, 100));
    const captchaToken = token.current;
    const { error } = await browserClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback${back}`, ...(captchaToken ? { captchaToken } : {}) },
    });
    setAttempt((n) => n + 1);
    if (error) {
      if (/captcha/i.test(error.message)) {
        // the check didn't pass (or never ran in this browser): show it as a box to click, and say what else works
        setBlocked(!captchaToken);
        setVisibleCheck(true);
        setErr(captchaToken ? "The security check expired. Tick the box below, then send the link again." : "The security check couldn't run in this browser. Tick the box below if it appears, or open this page in Chrome, Safari or Edge.");
      } else setErr(/rate/i.test(error.message) ? "Too many links requested. Wait a minute, then try again." : error.message);
      setState("idle");
    } else setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="space-y-5" role="status">
        <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} className="bg-hero-gradient grid size-14 place-items-center rounded-2xl text-white">
          <Mail className="size-6" aria-hidden />
        </motion.span>
        <h1 className="text-3xl font-bold tracking-[-0.04em]">Check your inbox</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          We sent a sign-in link to <span className="font-semibold text-foreground">{email}</span>. Open it in this same browser. It works once and expires in an hour. Nothing after a
          minute? Check spam, and that the address is spelled right.
        </p>
        <button onClick={() => setState("idle")} className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.04em]">{signup ? "Start your season" : "Welcome back"}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {signup ? "Enter your email and we'll send you a link to create your account. No password needed." : "Enter your email and we'll send you a sign-in link."}
        </p>
      </div>
      {google && (
        <>
          <Button type="button" size="lg" variant="secondary" className="w-full" onClick={withGoogle} disabled={leaving}>
            <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            {leaving ? "Opening Google…" : "Continue with Google"}
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted" role="separator">
            <span className="h-px flex-1 bg-line" />
            or use an email link
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}
      <Field label="Email" error={err || null}>
        <Input type="email" required autoComplete="email" autoFocus={!google} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Field>
      {meant && (
        <p className="-mt-3 text-sm text-muted" role="status">
          Did you mean{" "}
          <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline" onClick={() => setEmail(meant)}>
            {meant}
          </button>
          ?
        </p>
      )}
      <Turnstile
        key={visibleCheck ? "visible" : "invisible"}
        visible={visibleCheck}
        onToken={onToken}
        onState={(st) => {
          check.current = st;
        }}
        resetKey={attempt}
      />
      {blocked && (
        <p className="text-sm text-muted">
          Using an app&apos;s built-in browser?{" "}
          <button
            type="button"
            className="font-semibold text-brand hover:underline"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href).catch(() => {});
            }}
          >
            Copy this page&apos;s link
          </button>{" "}
          and open it in your usual browser.
        </p>
      )}
      <Button type="submit" size="lg" variant="accent" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending link…" : signup ? "Create account" : "Send sign-in link"}
      </Button>
      <p className="text-sm text-muted">
        {signup ? (
          <>Already have an account? <a href="/login" className="font-semibold text-brand hover:underline">Sign in</a></>
        ) : (
          <>New here? <a href="/login?mode=signup" className="font-semibold text-brand hover:underline">Create an account</a></>
        )}
      </p>
      <p className="text-xs text-muted">
        By continuing you agree to the <a href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</a> and <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy policy</a>.
      </p>
    </form>
  );
}

export default function Login() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <CampusInk className="absolute inset-x-0 top-0 h-[720px] w-full" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <ThemeButton />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[420px]">
          <div
            className="rise glass rounded-2xl border border-white/80 p-7 shadow-lift sm:p-9 dark:border-white/[0.07]"
          >
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
          <ul className="mt-6 space-y-2 px-2 text-sm text-muted">
            {["No password. Every sign-in is a one-time email link.", "Free to use. No card needed.", "Bachelor's, master's and PhD, anywhere in the world."].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="grid size-5 place-items-center text-brand">
                  <Check className="size-3" aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
