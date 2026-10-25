import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";
import { ThemeButton } from "@/components/theme";

export const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Wordmark />
          <ThemeButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="text-[40px] leading-tight sm:text-[48px]">{title}</h1>
        <p className="label-mono mt-3">Last updated {updated}</p>
        <div className="mt-10 space-y-8 text-[15.5px] leading-relaxed text-foreground/90 [&_h2]:font-serif [&_h2]:text-[24px] [&_h2]:leading-snug [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
        <p className="mt-14 border-t border-line pt-6 text-sm text-muted">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </p>
      </main>
    </div>
  );
}

export function Contact() {
  return CONTACT ? (
    <>
      Write to{" "}
      <a href={`mailto:${CONTACT}`} className="text-brand hover:underline">
        {CONTACT}
      </a>
      .
    </>
  ) : (
    <>Write to us from the email address on your account.</>
  );
}
