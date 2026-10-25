import { ThemeButton } from "@/components/theme";
import { CampusInk } from "@/components/landing/campus-ink";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Pricing" };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Pricing() {
  const plans = [PLANS.free, PLANS.pro, PLANS.season];
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
        <h1 className="text-[44px] font-bold leading-[1.02] tracking-[-0.05em] sm:text-6xl">
          Simple pricing for <span className="text-gradient">a whole season.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Agents research programs, write and fact-check your essays, submit to the portals and chase funding. You review and sign everything.
        </p>
        <div className="mt-14 grid items-stretch gap-5 text-left lg:grid-cols-3">
          {plans.map((p) => {
            const featured = p.id === "pro";
            const [price, ...per] = p.priceLabel.split(" ");
            return (
              <section
                key={p.id}
                className={`relative flex flex-col rounded-2xl p-7 sm:p-8 ${
                  featured
                    ? "bg-hero-gradient text-white lg:-my-4 lg:py-11"
                    : "border border-line bg-surface shadow-card"
                }`}
              >
                {featured && (
                  <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur">
                    <Sparkles className="size-3.5" aria-hidden /> Most popular
                  </span>
                )}
                <h2 className="text-lg font-bold">{cap(p.name)}</h2>
                <p className="mt-4 text-5xl font-bold tracking-[-0.05em] tabular">
                  {price}
                  <span className={`ml-1.5 text-base font-medium tracking-normal ${featured ? "text-white/75" : "text-muted"}`}>{per.join(" ")}</span>
                </p>
                <p className={`mt-3 text-sm ${featured ? "text-white/80" : "text-muted"}`}>{cap(p.blurb)}.</p>
                <ul className={`mt-7 flex-1 space-y-3.5 border-t pt-7 text-[14.5px] ${featured ? "border-white/20" : "border-line"}`}>
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${featured ? "bg-white/20" : "bg-accent/10 text-accent"}`}>
                        <Check className="size-3" aria-hidden />
                      </span>
                      <span>{cap(f)}</span>
                    </li>
                  ))}
                </ul>
                {featured ? (
                  <Link href="/login?mode=signup" className="mt-9 inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-white font-semibold text-[#0f1222] shadow-lg transition-transform hover:-translate-y-0.5">
                    Choose {cap(p.name)}
                  </Link>
                ) : (
                  <ButtonLink href="/login?mode=signup" variant={p.id === "free" ? "secondary" : "primary"} size="lg" className="mt-9 w-full">
                    {p.id === "free" ? "Start free" : `Choose ${cap(p.name)}`}
                  </ButtonLink>
                )}
              </section>
            );
          })}
        </div>
        <p className="mt-12 text-sm text-muted">Application fees are paid to schools directly, and agents ask for fee waivers first.</p>
      </main>
    </div>
  );
}
