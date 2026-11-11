import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { HeroIn } from "@/components/landing/hero-motion";
import { CampusInk } from "@/components/landing/campus-ink";
import { ProductTabs } from "@/components/landing/product-tabs";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { CompareSection, SectionHead, WhoSection } from "@/components/landing/sections";
import { SeasonSteps } from "@/components/landing/season-steps";
import { requireUser } from "@/lib/supabase/server";
import { FAQ } from "@/lib/faq";
import { SITE } from "@/lib/site";
import { headers } from "next/headers";
import Link from "next/link";
import { pricingFor } from "@/lib/geo-pricing";
import { submissionAmounts } from "@/lib/fx";

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  description: SITE.description,
  alternates: { canonical: "/" },
};




const CONTROL = [
  { t: "Every fact is yours", d: "Agents only use what's in your profile. When your documents disagree, you pick." },
  { t: "You sign every packet", d: "Nothing goes to a school until you've read it and signed." },
  { t: "Emails you can take back", d: "Outgoing emails wait a few minutes so you can undo them." },
  { t: "One stop button", d: "Pause every agent at once. Passwords stay encrypted; card details never reach us." },
];

const LIBRARY: [string, string, string][] = [
  ["/guides/how-to-get-application-fee-waivers", "How to get application fee waivers", "Who qualifies, how international applicants get them, and the email that works."],
  ["/guides/fully-funded-masters-scholarships-international-students", "Fully funded master's scholarships", "Chevening, Commonwealth, Erasmus Mundus, DAAD and more, with deadlines."],
  ["/guides/fully-funded-phd-how-funding-works", "Fully funded PhDs", "How PhD funding works in the US, UK, Canada and Europe."],
  ["/guides/scholarships-for-nigerian-and-african-students", "Scholarships for Nigerian and African students", "What's open to you, and what changed in 2026."],
  ["/guides/statement-of-purpose-guide", "Writing a statement of purpose", "A structure that works, and the mistakes that sink strong applicants."],
  ["/guides/best-ai-tools-for-university-applications", "AI tools for applications", "Which tool does which job, and where each one stops."],
];

export default async function Home() {
  // signed in already: the header takes you back into the app instead of offering sign-in
  const signedIn = !!(await requireUser().catch(() => null));
  // prices by where the visitor is (Vercel's country header): submission packs in Africa, a monthly plan elsewhere
  const price = pricingFor((await headers()).get("x-vercel-ip-country"), await submissionAmounts().catch(() => null));
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <SiteJsonLd faq={FAQ} />
      <SiteHeader signedIn={signedIn} />

      <main id="main" tabIndex={-1}>
        <section className="relative" aria-labelledby="hero">
          <CampusInk className="absolute inset-x-0 top-0 h-[660px] w-full" />
          <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:pt-24">
            <HeroIn>
              <h1 id="hero" className="mx-auto max-w-3xl text-[46px] leading-[1.04] sm:text-[76px]">
                Your university applications, done for you.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-lg">
                Tell Ivyward about yourself once. Agents find programs that fit, draft and fact-check your essays, fill in every portal, and chase fee waivers and funding. You review and sign.
              </p>
              <form action="/login" className="mx-auto mt-10 max-w-2xl text-left">
                <input type="hidden" name="mode" value="signup" />
                <label htmlFor="goal" className="mb-2 block text-sm font-medium">
                  What do you want to study?
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="goal"
                    name="goal"
                    placeholder="e.g. a master's in finance, in Canada or the UK"
                    className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] shadow-[0_1px_2px_rgb(9_9_11/0.04)] outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/5"
                  />
                  <button className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-7 text-[15px] font-medium text-on-ink transition-opacity hover:opacity-90">
                    Start free <ArrowRight className="size-4" aria-hidden />
                  </button>
                </div>
                <p className="mt-2.5 text-[13px] text-muted">
                  {price.model === "pack" ? `Free to prepare. Then ${price.label}, used as your applications go in.` : `Your first ${price.free} applications are free. No card needed.`} Nothing goes to a school until you sign.
                </p>
              </form>
            </HeroIn>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-20" aria-label="What the agents do">
          <ProductTabs />
        </section>

        <section className="border-y border-line bg-surface/60 px-5 py-12">
          <p className="mx-auto max-w-3xl text-balance text-center font-serif text-[22px] leading-snug sm:text-[27px]">
            For bachelor&apos;s, master&apos;s, MBA and PhD applicants, applying to schools in any country with an online application.
          </p>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24" aria-labelledby="how-h">
          <SectionHead id="how-h" one="A whole application season," two="run for you." sub="Five stages, from your first upload to the funding conversation after an admit." />
          <SeasonSteps />
        </section>

        <WhoSection />

        <CompareSection />

        <section className="mx-auto max-w-6xl px-5 py-24" aria-labelledby="control-h">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 id="control-h" className="font-serif text-[36px] leading-tight sm:text-[44px]">
                You stay in charge.
              </h2>
              <p className="mt-4 max-w-md text-[17px] text-muted">Agents do the legwork. Anything that speaks for you waits for your yes.</p>
            </div>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {CONTROL.map((c) => (
                <div key={c.t} className="border-l border-line pl-5">
                  <dt className="font-medium">{c.t}</dt>
                  <dd className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{c.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24" aria-labelledby="lib-h">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <h2 id="lib-h" className="font-serif text-[36px] leading-tight sm:text-[44px]">
              Free guides to getting in, and getting it paid for.
            </h2>
            <Link href="/guides" className="text-[15px] font-medium text-brand underline decoration-current/30 underline-offset-4">
              All guides
            </Link>
          </div>
          <ul className="mt-2 grid gap-x-10 sm:grid-cols-2">
            {LIBRARY.map(([href, t, d]) => (
              <li key={href} className="border-b border-line">
                <Link href={href} className="group block py-5">
                  <span className="font-serif text-[20px] leading-snug group-hover:text-brand">{t}</span>
                  <span className="mt-1 block text-[14.5px] leading-relaxed text-muted">{d}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-24" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-center font-serif text-[36px] leading-tight sm:text-[44px]">
            Questions people ask.
          </h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="group py-5" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                  <h3 className="font-sans text-[16px] font-medium">{q}</h3>
                  <span className="text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-line" aria-labelledby="cta-h">
          <CampusInk className="absolute inset-x-0 bottom-0 h-[420px] w-full opacity-70" />
          <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
            <h2 id="cta-h" className="font-serif text-[52px] leading-none sm:text-[84px]">
              {SITE.tagline}
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-[17px] text-muted">Upload your CV and watch your shortlist take shape in minutes. Free, and nothing goes to a school until you sign.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/login?mode=signup" size="lg">
                Start free <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/pricing" size="lg" variant="secondary">
                See pricing
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
