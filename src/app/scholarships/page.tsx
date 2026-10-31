import type { Metadata } from "next";
import Link from "next/link";
import { SCHOLARSHIPS, scholarshipCountries } from "@/content";
import { ItemListJsonLd } from "@/components/seo/json-ld";
import { Cta, LibraryShell } from "@/components/library/library";

export const metadata: Metadata = {
  title: "Fully funded scholarships for international students, by country",
  description:
    "Profiles of the major fully funded master's and PhD scholarships for international students, including Chevening, Commonwealth, DAAD, Erasmus Mundus, Gates Cambridge, Knight-Hennessy, MEXT and Mastercard Foundation: who can apply, what they cover and when they close.",
  alternates: { canonical: "/scholarships" },
};

export default function Scholarships() {
  const countries = scholarshipCountries();
  return (
    <LibraryShell crumbs={[["Scholarships", "/scholarships"]]}>
      <ItemListJsonLd path="/scholarships" name="Fully funded scholarships for international students" items={SCHOLARSHIPS.map((s) => [s.name, `/scholarships/${s.slug}`])} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <header className="max-w-3xl">
          <h1 className="text-[42px] leading-[1.05] sm:text-[60px]">Scholarships that pay for everything.</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-muted">
            The large, well-established awards for international students: who funds them, who can apply, what they cover and when they usually close. Each profile links to the official page, because dates move every cycle.
          </p>
          <p className="mt-5 text-[15px]">
            Not sure which you qualify for?{" "}
            <Link href="/tools/scholarship-finder" className="font-medium text-brand underline decoration-current/30 underline-offset-4">
              Try the scholarship finder
            </Link>
            .
          </p>
          <nav aria-label="Countries" className="mt-6 flex flex-wrap gap-2">
            {countries.map((c) => (
              <a key={c} href={`#${c.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-full border border-line px-3 py-1.5 text-[13.5px] hover:border-foreground/40">
                {c}
              </a>
            ))}
          </nav>
        </header>

        <div className="mt-14 space-y-14">
          {countries.map((c) => (
            <section key={c} id={c.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24" aria-labelledby={`h-${c}`}>
              <h2 id={`h-${c}`} className="border-b border-line pb-3 font-serif text-[30px]">
                {c}
              </h2>
              <ul className="mt-2 divide-y divide-line">
                {SCHOLARSHIPS.filter((s) => s.country === c).map((s) => (
                  <li key={s.slug}>
                    <Link href={`/scholarships/${s.slug}`} className="group grid gap-1 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-baseline sm:gap-8">
                      <span className="font-serif text-[21px] leading-snug group-hover:text-brand">{s.name}</span>
                      <span className="text-[15px] leading-relaxed text-muted">{s.forWhom}</span>
                      <span className="text-[13.5px] text-muted sm:text-right">
                        {s.levels.join(", ")}
                        <br className="hidden sm:block" />
                        <span className="sm:hidden">, </span>
                        {s.funding}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="max-w-3xl">
          <Cta title="Find the ones you can actually win" body="Ivyward checks your profile against each scholarship's rules, drafts the essays from your own record, and tracks every deadline, so you apply to the awards you're eligible for, on time." />
        </div>
      </div>
    </LibraryShell>
  );
}
