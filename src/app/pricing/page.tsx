import type { Metadata } from "next";
import { headers } from "next/headers";
import { CampusInk } from "@/components/landing/campus-ink";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { BreadcrumbJsonLd, SiteJsonLd } from "@/components/seo/json-ld";
import { requireUser } from "@/lib/supabase/server";
import { pricingFor } from "@/lib/geo-pricing";
import { submissionAmounts } from "@/lib/fx";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with a shortlist of programmes Ivyward has already checked. The agents' work is paid in credits: an application uses 10, checking a programme uses 1. ₦10,000 buys 60 in Africa; Pro is $20 a month for 160 elsewhere. Invite a friend and you both get 10.",
  alternates: { canonical: "/pricing" },
};

// free, with no agent work (lib/free-tier)
const FREE = [
  "A shortlist of checked programmes",
  "Deadlines, fees and funding for each",
];

// what credits buy (lib/credit-prices)
const AGENTS = [
  "Essays drafted and fact-checked",
  "Application forms filled in and submitted",
  "Fee waivers and funding chased",
];

const NAMES: Record<string, string> = { NG: "Nigeria", GH: "Ghana", KE: "Kenya", UG: "Uganda", TZ: "Tanzania", RW: "Rwanda", ZM: "Zambia", MW: "Malawi", ZA: "South Africa", EG: "Egypt", SN: "Senegal", CI: "Côte d'Ivoire", CM: "Cameroon", ET: "Ethiopia" };

function Card({ title, price, per, note, items, cta, featured }: { title: string; price: string; per: string; note: string; items: string[]; cta: string; featured?: boolean }) {
  return (
    <section className={`relative flex flex-col rounded-2xl bg-surface p-7 text-left sm:p-8 ${featured ? "border-2 border-ink shadow-lift" : "border border-line shadow-card"}`}>
      <h2 className="font-serif text-[26px]">{title}</h2>
      <p className="mt-4 font-serif text-[52px] leading-none tabular">
        {price}
        <span className="ml-2 font-sans text-base text-muted">{per}</span>
      </p>
      <p className="mt-3 text-sm text-muted">{note}</p>
      <ul className="mt-7 flex-1 space-y-3.5 border-t border-line pt-7 text-[14.5px]">
        {items.map((f) => (
          <li key={f} className="flex gap-3">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <ButtonLink href="/login?mode=signup" variant={featured ? "primary" : "secondary"} size="lg" className="mt-9 w-full">
        {cta}
      </ButtonLink>
    </section>
  );
}

export default async function Pricing() {
  const signedIn = !!(await requireUser().catch(() => null));
  const p = pricingFor((await headers()).get("x-vercel-ip-country"), await submissionAmounts().catch(() => null));
  const where = NAMES[p.country] ?? null;
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <SiteJsonLd />
      <BreadcrumbJsonLd items={[["Ivyward", "/"], ["Pricing", "/pricing"]]} />
      <SiteHeader signedIn={signedIn} />
      <CampusInk className="absolute inset-x-0 top-16 h-[560px] w-full" />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-16 text-center">
        {p.model === "pack" ? (
          <>
            <h1 className="text-[44px] leading-[1.04] sm:text-[64px]">Start free. {p.label.replace(/ for \d+ credits$/, "")} for {p.size} credits.</h1>
            <div className="mx-auto mt-14 grid max-w-4xl items-stretch gap-5 md:grid-cols-2">
              <Card title="Free" price="Free" per="" note="Invite a friend and you both get 10 credits, enough for one application." items={FREE} cta="Start free" />
              <Card
                featured
                title={`${p.size} credits`}
                price={p.label.replace(/ for \d+ credits$/, "")}
                per="for 30 days"
                note="An application uses 10, checking a programme or scholarship uses 1. No subscription."
                items={[...AGENTS, "5 applications and 10 checks"]}
                cta="Start free"
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[44px] leading-[1.04] sm:text-[64px]">Start free. Pro for 160 credits a month.</h1>
            <div className="mx-auto mt-14 grid max-w-4xl items-stretch gap-5 md:grid-cols-2">
              <Card title="Free" price="$0" per="" note="Invite a friend and you both get 10 credits, enough for one application." items={FREE} cta="Start free" />
              <Card featured title="Pro" price="$20" per="a month" note="An application uses 10, checking a programme or scholarship uses 1. Cancel any time." items={[...AGENTS, "160 credits a month"]} cta="Start free, upgrade later" />
            </div>
          </>
        )}
        <p className="mt-12 text-sm text-muted">
          {where ? `Prices shown for ${where}. ` : ""}Application fees are paid to schools directly, and the agents ask for fee waivers first. Payments are processed by Bachs.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
