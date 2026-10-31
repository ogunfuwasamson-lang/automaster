import type { Metadata } from "next";
import Link from "next/link";
import { UNIVERSITIES } from "@/content/universities";
import { ItemListJsonLd } from "@/components/seo/json-ld";
import { Cta, LibraryShell } from "@/components/library/library";

export const metadata: Metadata = {
  title: "How to apply to top universities as an international student",
  description:
    "Application guides for universities international students apply to most: Harvard, MIT, Stanford, Oxford, Cambridge, Imperial, LSE, Toronto, McGill, UBC, TUM, ETH Zurich and more. Deadlines, funding, fee waivers and visa rules.",
  alternates: { canonical: "/universities" },
};

export default function Universities() {
  const countries = [...new Set(UNIVERSITIES.map((u) => u.country))];
  return (
    <LibraryShell crumbs={[["Universities", "/universities"]]}>
      <ItemListJsonLd path="/universities" name="How to apply to universities" items={UNIVERSITIES.map((u) => [`How to apply to ${u.name}`, `/universities/${u.slug}`])} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <header className="max-w-3xl">
          <h1 className="text-[42px] leading-[1.05] sm:text-[60px]">How to apply, school by school.</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-muted">How graduate applications work at the universities our applicants choose most: who admits you, when they close, where the money comes from, and the visa rules that apply.</p>
        </header>
        <div className="mt-14 space-y-14">
          {countries.map((c) => (
            <section key={c} id={c.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24" aria-labelledby={`u-${c}`}>
              <h2 id={`u-${c}`} className="border-b border-line pb-3 font-serif text-[30px]">
                {c}
              </h2>
              <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {UNIVERSITIES.filter((u) => u.country === c).map((u) => (
                  <li key={u.slug}>
                    <Link href={`/universities/${u.slug}`} className="group flex items-baseline justify-between gap-3 border-b border-line py-3.5">
                      <span className="font-serif text-[19px] group-hover:text-brand">{u.name}</span>
                      <span className="shrink-0 text-[13px] text-muted">{u.city.split(",")[0]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="max-w-3xl">
          <Cta title="Applying to several of these?" body="Ivyward's agents handle every portal: accounts, forms, uploads, fee waivers and follow-ups. You review and sign each application." />
        </div>
      </div>
    </LibraryShell>
  );
}
