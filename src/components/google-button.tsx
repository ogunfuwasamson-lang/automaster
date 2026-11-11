"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

// Google's own sign-in button, on our page. The person sees "Sign in to tryivyward.com" in Google's window,
// not the address of the database service behind it (which is what the redirect flow shows, and reads as a scam).
// The client id is public by design: it names the app to Google and can do nothing by itself.
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_CLIENT_ID ?? "29136107035-rbd4pnkq364h7dfjp2c51g61b6simger.apps.googleusercontent.com";

type Gsi = {
  accounts: { id: { initialize(o: Record<string, unknown>): void; renderButton(el: HTMLElement, o: Record<string, unknown>): void; cancel(): void } };
};

async function nonces(): Promise<[string, string]> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [raw, [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")];
}

export function GoogleButton({ next, onError, fallback }: { next: string; onError: (m: string) => void; fallback: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let dead = false;
    const start = async () => {
      const g = (window as unknown as { google?: Gsi }).google;
      if (!g || !box.current || dead) return;
      const [raw, hashed] = await nonces();
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashed,
        ux_mode: "popup",
        use_fedcm_for_button: true,
        callback: async (r: { credential?: string }) => {
          if (!r.credential) return onError("Google didn't finish signing you in. Try again, or use the email link.");
          setBusy(true);
          const { error } = await browserClient().auth.signInWithIdToken({ provider: "google", token: r.credential, nonce: raw });
          if (error) {
            setBusy(false);
            return onError("Google sign-in didn't complete. Use the email link below instead.");
          }
          window.location.assign(`/auth/done${next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : ""}`);
        },
      });
      const dark = document.documentElement.classList.contains("dark") || window.matchMedia("(prefers-color-scheme: dark)").matches;
      g.accounts.id.renderButton(box.current, { type: "standard", theme: dark ? "filled_black" : "outline", size: "large", text: "continue_with", shape: "pill", logo_alignment: "center", width: Math.min(400, Math.max(240, box.current.clientWidth)) });
      setReady(true);
    };
    if ((window as unknown as { google?: Gsi }).google) void start();
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => void start();
      s.onerror = () => !dead && setFailed(true); // blocked by an extension or the network: the plain button still works
      document.head.appendChild(s);
    }
    return () => {
      dead = true;
    };
  }, [next, onError]);

  if (failed) return <>{fallback}</>;
  return (
    <div className="relative min-h-11" aria-busy={busy}>
      <div ref={box} className={`flex justify-center [color-scheme:light] ${busy ? "pointer-events-none opacity-50" : ""}`} />
      {!ready && <div className="absolute inset-0 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden />}
      {busy && <p className="mt-2 text-center text-sm text-muted" role="status">Signing you in…</p>}
    </div>
  );
}
