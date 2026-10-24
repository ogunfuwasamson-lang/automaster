"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft } from "lucide-react";
import { browserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { Flap } from "@/components/ui/board";

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
        <span className="grid size-12 place-items-center rounded-full bg-signal text-neutral-950">
          <Mail className="size-5" aria-hidden />
        </span>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Open it on this device. It works once and
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
        <h1 className="font-display text-4xl font-semibold tracking-tight">{signup ? "Start your season" : "Welcome back"}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {signup ? "Enter your email and we'll send you a link to create your account. No password needed." : "Enter your email and we'll send you a sign-in link."}
        </p>
      </div>
      <Field label="Email" error={err || null}>
        <Input type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending link…" : signup ? "Create account" : "Send sign-in link"}
      </Button>
      <p className="text-sm text-muted">
        {signup ? (
          <>Already have an account? <a href="/login" className="font-medium text-foreground underline underline-offset-4">Sign in</a></>
        ) : (
          <>New here? <a href="/login?mode=signup" className="font-medium text-foreground underline underline-offset-4">Create an account</a></>
        )}
      </p>
    </form>
  );
}

export default function Login() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-board p-10 text-flap lg:flex">
        <Wordmark />
        <div className="space-y-3">
          <Flap text="NOW BOARDING" className="text-2xl" />
          <p className="max-w-sm font-display text-5xl font-semibold leading-[0.95] tracking-tight">Every application, tracked like a departure.</p>
          <p className="max-w-sm text-[15px] leading-relaxed text-[#b9c0cd]">See which schools are written, signed, submitted and decided, and the few steps that need you.</p>
        </div>
        <p className="text-sm text-[#8a93a6]">Bachelor&apos;s, master&apos;s and PhD, anywhere in the world.</p>
      </aside>
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="lg:hidden">
          <Wordmark />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
