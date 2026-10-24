import { ThemeButton } from "@/components/theme";
import Link from "next/link";
import { ArrowRight, Check, Compass, FileSignature, Fingerprint, Globe, Hand, PenLine, Search, ShieldCheck, Sparkles, Undo2, UserRound, Banknote } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status";
import { Wordmark } from "@/components/wordmark";
import { SchoolTile } from "@/components/home/app-list";
import { HeroIn, FloatChip } from "@/components/landing/hero-motion";

export const metadata = { title: { absolute: "automaster: your university applications, done for you" } };

// illustrative only: a season in progress
const SAMPLE = [
  { school: "University of Toronto", program: "MSc Management Analytics", due: "Nov 15", status: "submitted", done: 3, total: 3 },
  { school: "University of Edinburgh", program: "MSc Finance", due: "Dec 1", status: "preparing", done: 1, total: 2 },
  { school: "TU Munich", program: "MSc Management and Technology", due: "Dec 10", status: "ready_for_review", done: 2, total: 3 },
  { school: "NUS Business School", program: "MSc Business Analytics", due: "Jan 5", status: "packet_approved", done: 2, total: 2 },
];

const STEPS = [
  { icon: UserRound, tone: "text-indigo-600 bg-indigo-50", t: "Tell us about you", d: "Upload your CV and transcripts, then talk to the interviewer for ten minutes. It fills your profile and asks only what's missing." },
  { icon: Search, tone: "text-emerald-600 bg-emerald-50", t: "Get your shortlist", d: "Agents search the regions you pick, from the top-ranked schools down, and keep the programs you can realistically get into." },
  { icon: PenLine, tone: "text-pink-600 bg-pink-50", t: "Approve your essays", d: "Drafts are written from facts in your profile and checked for any claim you couldn't back up. You edit, then sign." },
  { icon: Globe, tone: "text-cyan-700 bg-cyan-50", t: "Agents submit", d: "They find each portal, create your account, fill every page and upload your documents. You step in only for bot checks and fees." },
  { icon: Banknote, tone: "text-amber-600 bg-amber-50", t: "Work every admit for money", d: "After an offer, agents look for merit reconsideration, assistantships and scholarships, and draft the emails." },
];

const CONTROL = [
  { icon: Fingerprint, t: "Every fact is yours", d: "Agents only use what's in your profile. When your documents disagree, you pick." },
  { icon: Hand, t: "You sign every packet", d: "Nothing goes to a school until you've read it and signed." },
  { icon: Undo2, t: "Emails you can take back", d: "Outgoing emails wait a few minutes so you can undo them." },
  { icon: ShieldCheck, t: "One stop button", d: "Pause every agent at once. Passwords stay encrypted; card details never reach us." },
];

