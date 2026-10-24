"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await browserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErr(error.message);
      setState("error");
    } else setState("sent");
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <form onSubmit={send} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">automaster</h1>
        <p className="text-sm text-neutral-500">sign in with a magic link.</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
        />
        <button
          disabled={state === "sending"}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {state === "sending" ? "sending…" : "send link"}
        </button>
        {state === "sent" && <p className="text-sm text-green-600">check your inbox.</p>}
        {state === "error" && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </main>
  );
}
