"use client";
import Script from "next/script";
import { useEffect } from "react";

// UserJot: feedback, the public roadmap and product updates, opened from the account menu (no floating launcher,
// so it never sits on top of the Ivyward AI button). the signed-in applicant is identified, and signed so UserJot
// trusts it, so feedback arrives with who sent it and they don't have to sign in again.
type UJ = {
  init: (id: string, o: Record<string, unknown>) => void;
  identify: (u: Record<string, unknown> | null) => void;
  showWidget: (o?: { section?: "feedback" | "roadmap" | "updates" }) => void;
  redirect: (o: { to: string; newTab?: boolean }) => void;
};
declare global {
  interface Window {
    uj?: UJ;
    $ujq?: unknown[];
  }
}

export const USERJOT_BOARD = "https://ivyward.userjot.com";
const PROJECT = process.env.NEXT_PUBLIC_USERJOT_PROJECT_ID;

export function openFeedback(section: "feedback" | "roadmap" | "updates" = "feedback") {
  if (PROJECT && window.uj) window.uj.showWidget({ section });
  else window.open(`${USERJOT_BOARD}${section === "feedback" ? "" : `/${section}`}`, "_blank", "noopener");
}

export function UserJot({ user }: { user: { id: string; email: string; firstName?: string; lastName?: string; signature?: string | null } | null }) {
  useEffect(() => {
    if (!PROJECT || !window.uj) return;
    window.uj.identify(user ? { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, ...(user.signature ? { signature: user.signature } : {}) } : null);
  }, [user]);
  if (!PROJECT) return null;
  return (
    <>
      <Script id="userjot-loader" strategy="afterInteractive">
        {`window.$ujq=window.$ujq||[];window.uj=window.uj||new Proxy({},{get:(_,p)=>(...a)=>window.$ujq.push([p,...a])});document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://cdn.userjot.com/sdk/v2/uj.js',type:'module',async:!0}));window.uj.init(${JSON.stringify(PROJECT)},{widget:true,trigger:'custom',theme:'auto'});`}
      </Script>
    </>
  );
}