function Preview() {
  return (
    <div className="relative mx-auto max-w-5xl text-left">
      <div className="absolute -inset-x-10 -bottom-10 top-10 rounded-[48px] bg-[linear-gradient(135deg,#a5b4fc,#67e8f9_50%,#f9a8d4)] opacity-40 blur-3xl dark:opacity-20" aria-hidden />
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-surface/80 p-2 shadow-[0_40px_80px_-30px_rgb(15_18_34/0.35)] backdrop-blur-xl dark:border-white/10">
        <div className="flex items-center gap-1.5 px-3 py-2" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="mx-auto hidden rounded-lg bg-neutral-100 px-12 py-1 text-[11px] text-muted sm:block dark:bg-neutral-800">automaster.app/dashboard</span>
        </div>
        <div className="grid min-w-0 gap-3 rounded-[22px] bg-background p-3 sm:p-4 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="bg-hero-gradient relative overflow-hidden rounded-3xl p-5 text-white">
            <span className="absolute -right-12 -top-12 size-40 rounded-full border-[30px] border-white/[0.08]" aria-hidden />
            <p className="text-xs font-semibold text-white/80">Next deadline</p>
            <div className="mt-3 flex gap-2">
              {[["12", "days"], ["06", "hours"], ["41", "min"]].map(([n, l]) => (
                <div key={l} className="rounded-xl border border-white/20 bg-white/12 px-3 py-1.5 text-center">
                  <span className="block text-2xl font-bold tracking-[-0.04em]">{n}</span>
                  <span className="text-[10px] text-white/75">{l}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-lg font-bold tracking-[-0.02em]">University of Edinburgh</p>
            <p className="text-xs text-white/80">MSc Finance. Closes December 1.</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#0f1222]">
              <Check className="size-3.5 text-emerald-600" aria-hidden /> Essays fact-checked
            </div>
          </div>
          <div className="min-w-0 rounded-3xl border border-line bg-surface p-4 shadow-card">
            <p className="mb-2 text-sm font-bold">Your applications</p>
            <ul>
              {SAMPLE.map((r) => (
                <li key={r.school} className="flex items-center gap-3 py-2">
                  <SchoolTile name={r.school} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">{r.school}</span>
                    <span className="block truncate text-[11.5px] text-muted">{r.program}</span>
                  </span>
                  <span className="hidden w-20 sm:block">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <span className="block h-full rounded-full bg-bar-gradient" style={{ width: `${(r.done / r.total) * 100}%` }} />
                    </span>
                  </span>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <FloatChip className="-left-20 -top-6 hidden xl:flex" delay={0.9}>
        <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <FileSignature className="size-4" aria-hidden />
        </span>
        <span>
          <span className="block text-[13px] font-bold">Toronto submitted</span>
          <span className="text-[11px] text-muted">Confirmation saved</span>
        </span>
      </FloatChip>
      <FloatChip className="-bottom-8 -right-16 hidden xl:flex" delay={1.2}>
        <span className="grid size-8 place-items-center rounded-xl bg-pink-50 text-pink-600">
          <PenLine className="size-4" aria-hidden />
        </span>
        <span>
          <span className="block text-[13px] font-bold">Draft 2 is ready</span>
          <span className="text-[11px] text-muted">Every claim matches your profile</span>
        </span>
      </FloatChip>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="aurora !h-[640px]" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <ThemeButton />
          <Link href="/pricing" className="hidden rounded-xl px-3 py-2 text-muted hover:text-foreground sm:block">
            Pricing
          </Link>
          <Link href="/login" className="whitespace-nowrap rounded-xl px-3 py-2 text-muted hover:text-foreground">
            Sign in
          </Link>
          <ButtonLink href="/login?mode=signup" size="sm" className="ml-1">
            Start free
          </ButtonLink>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-10 text-center sm:pt-16">
          <HeroIn>
            <span className="glass inline-flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3.5 text-[13px] font-semibold shadow-card">
              <span className="bg-accent-gradient rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white">New</span>
              Agents now read school replies in your inbox
            </span>
            <h1 className="mx-auto mt-7 max-w-4xl text-[44px] font-bold leading-[1.02] tracking-[-0.05em] sm:text-[72px]">
              Your university applications, <span className="text-gradient">done for you.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              Tell automaster about yourself once. Agents find programs that fit, draft and fact-check your essays, fill in every portal, and chase fee waivers and funding. You review and sign.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/login?mode=signup" size="lg" variant="accent">
                Start free <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/pricing" size="lg" variant="secondary">
                See pricing
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Bachelor&apos;s, master&apos;s and PhD, in any country. One application free.</p>
          </HeroIn>
          <div className="mt-16">
            <Preview />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-[40px] sm:leading-[1.1]">How a season runs</h2>
            <p className="mt-3 text-lg text-muted">Five stages, from your first upload to the funding conversation after an admit.</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {STEPS.map((s, i) => (
              <li key={s.t} className={`group rounded-3xl border border-line bg-surface p-6 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift ${i < 2 ? "lg:col-span-3" : "lg:col-span-2"}`}>
                <div className="flex items-center justify-between">
                  <span className={`grid size-11 place-items-center rounded-2xl ${s.tone} dark:bg-white/5`}>
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-neutral-300 tabular dark:text-neutral-600">Step {i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold tracking-[-0.02em]">{s.t}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-10 rounded-[32px] border border-line bg-surface p-8 shadow-card sm:p-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Compass className="size-6" aria-hidden />
              </span>
              <h2 className="mt-6 text-3xl font-bold tracking-[-0.04em] sm:text-[40px] sm:leading-[1.1]">You stay in charge</h2>
              <p className="mt-3 text-lg text-muted">Agents do the legwork. Anything that speaks for you waits for your yes.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {CONTROL.map((c) => (
                <div key={c.t}>
                  <span className="grid size-10 place-items-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <c.icon className="size-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-bold">{c.t}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 pt-8">
          <div className="bg-hero-gradient relative overflow-hidden rounded-[32px] px-8 py-14 text-center text-white sm:px-16">
            <span className="absolute -left-20 -top-20 size-72 rounded-full border-[50px] border-white/[0.07]" aria-hidden />
            <span className="absolute -bottom-24 -right-10 size-72 rounded-full bg-cyan-300/25 blur-3xl" aria-hidden />
            <Sparkles className="relative mx-auto size-8 text-white/80" aria-hidden />
            <h2 className="relative mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-[-0.04em] sm:text-5xl sm:leading-[1.05]">Start with one application, free.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-white/80">Upload your CV and see your shortlist take shape in minutes.</p>
            <Link href="/login?mode=signup" className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-[14px] bg-white px-6 font-semibold text-[#0f1222] shadow-lg transition-transform hover:-translate-y-0.5">
              Create your account <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted">
          <Wordmark small />
          <p>Application fees are paid to schools directly. Agents ask for waivers first.</p>
        </div>
      </footer>
    </div>
  );
}
