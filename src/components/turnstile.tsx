"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";

// Cloudflare Turnstile: the bot check on sign-up and sign-in. usually invisible (no puzzle for people); Supabase
// checks the token it produces. the token is ignored until CAPTCHA is turned on in Supabase, so this can ship first.
type TS = { render(el: HTMLElement, o: Record<string, unknown>): string; reset(id?: string): void; remove(id: string): void };
declare global {
  interface Window {
    turnstile?: TS;
  }
}
// the site key is public (it ships to every browser); an env var can override it
export const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAFtui7QTYxLmFtTR";

export function Turnstile({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  useEffect(() => {
    if (!TURNSTILE_KEY) return;
    let tries = 0;
    const t = setInterval(() => {
      if (!window.turnstile || !box.current || id.current) {
        if (++tries > 100) clearInterval(t);
        return;
      }
      clearInterval(t);
      id.current = window.turnstile.render(box.current, {
        sitekey: TURNSTILE_KEY,
        appearance: "interaction-only",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    }, 100);
    return () => {
      clearInterval(t);
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // a token works once: get a fresh one after each attempt
  useEffect(() => {
    if (resetKey && id.current && window.turnstile) {
      onToken(null);
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
