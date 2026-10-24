"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, Check } from "lucide-react";
import { motion } from "motion/react";
import { browserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";

function LoginForm() {
  const signup = useSearchParams().get("mode") === "signup";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setErr("");
    const { error } = await browserClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErr(/rate/i.test(error.message) ? "Too many links requested. Wait a minute, then try again." : error.message);
      setState("idle");
    } else setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="space-y-5" role="status">
        <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} className="bg-hero-gradient grid size-14 place-items-center rounded-2xl text-white shadow-[0_12px_28px_-8px_rgb(79_70_229/0.6)]">
          <Mail className="size-6" aria-hidden />
        </motion.span>
        <h1 className="text-3xl font-bold tracking-[-0.04em]">Check your inbox</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          We sent a sign-in link to <span className="font-semibold text-foreground">{email}</span>. Open it on this device. It works once and
          expires in an hour.
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
      <Field label="Email" error={err || null}>
        <Input type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Field>
      <Button type="submit" size="lg" variant="accent" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending link…" : signup ? "Create account" : "Send sign-in link"}
      </Button>
      <p className="text-sm text-muted">
        {signup ? (
          <>Already have an account? <a href="/login" className="font-semibold text-accent hover:underline">Sign in</a></>
        ) : (
          <>New here? <a href="/login?mode=signup" className="font-semibold text-accent hover:underline">Create an account</a></>
        )}
      </p>
    </form>
  );
}

export default function Login() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="aurora !h-[720px]" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center px-5 py-5">
        <Wordmark />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[420px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-[28px] border border-white/80 p-7 shadow-lift sm:p-9 dark:border-white/[0.07]"
          >
            <Suspense>
              <LoginForm />
            </Suspense>
          </motion.div>
          <ul className="mt-6 space-y-2 px-2 text-sm text-muted">
            {["No password. Every sign-in is a one-time email link.", "Your first application is free.", "Bachelor's, master's and PhD, anywhere in the world."].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="grid size-5 place-items-center rounded-full bg-accent/10 text-accent">
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
