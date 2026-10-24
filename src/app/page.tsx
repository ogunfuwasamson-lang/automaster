import Link from "next/link";
import { ShieldCheck, Undo2, Hand, Fingerprint } from "lucide-react";
import { DeparturesBoard, type BoardRow } from "@/components/ui/board";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: { absolute: "automaster: your university applications, done for you" } };

// illustrative only: a season in progress
const SAMPLE: BoardRow[] = [
  { id: "1", departs: "2026-11-15", school: "Toronto", program: "MSc Management Analytics", status: "Submitted", tone: "go" },
  { id: "2", departs: "2026-12-01", school: "Edinburgh", program: "MSc Finance", status: "Writing", tone: "plain" },
  { id: "3", departs: "2026-12-10", school: "Munich", program: "MSc Management & Technology", status: "Needs you", tone: "signal" },
  { id: "4", departs: "2027-01-05", school: "Singapore", program: "MSc Business Analytics", status: "Shortlisted", tone: "plain" },
  { id: "5", departs: "2027-01-15", school: "Boston", program: "MS Entrepreneurship", status: "Admitted", tone: "go" },
];

const STEPS = [
  { t: "Tell us about you", d: "Upload your CV and transcripts, then talk to the interviewer for ten minutes. It fills in your profile and asks only what's missing." },
  { t: "Get your shortlist", d: "Agents search the regions you pick, starting from the top-ranked schools, and keep the programs you can realistically get into." },
  { t: "Approve your essays", d: "Drafts are written from facts in your profile and checked for any claim you couldn't back up. You edit, then sign." },
  { t: "Agents submit", d: "They find each portal, create your account, fill every page and upload your documents. You're asked only for bot checks and fees." },
  { t: "Work every admit for money", d: "After an offer, agents look for merit reconsideration, assistantships and scholarships, and draft the emails." },
];

const CONTROL = [
  { icon: Fingerprint, t: "Every fact is yours", d: "Agents only use what's in your profile. When your documents disagree, you pick." },
  { icon: Hand, t: "You sign every packet", d: "Nothing goes to a school until you've read it and signed." },
  { icon: Undo2, t: "Emails you can take back", d: "Outgoing emails wait a few minutes so you can undo them." },
  { icon: ShieldCheck, t: "One stop button", d: "Pause every agent at once. Passwords stay encrypted; card details never reach us." },
];

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/pricing" className="rounded-lg px-3 py-2 text-muted hover:text-foreground">Pricing</Link>
          <Link href="/login" className="rounded-lg px-3 py-2 text-muted hover:text-foreground">Sign in</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1fr_1.1fr] lg:pt-14">
          <div>
            <h1 className="font-display text-[3.4rem] font-bold leading-[0.92] tracking-tight sm:text-7xl">
              Your university applications, done for you.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Tell automaster about yourself once. Agents find programs that fit, draft and fact-check your essays, fill in every
              portal, and chase fee waivers and funding. You review and sign.
            </p>
            <p className="mt-3 text-[15px] text-muted">Bachelor&apos;s, master&apos;s and PhD, in any country.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/login?mode=signup" size="lg">Start free</ButtonLink>
              <ButtonLink href="/pricing" size="lg" variant="secondary">See pricing</ButtonLink>
            </div>
          </div>
          <DeparturesBoard rows={SAMPLE} title="Departures, fall 2027" />
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-display text-4xl font-semibold tracking-tight">How a season runs</h2>
            <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.t} className="relative">
                  <span className="font-display text-5xl font-bold leading-none text-signal tabular">{i + 1}</span>
                  <h3 className="mt-3 font-semibold">{s.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-4xl font-semibold tracking-tight">You stay in charge</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {CONTROL.map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold">{t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap items-center gap-4 rounded-2xl bg-board px-6 py-7 text-flap sm:px-8">
            <p className="font-display text-3xl font-semibold tracking-tight">Start with one application, free.</p>
            <ButtonLink href="/login?mode=signup" variant="signal" size="lg" className="sm:ml-auto">Start free</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <Wordmark small />
          <span>Application fees are paid to schools directly. Agents ask for waivers first.</span>
        </div>
      </footer>
    </div>
  );
}
