import type { Metadata } from "next";
import { Crumbs, Cta, LibraryShell, ShortAnswer } from "@/components/library/library";
import { PageLinks } from "@/components/library/programme-page";
import { publicProgrammes, todayISO } from "@/lib/programme-data";
import { monthName, monthsAhead } from "@/lib/programme-pages";

// read from the database on request (it isn't reachable while the site is built); the library itself is cached for an hour
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "University application deadlines by month",
  description: "Master's, PhD and bachelor's application deadlines for international students, month by month, checked on official pages.",
  alternates: { canonical: "/deadlines" },
};

export default async function Deadlines() {
  const today = todayISO();
  const months = monthsAhead(await publicProgrammes(), today, 12);
  return (
    <LibraryShell crumbs={[["Deadlines", "/deadlines"]]}>
      <div className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Deadlines", "/deadlines"]]} />
        <h1 className="mt-5 text-[38px] leading-[1.06] sm:text-[52px]">Application deadlines by month</h1>
        <ShortAnswer>
          Most master&apos;s and PhD deadlines for the next autumn intake fall between November and March, with scholarship rounds usually earlier. Pick a month to see every deadline we&apos;ve checked, soonest first.
        </ShortAnswer>
        <PageLinks title="Months" links={months.map((m) => ({ href: `/deadlines/${m.month}`, label: monthName(m.month), count: m.count }))} />
        <Cta title="Never miss one" body="Ivyward tracks every deadline on your list and its agents start each application early enough to finish it. You sign before anything goes." href="/match" label="Find my matches" />
      </div>
    </LibraryShell>
  );
}
