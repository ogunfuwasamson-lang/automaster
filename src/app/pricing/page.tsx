import { ThemeButton } from "@/components/theme";
import { CampusInk } from "@/components/landing/campus-ink";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Pricing" };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Pricing() {
  const plans = [PLANS.pro, PLANS.season];
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <CampusInk className="absolute inset-x-0 top-0 h-[560px] w-full" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <ThemeButton />
          <Link href="/login" className="rounded-xl px-3 py-2 text-muted hover:text-foreground">
            Sign in
          </Link>
          <ButtonLink href="/login?mode=signup" size="sm">
            Start free
          </ButtonLink>
        </nav>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-12 text-center">
        <h1 className="text-[44px] leading-[1.04] sm:text-[64px]">Pro is free. All of it.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Agents research programs, write and fact-check your essays, submit to the portals and chase funding. You review and sign everything. Prefer to pay once for the cycle? That&apos;s the Season pass.
        </p>
        <div className="mx-auto mt-14 grid max-w-4xl items-stretch gap-5 text-left md:grid-cols-2">
          {plans.map((p) => {
            const featured = p.id === "pro";
            const [price, ...per] = p.priceLabel.split(" ");
            return (
              <section key={p.id} className={`relative flex flex-col rounded-2xl bg-surface p-7 sm:p-8 ${featured ? "border-2 border-ink shadow-lift" : "border border-line shadow-card"}`}>
                {featured && <span className="absolute right-6 top-7 rounded-full border border-line px-2.5 py-1 text-xs text-muted">No card needed</span>}
                <h2 className="font-serif text-[26px]">{cap(p.name)}</h2>
                <p className="mt-4 font-serif text-[52px] leading-none tabular">
                  {price}
                  <span className="ml-2 font-sans text-base text-muted">{per.join(" ")}</span>
                </p>
                <p className="mt-3 text-sm text-muted">{cap(p.blurb)}.</p>
                <ul className="mt-7 flex-1 space-y-3.5 border-t border-line pt-7 text-[14.5px]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                      <span>{cap(f)}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/login?mode=signup" variant={featured ? "primary" : "secondary"} size="lg" className="mt-9 w-full">
                  {featured ? "Start free" : `Choose ${cap(p.name)}`}
                </ButtonLink>
              </section>
            );
          })}
        </div>
        <p className="mt-12 text-sm text-muted">Application fees are paid to schools directly, and agents ask for fee waivers first.</p>
      </main>
    </div>
  );
}
