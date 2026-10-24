"use client";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">This page didn&apos;t load</h1>
        <p className="mt-2 text-muted">Your agents are unaffected and keep working. Try again, or go back to your home page.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted">Reference {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/dashboard" variant="secondary">
            Home
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
