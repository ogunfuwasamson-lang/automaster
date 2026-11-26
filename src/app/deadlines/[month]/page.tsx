import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLinks, ProgrammePage } from "@/components/library/programme-page";
import { publicProgrammes, todayISO } from "@/lib/programme-data";
import { DESTINATIONS, MIN_ROWS, MONTH_RE, monthName, monthRows, monthsAhead, statsOf } from "@/lib/programme-pages";
import { metaDescription } from "@/lib/meta-text";

export const revalidate = 21600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type P = { params: Promise<{ month: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { month } = await params;
  if (!MONTH_RE.test(month)) return {};
  const rows = monthRows(month, await publicProgrammes());
  if (rows.length < MIN_ROWS) return { robots: { index: false } };
  const m = monthName(month);
  return {
    title: `University application deadlines in ${m}`,
    description: metaDescription(`${rows.length} master's, PhD and bachelor's application deadlines in ${m} for international students, with tuition, test rules and funding, checked on official pages.`),
    alternates: { canonical: `/deadlines/${month}` },
  };
}

// every application deadline in one month, soonest first, across every destination
export default async function MonthDeadlines({ params }: P) {
  const { month } = await params;
  if (!MONTH_RE.test(month)) notFound();
  const today = todayISO();
  const all = await publicProgrammes();
  const list = monthRows(month, all);
  if (list.length < MIN_ROWS) notFound();
  const m = monthName(month);
  const dateOf = new Map(list.map((x) => [x.p.id, x.date]));
  const rows = list.map((x) => x.p);
  const byDest = DESTINATIONS.map((d) => ({ d, n: rows.filter((r) => r.region === d.region).length })).filter((x) => x.n);
  const s = statsOf(rows, today);
  const answer = `${rows.length} application deadlines in ${m} on our list, across ${byDest.length} destination${byDest.length === 1 ? "" : "s"}: ${byDest.map((x) => `${x.n} in ${x.d.short}`).join(", ")}. The first is ${list[0].date.slice(8)} ${m} (${list[0].p.school}). Many schools close funding rounds before their final deadline, so if you want a scholarship, apply in the earliest round you can.`;
  const faq: [string, string][] = [
    [`Which universities have deadlines in ${m}?`, `${list.slice(0, 5).map((x) => `${x.p.school} (${x.p.name}, ${new Date(`${x.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })})`).join("; ")}${list.length > 5 ? `, and ${list.length - 5} more in the table below` : ""}.`],
    [`Is it too late to apply if a deadline is in ${m}?`, `Not if you start now. Most of an application is the essays, references and transcripts. Ask referees and your university for transcripts at least four weeks before the deadline; the rest can be done in two to three weeks with a plan.`],
    ...(s.funded ? [[`Are any of them fully funded?`, `For ${s.funded} of these programmes our agents found full funding realistic or possible for international students. Funding usually goes to the earliest strong applicants.`] as [string, string]] : []),
    [`How does Ivyward help with deadlines?`, `Ivyward tracks every deadline on your list, starts each application early enough to finish it, and its agents fill in the forms and submit once you've signed. You get a note each morning with what's next.`],
  ];
  const months = monthsAhead(all, today).filter((x) => x.month !== month);
  return (
    <ProgrammePage
      path={`/deadlines/${month}`}
      crumbs={[["Deadlines", "/deadlines"], [m, `/deadlines/${month}`]]}
      h1={`University application deadlines in ${m}`}
      description={`${rows.length} application deadlines in ${m} for international students.`}
      answer={answer}
      rows={rows}
      today={today}
      checked={s.checked}
      faq={faq}
      related={[]}
      match={{}}
      showDate={(p) => dateOf.get(p.id) ?? null}
    >
      <PageLinks title="Other months" links={months.map((x) => ({ href: `/deadlines/${x.month}`, label: monthName(x.month), count: x.count }))} />
    </ProgrammePage>
  );
}
