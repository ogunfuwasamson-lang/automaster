import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY } from "@/content/glossary";
import { Script } from "@/components/seo/json-ld";
import { Cta, LibraryShell } from "@/components/library/library";
import { slugify } from "@/lib/markdown";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Admissions and scholarship glossary: CAS, I-20, PAL, fee waiver, stipend and more",
  description: "Plain definitions of the terms you'll meet applying to university abroad: fee waivers, assistantships, CAS, I-20, PAL, blocked accounts, stipends, rolling admissions and more.",
  alternates: { canonical: "/glossary" },
};

export default function Glossary() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  return (
    <LibraryShell crumbs={[["Glossary", "/glossary"]]}>
      <Script
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          "@id": `${SITE.url}/glossary#terms`,
          name: "Admissions and scholarship glossary",
          hasDefinedTerm: sorted.map((g) => ({ "@type": "DefinedTerm", name: g.term, description: g.def, url: `${SITE.url}/glossary#${slugify(g.term)}` })),
        }}
      />
      <div className="mx-auto max-w-[760px] px-5 pb-20 pt-12 sm:pt-16">
        <h1 className="text-[42px] leading-[1.05] sm:text-[56px]">Admissions glossary</h1>
        <p className="mt-5 text-[18px] leading-relaxed text-muted">The terms you&apos;ll meet applying to university abroad, in plain words.</p>
        <dl className="mt-10 divide-y divide-line border-y border-line">
          {sorted.map((g) => (
            <div key={g.term} id={slugify(g.term)} className="scroll-mt-24 py-5">
              <dt className="font-serif text-[21px]">{g.term}</dt>
              <dd className="mt-1.5 text-[15.5px] leading-relaxed text-foreground/85">
                {g.def}
                {g.link && (
                  <>
                    {" "}
                    <Link href={g.link} className="text-brand underline decoration-current/30 underline-offset-4">
                      Read more
                    </Link>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <Cta title="Don't want to learn all of this?" body="Ivyward's agents handle the forms, documents and deadlines. You review and sign." />
      </div>
    </LibraryShell>
  );
}
