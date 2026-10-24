import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Pricing" };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Pricing() {
  const plans = [PLANS.free, PLANS.pro, PLANS.season];
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground">Sign in</Link>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <h1 className="font-display text-6xl font-bold leading-none tracking-tight">Pricing</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          One plan for trying it, one for a full season. Agents research programs, write and fact-check your essays, submit to the portals and
          chase funding. You review and sign everything.
        </p>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((p) => {
            const featured = p.id === "pro";
            return (
              <section
                key={p.id}
                className={`flex flex-col rounded-2xl p-7 ${featured ? "bg-board text-flap" : "border border-line bg-surface"}`}
              >
                <h2 className={`font-display text-3xl font-semibold ${featured ? "text-signal" : ""}`}>{cap(p.name)}</h2>
                <p className="mt-3 font-display text-5xl font-bold tracking-tight tabular">{p.priceLabel.split(" ")[0]}<span className={`ml-1 font-sans text-base font-normal ${featured ? "text-[#b9c0cd]" : "text-muted"}`}>{p.priceLabel.split(" ").slice(1).join(" ")}</span></p>
                <p className={`mt-2 text-sm ${featured ? "text-[#b9c0cd]" : "text-muted"}`}>{cap(p.blurb)}.</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className={`mt-0.5 size-4 shrink-0 ${featured ? "text-signal" : "text-go"}`} aria-hidden />
                      <span>{cap(f)}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/login?mode=signup" variant={featured ? "signal" : "secondary"} size="lg" className="mt-8 w-full">
                  {p.id === "free" ? "Start free" : `Choose ${cap(p.name)}`}
                </ButtonLink>
              </section>
            );
          })}
        </div>
        <p className="mt-8 text-sm text-muted">Application fees are paid to schools directly, and agents ask for fee waivers first.</p>
      </main>
    </div>
  );
}
