"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";

// Cloudflare Turnstile: the bot check on sign-up and sign-in. usually invisible (no puzzle for people); Supabase
// checks the token it produces when CAPTCHA is on there. some browsers never let the check run (embedded app
// browsers, strict privacy settings): the form is told, so it can carry on or offer a visible check instead of
// waiting for ever.
type TS = { render(el: HTMLElement, o: Record<string, unknown>): string; reset(id?: string): void; remove(id: string): void };
declare global {
  interface Window {
    turnstile?: TS;
  }
}
// the site key is public (it ships to every browser); an env var can override it
export const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAFtui7QTYxLmFtTR";

export type CheckState = "loading" | "ok" | "failed";

export function Turnstile({ onToken, onState, resetKey, visible = false }: { onToken: (t: string | null) => void; onState?: (s: CheckState, code?: string) => void; resetKey?: number; visible?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const settled = useRef(false);
  useEffect(() => {
    if (!TURNSTILE_KEY) return;
    settled.current = false;
    onState?.("loading");
    let tries = 0;
    // no answer at all after 12 seconds (the script or its frame was blocked): say so
    const giveUp = setTimeout(() => {
      if (!settled.current) onState?.("failed", "no-response");
    }, 12_000);
    const t = setInterval(() => {
      if (!window.turnstile || !box.current || id.current) {
        if (++tries > 120) {
          clearInterval(t);
          if (!window.turnstile) onState?.("failed", "script-blocked");
        }
        return;
      }
      clearInterval(t);
      try {
        id.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_KEY,
          // a visible box the person can click when the invisible check didn't work
          appearance: visible ? "always" : "interaction-only",
          callback: (token: string) => {
            settled.current = true;
            onToken(token);
            onState?.("ok");
          },
          "expired-callback": () => onToken(null),
          "error-callback": (code: string) => {
            settled.current = true;
            onToken(null);
            onState?.("failed", String(code ?? ""));
            return true; // handled: no endless automatic retries
          },
          "unsupported-callback": () => {
            settled.current = true;
            onState?.("failed", "unsupported");
          },
        });
      } catch {
        onState?.("failed", "render");
      }
    }, 100);
    return () => {
      clearInterval(t);
      clearTimeout(giveUp);
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  // a token works once: get a fresh one after each attempt
  useEffect(() => {
    if (resetKey && id.current && window.turnstile) {
      onToken(null);
      settled.current = false;
      onState?.("loading");
      window.turnstile.reset(id.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);
  if (!TURNSTILE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={box} />
    </>
  );
}
