import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { HeroIn } from "@/components/landing/hero-motion";
import { CampusInk } from "@/components/landing/campus-ink";
import { ProductTabs } from "@/components/landing/product-tabs";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { requireUser } from "@/lib/supabase/server";
import { FAQ } from "@/lib/faq";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  description: SITE.description,
  alternates: { canonical: "/" },
};

const STEPS = [
  { t: "Tell us about you", d: "Upload your CV and transcripts, then talk to the interviewer for ten minutes. It fills your profile and asks only what's missing." },
  { t: "Get your shortlist", d: "Agents search the regions you pick, from the top-ranked schools down, and keep the programs you can realistically get into." },
  { t: "Approve your essays", d: "Drafts are written from facts in your profile and checked for any claim you couldn't back up. You edit, then sign." },
  { t: "Agents submit", d: "They find each portal, create your account, fill every page and upload your documents. You step in only for bot checks and fees." },
  { t: "Work every admit for money", d: "After an offer, agents look for merit reconsideration, assistantships and scholarships, and draft the emails." },
];

const WHO = [
  { t: "Applying from abroad", d: "Every country has its own portals, document rules and deadlines. The agents read each school's own pages, so you aren't decoding the rules yourself." },
  { t: "Working while you apply", d: "Short on evenings? The agents handle the forms, uploads and follow-ups. Your time goes on your essays and your decisions." },
  { t: "Applying for funding", d: "Fee waivers, scholarships, assistantships, merit reconsideration: the agents ask wherever it's worth asking, and tell you what came back." },
];

// what changes with Ivyward, row by row. kept factual: no numbers we can't stand behind.
const COMPARE: { row: string; self: string; consultant: string; ivyward: string }[] = [
  { row: "Finding programs", self: "Hours on rankings and program pages", consultant: "A list from their experience", ivyward: "Agents check each program's official pages against your profile" },
  { row: "Essays", self: "Written from scratch for every school", consultant: "Edited with you over several calls", ivyward: "Drafted from your own facts and fact-checked. You edit and sign" },
  { row: "Application portals", self: "Every page, for every school, by you", consultant: "Usually still you", ivyward: "Accounts created, pages filled, documents uploaded for you" },
  { row: "Fees and funding", self: "Up to you to ask", consultant: "Advice on where to ask", ivyward: "Agents ask for fee waivers, scholarships and merit aid" },
  { row: "Cost", self: "Your time", consultant: "Often charged per school or as a package", ivyward: "Free for up to 15 applications" },
];

const CONTROL = [
  { t: "Every fact is yours", d: "Agents only use what's in your profile. When your documents disagree, you pick." },
  { t: "You sign every packet", d: "Nothing goes to a school until you've read it and signed." },
  { t: "Emails you can take back", d: "Outgoing emails wait a few minutes so you can undo them." },
  { t: "One stop button", d: "Pause every agent at once. Passwords stay encrypted; card details never reach us." },
];

export default async function Home() {
  // signed in already: the header takes you back into the app instead of offering sign-in
  const signedIn = !!(await requireUser().catch(() => null));
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <SiteJsonLd faq={FAQ} />
      <SiteHeader signedIn={signedIn} />

      <main>
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
                <p className="mt-2.5 text-[13px] text-muted">Free for up to 15 applications. No card needed. Nothing goes to a school until you sign.</p>
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
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="how-h" className="font-serif text-[36px] leading-tight sm:text-[48px]">
              A whole application season, run for you.
            </h2>
            <p className="mt-4 text-[17px] text-muted">Five stages, from your first upload to the funding conversation after an admit.</p>
          </div>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.t} className="bg-surface p-6">
                <span className="font-serif text-[15px] text-brand tabular">{i + 1}</span>
                <h3 className="mt-3 font-serif text-[21px] leading-snug">{s.t}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24" aria-labelledby="who-h">
          <h2 id="who-h" className="max-w-xl font-serif text-[34px] leading-tight sm:text-[42px]">
            Made for the applications that take the most out of you.
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {WHO.map((w) => (
              <div key={w.t} className="border-t-2 border-ink pt-5">
                <h3 className="font-serif text-[22px] leading-snug">{w.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{w.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="compare" className="scroll-mt-20 border-y border-line bg-surface/60 py-24" aria-labelledby="compare-h">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <h2 id="compare-h" className="font-serif text-[34px] leading-tight sm:text-[42px]">
                On your own, with a consultant, or with Ivyward.
              </h2>
              <p className="mt-4 text-[17px] text-muted">The same application season, three ways. In every one of them, you sign your own applications.</p>
            </div>
            <div className="mt-12 overflow-hidden rounded-xl border border-line bg-surface" role="table" aria-label="Ivyward compared with applying on your own or with a consultant">
              <div role="row" className="hidden grid-cols-[1fr_1.2fr_1.2fr_1.4fr] border-b border-line text-[13px] text-muted sm:grid">
                <span role="columnheader" className="px-5 py-3.5" />
                <span role="columnheader" className="px-5 py-3.5">On your own</span>
                <span role="columnheader" className="px-5 py-3.5">With a consultant</span>
                <span role="columnheader" className="bg-ink/[0.035] px-5 py-3.5 font-medium text-foreground dark:bg-white/[0.04]">
                  With Ivyward
                </span>
              </div>
              {COMPARE.map((c) => (
                <div key={c.row} role="row" className="grid border-b border-line last:border-0 sm:grid-cols-[1fr_1.2fr_1.2fr_1.4fr]">
                  <span role="rowheader" className="px-5 pb-1 pt-5 font-medium sm:py-5">
                    {c.row}
                  </span>
                  <span role="cell" className="px-5 py-1.5 text-[14.5px] text-muted sm:py-5">
                    <span className="mr-1.5 text-xs text-neutral-400 sm:hidden">On your own:</span>
                    {c.self}
                  </span>
                  <span role="cell" className="px-5 py-1.5 text-[14.5px] text-muted sm:py-5">
                    <span className="mr-1.5 text-xs text-neutral-400 sm:hidden">Consultant:</span>
                    {c.consultant}
                  </span>
                  <span role="cell" className="bg-ink/[0.035] px-5 pb-5 pt-1.5 text-[14.5px] dark:bg-white/[0.04] sm:py-5">
                    <span className="mr-1.5 text-xs font-medium sm:hidden">Ivyward:</span>
                    {c.ivyward}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

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
