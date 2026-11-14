import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Cta, LibraryShell, ShortAnswer } from "@/components/library/library";
import { PageLinks } from "@/components/library/programme-page";
import { ItemListJsonLd } from "@/components/seo/json-ld";
import { publicProgrammes, todayISO } from "@/lib/programme-data";
import { DESTINATIONS, FIELD_PAGES, allPages, monthName, monthsAhead, pathOf } from "@/lib/programme-pages";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Programmes by country and field, with deadlines and fees",
  description: "Master's, PhD and bachelor's programmes for international students, by destination and field, with deadlines, tuition, GRE and English rules and funding, checked on official pages.",
  alternates: { canonical: "/programmes" },
};

const LABEL: Record<string, string> = { phd: "PhD", bachelors: "Bachelor's", "without-gre": "Without the GRE", "english-medium-letter": "Without IELTS", "fully-funded": "Full funding realistic" };

// the hub for every programme list (lib/programme-pages): by destination, by field, and the special lists
export default async function Programmes() {
  const today = todayISO();
  const all = await publicProgrammes();
  const pages = allPages(all, today);
  const months = monthsAhead(all, today);
  const countries = new Set(all.map((p) => p.country).filter(Boolean)).size;
  const schools = new Set(all.map((p) => p.school)).size;
  return (
    <LibraryShell crumbs={[["Programmes", "/programmes"]]}>
      <ItemListJsonLd path="/programmes" name="Programme lists for international students" items={pages.map((p) => [pathOf(p.key), pathOf(p.key)])} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Programmes", "/programmes"]]} />
        <header className="mt-5 max-w-3xl">
          <h1 className="text-[38px] leading-[1.06] sm:text-[52px]">Programmes for international students</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            {all.length.toLocaleString("en")} programmes at {schools} schools in {countries} countries, each checked on the school&apos;s own pages by Ivyward&apos;s agents: the next deadline, tuition, whether the GRE is needed, whether an English-medium letter is accepted instead of IELTS, and how realistic full funding is.
          </p>
        </header>
        <div className="max-w-3xl">
          <ShortAnswer>
            Pick where you want to study, then narrow by field. Every list links each programme to its official page. The lists grow as our agents research programmes for applicants, and pages update every few hours.
          </ShortAnswer>
        </div>
        {DESTINATIONS.map((d) => {
          const mine = pages.filter((p) => p.key.dest.slug === d.slug);
          if (!mine.length) return null;
          const main = mine.find((p) => p.key.kind === "masters");
          return (
            <section key={d.slug} className="mt-12">
              <h2 className="font-serif text-[28px]">
                {main ? <Link href={pathOf(main.key)} className="hover:text-brand">{d.name.replace(/^the /, "").replace(/^\w/, (c) => c.toUpperCase())}</Link> : d.name}
                {main ? <span className="ml-2 text-[15px] text-muted">{main.count} master&apos;s</span> : null}
              </h2>
              <PageLinks title="" links={mine.filter((p) => p.key.kind !== "masters").map((p) => ({ href: pathOf(p.key), label: p.key.kind === "field" ? p.key.field.name : LABEL[p.key.kind], count: p.count }))} />
            </section>
          );
        })}
        <PageLinks title="Application deadlines by month" links={months.map((m) => ({ href: `/deadlines/${m.month}`, label: monthName(m.month), count: m.count }))} />
        <PageLinks
          title="By field, every destination"
          links={FIELD_PAGES.filter((f) => pages.some((p) => p.key.kind === "field" && p.key.field.slug === f.slug)).map((f) => {
            const first = pages.find((p) => p.key.kind === "field" && p.key.field.slug === f.slug)!;
            return { href: pathOf(first.key), label: f.name };
          })}
        />
        <div className="max-w-3xl">
          <Cta title="Not sure where to start?" body="Tell Ivyward your level, field and where you'd like to study. It shows the programmes that fit in under a minute, then its agents handle the applications." href="/match" label="Find my matches" />
        </div>
      </div>
    </LibraryShell>
  );
}
