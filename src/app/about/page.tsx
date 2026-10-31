import type { Metadata } from "next";
import Link from "next/link";
import { FACTS, SITE } from "@/lib/site";
import { FAQ } from "@/lib/faq";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { Cta, Faq, LibraryShell } from "@/components/library/library";

export const metadata: Metadata = {
  title: "About Ivyward: AI agents for university admissions, scholarships and funding",
  description:
    "What Ivyward is, who it's for, what its AI agents do and don't do, how it handles your data, and how it compares with consultants and chatbots.",
  alternates: { canonical: "/about" },
};

const DOES = [
  "Builds a shortlist of bachelor's, master's, MBA and PhD programs in the regions you choose, keeping the ones you can realistically get into",
  "Finds scholarships, assistantships and application fee waivers by every eligibility hook in your profile, not just nationality",
  "Drafts essays and statements of purpose from facts in your own profile and documents, and flags any claim you couldn't back up",
  "Creates your account on each university's application portal, fills in every page and uploads your documents",
  "Asks you when a portal needs something your profile doesn't cover, saves the answer and reuses it for every other school",
  "Emails schools for fee waivers and, after admission, for merit reconsideration and assistantships, once you approve each email",
  "Reads school replies in your connected Gmail and acts on them: verification codes, interview invitations, missing documents",
];

const DOESNT = [
  "Submit anything you haven't read and signed",
  "Invent achievements or facts",
  "Solve bot checks or CAPTCHAs: those are left to you",
  "Handle your card details: application fees are paid to schools directly",
  "Take commissions from universities",
  "Use your data to train AI models",
];

export default function About() {
  return (
    <LibraryShell crumbs={[["About", "/about"]]}>
      <SiteJsonLd faq={FAQ} />
      <div className="mx-auto max-w-[760px] px-5 pb-20 pt-12 sm:pt-16">
        <h1 className="text-[42px] leading-[1.05] sm:text-[58px]">About Ivyward</h1>
        <p className="mt-6 text-[19px] leading-relaxed">
          {SITE.name} is a web app where AI agents run your university applications, from the shortlist to the submit button. It covers bachelor&apos;s, master&apos;s, MBA and PhD programs in any field, at schools in any country with an online application, and it chases the money too: application fee waivers, scholarships, assistantships and funding.
        </p>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">
          It was started in Lagos, Nigeria, because applying abroad from Africa is slow, expensive and full of gatekeepers: consultants that cost more than the applications, agents paid by the universities they recommend, and application fees that add up to months of income. Ivyward does the work for a small fee per submission and leaves every decision and signature to you.
        </p>

        <section className="mt-12">
          <h2 className="font-serif text-[30px]">What the agents do</h2>
          <ul className="prose-iv mt-3">
            {DOES.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-[30px]">What they never do</h2>
          <ul className="prose-iv mt-3">
            {DOESNT.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-[30px]">The facts</h2>
          <ul className="prose-iv mt-3">
            {FACTS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-[30px]">How it compares</h2>
          <div className="prose-iv mt-3">
            <p>
              A general chatbot can explain and draft, but it doesn&apos;t keep your record or touch a portal. An admissions consultant coaches you, usually for a large fee. A commission-based study agent is often free to you but paid by partner universities. Ivyward does the applications themselves, with no university commissions. Read{" "}
              <Link href="/guides/ivyward-vs-chatgpt-for-university-applications">Ivyward vs ChatGPT</Link> and <Link href="/guides/ivyward-vs-admissions-consultant">Ivyward vs an admissions consultant</Link>.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-[30px]">The library</h2>
          <div className="prose-iv mt-3">
            <p>
              We publish free, dated guides on <Link href="/guides/how-to-get-application-fee-waivers">application fee waivers</Link>, <Link href="/guides/fully-funded-masters-scholarships-international-students">fully funded master&apos;s scholarships</Link>,{" "}
              <Link href="/guides/fully-funded-phd-how-funding-works">funded PhDs</Link>, <Link href="/guides/statement-of-purpose-guide">statements of purpose</Link> and <Link href="/guides/student-visa-proof-of-funds">student visas</Link>, plus{" "}
              <Link href="/scholarships">profiles of the major scholarships</Link>. Each one is checked against official sources and links to them.
            </p>
          </div>
        </section>

        <Faq items={FAQ} />
        <Cta title="Start with your profile" body="Tell Ivyward about yourself once. Preparing applications is free; you pay only to submit." />
      </div>
    </LibraryShell>
  );
}
