import type { Metadata } from "next";
import Link from "next/link";
import { SCHOLARSHIPS } from "@/content";
import { Script } from "@/components/seo/json-ld";
import { Cta, Faq, LibraryShell } from "@/components/library/library";
import { SITE } from "@/lib/site";
import { Finder } from "./finder";

export const metadata: Metadata = {
  title: "Scholarship finder: which fully funded scholarships can you apply for?",
  description: "Enter your citizenship, level, work experience and age to see which major fully funded scholarships (Chevening, Commonwealth, Erasmus Mundus, DAAD, MEXT, GKS and more) are worth applying for.",
  alternates: { canonical: "/tools/scholarship-finder" },
};

const FAQ: [string, string][] = [
  ["How do I know which scholarships I'm eligible for?", "Start with citizenship, level, work experience and age: those four rule most awards in or out. Then read the full rules on each official page. This finder screens for the first four."],
  ["Is this scholarship finder free?", "Yes. It runs in your browser and doesn't store your answers."],
  ["Can Ivyward apply to scholarships for me?", "Yes. Ivyward finds scholarships that match your full profile, drafts the essays from your own record and applies once you sign."],
];

export default function FinderPage() {
  return (
    <LibraryShell crumbs={[["Tools", "/tools/scholarship-finder"], ["Scholarship finder", "/tools/scholarship-finder"]]}>
      <Script
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Ivyward scholarship finder",
          url: `${SITE.url}/tools/scholarship-finder`,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          publisher: { "@id": `${SITE.url}/#org` },
        }}
      />
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:pt-16">
        <h1 className="max-w-3xl text-[42px] leading-[1.05] sm:text-[56px]">Which scholarships can you go for?</h1>
        <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-muted">
          A quick screen of the major fully funded scholarships by the four rules that decide most of them. It runs in your browser and saves nothing. Always confirm on the official page; each result links to our profile, which links to it.
        </p>
        <div className="mt-10">
          <Finder items={SCHOLARSHIPS.map((s) => ({ slug: s.slug, name: s.name, country: s.country, levels: s.levels, funding: s.funding }))} />
        </div>
        <div className="max-w-3xl">
          <Faq items={FAQ} />
          <p className="mt-8 text-[15px]">
            Also see <Link href="/guides/fully-funded-masters-scholarships-international-students" className="text-brand underline decoration-current/30 underline-offset-4">fully funded master&apos;s scholarships</Link> and the{" "}
            <Link href="/guides/application-deadlines-2027-intake" className="text-brand underline decoration-current/30 underline-offset-4">2027 deadline calendar</Link>.
          </p>
          <Cta title="Get matched on your whole profile" body="Ivyward searches by every eligibility hook you have (field, gender, region, employer, background), not just these four, then drafts and submits the applications you approve." />
        </div>
      </div>
    </LibraryShell>
  );
}
