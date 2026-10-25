import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeButton } from "@/components/theme";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { HeroIn } from "@/components/landing/hero-motion";
import { CampusInk } from "@/components/landing/campus-ink";
import { ProductTabs } from "@/components/landing/product-tabs";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: { absolute: "automaster: your university applications, done for you" } };

const STEPS = [
  { t: "Tell us about you", d: "Upload your CV and transcripts, then talk to the interviewer for ten minutes. It fills your profile and asks only what's missing." },
  { t: "Get your shortlist", d: "Agents search the regions you pick, from the top-ranked schools down, and keep the programs you can realistically get into." },
  { t: "Approve your essays", d: "Drafts are written from facts in your profile and checked for any claim you couldn't back up. You edit, then sign." },
  { t: "Agents submit", d: "They find each portal, create your account, fill every page and upload your documents. You step in only for bot checks and fees." },
  { t: "Work every admit for money", d: "After an offer, agents look for merit reconsideration, assistantships and scholarships, and draft the emails." },
];

const CONTROL = [
  { t: "Every fact is yours", d: "Agents only use what's in your profile. When your documents disagree, you pick." },
  { t: "You sign every packet", d: "Nothing goes to a school until you've read it and signed." },
  { t: "Emails you can take back", d: "Outgoing emails wait a few minutes so you can undo them." },
  { t: "One stop button", d: "Pause every agent at once. Passwords stay encrypted; card details never reach us." },
];

const FAQ = [
  ["Which degrees and countries does it cover?", "Bachelor's, master's and PhD programs in any field, in any country with an online application. You choose the regions; the agents search them."],
  ["Does it write my essays for me?", "It drafts them from facts in your profile and your interview, then checks every claim against your documents. You edit them into your own words and approve each one. Nothing is sent without your signature."],
  ["What do I still have to do myself?", "Read and sign your packets, pay application fees, and tick the odd bot check a portal shows. Everything else, from finding the portal to uploading documents, the agents do."],
  ["What happens when a portal asks something my profile doesn't cover?", "Your interviewer pops up and asks you. The answer is saved to your profile, so no other school has to ask again, and the agents carry on by themselves."],
  ["How much does it cost?", "Pro is free: every region, up to 15 applications, essays and submission. If you'd rather pay once for the whole cycle, there's a Season pass. Application fees are paid to schools directly, and the agents ask for waivers first."],
];

const REGIONS = ["United Kingdom", "Canada", "United States", "Germany", "Netherlands", "France", "Singapore", "Australia"];

export default async function Home() {
  // signed in already: the header takes you back into the app instead of offering sign-in
  const signedIn = !!(await requireUser().catch(() => null));
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
          <Wordmark />
          <nav className="hidden items-center gap-1 text-sm text-muted sm:flex">
            <a href="#how" className="px-3 py-2 hover:text-foreground">
              How it works
            </a>
            <Link href="/pricing" className="px-3 py-2 hover:text-foreground">
              Pricing
            </Link>
            <a href="#faq" className="px-3 py-2 hover:text-foreground">
              Questions
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeButton />
            {signedIn ? (
              <ButtonLink href="/dashboard" size="sm">
                Open automaster
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" size="sm" variant="secondary" className="hidden sm:inline-flex">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/login?mode=signup" size="sm">
                  Start free
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative">
          <CampusInk className="absolute inset-x-0 top-0 h-[660px] w-full" />
          <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:pt-24">
            <HeroIn>
              <h1 className="mx-auto max-w-3xl text-[46px] leading-[1.04] sm:text-[76px]">Your university applications, done for you.</h1>
              <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-lg">
                Tell automaster about yourself once. Agents find programs that fit, draft and fact-check your essays, fill in every portal, and chase fee waivers and funding. You review and sign.
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
                <div className="mt-2.5 flex flex-wrap justify-between gap-2 text-[13px] text-muted">
                  <span>Free. No card needed.</span>
                  <a href="#how" className="underline decoration-line underline-offset-4 hover:text-foreground">
                    See how a season runs
                  </a>
                </div>
              </form>
              <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-[13px] text-muted">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                Bachelor&apos;s, master&apos;s and PhD, in any field and any country
              </p>
            </HeroIn>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-24">
          <ProductTabs />
        </section>

        <section className="border-y border-line bg-surface/60 py-12">
          <p className="kicker text-center">/ Applicants on automaster apply to programs in</p>
          <ul className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 font-serif text-[20px] text-neutral-400 dark:text-neutral-500">
            {REGIONS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-[36px] leading-tight sm:text-[48px]">A whole application season, run for you.</h2>
            <p className="mt-4 text-[17px] text-muted">Five stages, from your first upload to the funding conversation after an admit.</p>
          </div>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.t} className="bg-surface p-6">
                <span className="font-serif text-[15px] text-brand tabular">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-serif text-[21px] leading-snug">{s.t}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="grid gap-12 border-t border-line pt-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="font-serif text-[36px] leading-tight sm:text-[44px]">You stay in charge.</h2>
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

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-24">
          <h2 className="text-center font-serif text-[36px] leading-tight sm:text-[44px]">Questions people ask.</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                  {q}
                  <span className="text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-line">
          <CampusInk className="absolute inset-x-0 bottom-0 h-[420px] w-full opacity-70" />
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
            <h2 className="font-serif text-[38px] leading-tight sm:text-[56px]">Let automaster run your applications.</h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] text-muted">Upload your CV and watch your shortlist take shape in minutes.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
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

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 text-sm sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Wordmark small />
            <p className="mt-3 max-w-xs text-muted">Application fees are paid to schools directly. Agents ask for waivers first.</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Product</p>
            <a href="#how" className="block text-muted hover:text-foreground">
              How it works
            </a>
            <Link href="/pricing" className="block text-muted hover:text-foreground">
              Pricing
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Account</p>
            <Link href="/login" className="block text-muted hover:text-foreground">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className="block text-muted hover:text-foreground">
              Create an account
            </Link>
            <Link href="/privacy" className="block text-muted hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="block text-muted hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
