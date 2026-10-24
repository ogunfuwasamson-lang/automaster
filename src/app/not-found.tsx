import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4">
      <div className="aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="relative text-center">
        <p className="text-gradient text-[96px] font-bold leading-none tracking-[-0.06em]" aria-hidden>
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em]">This page has left the board</h1>
        <p className="mt-2 text-muted">The link may be old, or the page was moved.</p>
        <ButtonLink href="/dashboard" className="mt-6">
          Go to your home page
        </ButtonLink>
      </div>
    </main>
  );
}
