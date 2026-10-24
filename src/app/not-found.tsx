import { ButtonLink } from "@/components/ui/button";
import { Flap } from "@/components/ui/board";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="text-center">
        <div className="inline-flex gap-1 rounded-xl bg-board p-3" aria-hidden>
          {"404".split("").map((c, i) => (
            <Flap key={i} text={c} className="text-4xl" />
          ))}
        </div>
        <h1 className="mt-6 text-2xl font-semibold">This page has left the board</h1>
        <p className="mt-2 text-muted">The link may be old, or the page was moved.</p>
        <ButtonLink href="/dashboard" className="mt-6">
          Go to your home page
        </ButtonLink>
      </div>
    </main>
  );
}
