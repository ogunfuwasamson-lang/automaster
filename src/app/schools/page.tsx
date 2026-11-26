import type { Metadata } from "next";
import Link from "next/link";
import { Cta, LibraryShell } from "@/components/library/library";
import { UNIVERSITIES } from "@/content/universities";
import { COUNTRIES, COUNTRY_NAME, COUNTRY_SLUG, REGION_WORD, regions, type Country } from "@/lib/directory";

// rendered on request (the list comes from the database, which the build can't reach), cached in memory a day
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "University directory: how to apply to every school",
  description: "Every degree-granting university and college in the US, UK, Canada, Australia, France and China, from the official registers, with how to apply.",
  alternates: { canonical: "/schools" },
};

const SOURCE: Record<Country, string> = {
  US: "from the U.S. Department of Education's IPEDS",
  GB: "from the OfS, SFC, Medr and DfENI registers",
  CA: "from IRCC's list of designated learning institutions",
  AU: "from the CRICOS register of the Department of Education",
  FR: "from the Ministry of Higher Education and Research's list",
  CN: "from the Ministry of Education's national list",
};

export default async function Schools() {
  const lists = await Promise.all(COUNTRIES.map(async (c) => ({ c, n: (await regions(c)).reduce((n, r) => n + r.count, 0) })));
  return (
    <LibraryShell crumbs={[["Schools", "/schools"]]}>
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <header className="max-w-3xl">
          <h1 className="text-[42px] leading-[1.05] sm:text-[60px]">Every school, and how to apply.</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-muted">Degree-granting universities and colleges from the official registers, each with its admissions and application links and what applying from abroad involves.</p>
        </header>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {lists
            .filter((x) => x.n)
            .map(({ c, n }) => (
              <Link key={c} href={`/schools/${COUNTRY_SLUG[c]}`} className="group rounded-2xl border border-line bg-surface p-6 transition hover:border-foreground/30">
                <span className="font-serif text-[28px] group-hover:text-brand">{COUNTRY_NAME[c]}</span>
                <span className="mt-1 block text-[15px] text-muted">
                  {n.toLocaleString("en")} schools. By {REGION_WORD[c]}, {SOURCE[c]}
                </span>
              </Link>
            ))}
        </div>
        <p className="mt-10 max-w-3xl text-[15.5px] leading-relaxed">
          Looking for deadlines and funding at a specific top university? We have detailed guides for {UNIVERSITIES.length} of them: <Link href="/universities" className="text-brand underline decoration-current/30 underline-offset-4">how to apply, school by school</Link>.
        </p>
        <div className="max-w-3xl">
          <Cta title="Let the agents apply for you" body="Ivyward's agents handle every application portal: accounts, forms, uploads, fee waivers and follow-ups. You review and sign each application." />
        </div>
      </div>
    </LibraryShell>
  );
}
