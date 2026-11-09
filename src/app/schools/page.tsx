import type { Metadata } from "next";
import Link from "next/link";
import { Cta, LibraryShell } from "@/components/library/library";
import { UNIVERSITIES } from "@/content/universities";
import { COUNTRY_NAME, regions } from "@/lib/directory";

// rendered on request (the list comes from the database, which the build can't reach), cached in memory a day
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "University directory: how to apply to every school",
  description: "Every degree-granting university and college in the United States and the United Kingdom from the official registers, with admissions and application links and how international students apply.",
  alternates: { canonical: "/schools" },
};

export default async function Schools() {
  const [us, uk] = await Promise.all([regions("US"), regions("GB")]);
  const count = (l: { count: number }[]) => l.reduce((n, r) => n + r.count, 0).toLocaleString("en");
  return (
    <LibraryShell crumbs={[["Schools", "/schools"]]}>
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <header className="max-w-3xl">
          <h1 className="text-[42px] leading-[1.05] sm:text-[60px]">Every school, and how to apply.</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-muted">Degree-granting universities and colleges from the official registers, each with its admissions and application links and what applying from abroad involves.</p>
        </header>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["us", COUNTRY_NAME.US, count(us), "By state, from the U.S. Department of Education's IPEDS"],
              ["uk", COUNTRY_NAME.GB, count(uk), "By nation and region, from the OfS, SFC, Medr and DfENI registers"],
            ] as const
          ).map(([slug, name, n, src]) => (
            <Link key={slug} href={`/schools/${slug}`} className="group rounded-2xl border border-line bg-surface p-6 transition hover:border-foreground/30">
              <span className="font-serif text-[28px] group-hover:text-brand">{name}</span>
              <span className="mt-1 block text-[15px] text-muted">
                {n} schools. {src}
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
