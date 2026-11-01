import type { Metadata } from "next";
import Link from "next/link";
import { ORIGINS } from "@/content/countries";
import { ItemListJsonLd } from "@/components/seo/json-ld";
import { Cta, LibraryShell } from "@/components/library/library";

export const metadata: Metadata = {
  title: "Study abroad by home country: scholarships and visa rules for your nationality",
  description: "Pick your country to see which fully funded scholarships are open to you, the 2026–27 visa rules for your nationality, and how to apply for a bachelor's, master's or PhD abroad.",
  alternates: { canonical: "/study-abroad" },
};

export default function StudyAbroad() {
  const regions = [...new Set(ORIGINS.map((o) => o.region))];
  return (
    <LibraryShell crumbs={[["Study abroad", "/study-abroad"]]}>
      <ItemListJsonLd path="/study-abroad" name="Study abroad by home country" items={ORIGINS.map((o) => [`Study abroad from ${o.name}`, `/study-abroad/${o.slug}`])} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <header className="max-w-3xl">
          <h1 className="text-[42px] leading-[1.05] sm:text-[60px]">Where are you applying from?</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-muted">Scholarship rules and visa rules depend on your citizenship. Pick your country to see what&apos;s open to you.</p>
        </header>
        <div className="mt-12 space-y-12">
          {regions.map((r) => (
            <section key={r} id={r.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24" aria-labelledby={`r-${r}`}>
              <h2 id={`r-${r}`} className="border-b border-line pb-3 font-serif text-[28px]">
                {r}
              </h2>
              <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
                {ORIGINS.filter((o) => o.region === r).map((o) => (
                  <li key={o.slug}>
                    <Link href={`/study-abroad/${o.slug}`} className="block border-b border-line py-3 font-serif text-[18.5px] hover:text-brand">
                      {o.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="max-w-3xl">
          <Cta title="Your country isn't listed?" body="Ivyward checks every scholarship against your citizenship whatever country you're from. Start free." />
        </div>
      </div>
    </LibraryShell>
  );
}
