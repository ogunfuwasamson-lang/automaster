import type { Metadata } from "next";
import { headers } from "next/headers";
import { CampusInk } from "@/components/landing/campus-ink";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { BreadcrumbJsonLd, SiteJsonLd } from "@/components/seo/json-ld";
import { requireUser } from "@/lib/supabase/server";
import { pricingFor } from "@/lib/geo-pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Preparing your university applications with Ivyward is free. In Africa you pay the local equivalent of ₦2,500 per submission; elsewhere your first 3 applications are free, then $20 a month for up to 10 submissions a month.",
  alternates: { canonical: "/pricing" },
};

const EVERYTHING = [
  "A shortlist from every region you choose: bachelor's, master's, MBA or PhD",
  "Essays drafted from your own facts and fact-checked",
  "Portal accounts created, every page filled, documents uploaded",
  "Fee waivers, scholarships and funding chased for you",
  "Ivyward AI: answers, reminders and follow-ups on school emails",
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
  const p = pricingFor((await headers()).get("x-vercel-ip-country"));
  const where = NAMES[p.country] ?? null;
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <SiteJsonLd />
      <BreadcrumbJsonLd items={[["Ivyward", "/"], ["Pricing", "/pricing"]]} />
      <SiteHeader signedIn={signedIn} />
      <CampusInk className="absolute inset-x-0 top-16 h-[560px] w-full" />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-16 text-center">
        {p.model === "per_submission" ? (
          <>
            <h1 className="text-[44px] leading-[1.04] sm:text-[64px]">Free to prepare. {p.label} to submit.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              The agents do all the work first: shortlist, essays, every page of the portal. You pay only when an application is ready to go, and there&apos;s no limit on how many you send.
            </p>
            <div className="mx-auto mt-14 grid max-w-4xl items-stretch gap-5 md:grid-cols-2">
              <Card title="Preparing" price="Free" per="" note="Everything up to the submit button." items={EVERYTHING} cta="Start free" />
              <Card
                featured
                title="Each submission"
                price={p.label}
                per="per application"
                note="Paid just before the agents submit. Scholarship applications too."
                items={["Pay only for what you send", "Apply to 5 schools or 25: no monthly fee, no cap", "Pay in your own currency: card, bank transfer or mobile money", "You sign every application before it's submitted"]}
                cta="Start free"
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[44px] leading-[1.04] sm:text-[64px]">Your first {p.free} applications are free.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              The agents research programs, write and fact-check your essays, submit to the portals and chase funding. You review and sign everything. Need more than {p.free}? Pro covers up to 10 submissions every month.
            </p>
            <div className="mx-auto mt-14 grid max-w-4xl items-stretch gap-5 md:grid-cols-2">
              <Card title="Free" price="$0" per="" note={`Everything, for your first ${p.free} applications.`} items={[...EVERYTHING, `${p.free} applications submitted for you`]} cta="Start free" />
              <Card featured title="Pro" price="$20" per="a month" note="Up to 10 submissions a month. Cancel any time." items={["Everything in Free", "10 submissions a month: applications or scholarships", "More agent work every month", "Cancel any time; it runs to the end of the month you paid for"]} cta="Start free, upgrade later" />
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
