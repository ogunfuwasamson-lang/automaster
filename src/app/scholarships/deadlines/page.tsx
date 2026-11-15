import type { Metadata } from "next";
import Link from "next/link";
import { ArticleJsonLd, ItemListJsonLd } from "@/components/seo/json-ld";
import { AlertSignup } from "@/components/growth/alert-signup";
import { Crumbs, Cta, Faq, LibraryShell, Related, ShortAnswer, longDate } from "@/components/library/library";
import { CALENDAR, CALENDAR_CHECKED, phaseOf, type CalendarEntry } from "@/content/scholarship-calendar";

// no database: rebuilt daily so a published deadline that has passed moves to "closed"
export const revalidate = 86400;

const PATH = "/scholarships/deadlines";
const TITLE = "Scholarship deadlines for 2027 entry: what's open now";
const DESCRIPTION =
  "When Chevening, Gates Cambridge, Clarendon, Erasmus Mundus, Knight-Hennessy, DAAD, MEXT, GKS, Türkiye Bursları and other fully funded scholarships close for 2027 entry, which are still open, and which open next.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["scholarship deadlines 2027", "fully funded scholarships open now", "scholarships closing in December 2026", "Gates Cambridge deadline 2027", "Chevening 2028 opening date", "Erasmus Mundus deadline 2027", "scholarship calendar 2027"],
  alternates: { canonical: PATH },
  openGraph: { type: "article", title: TITLE, description: DESCRIPTION, url: PATH },
};

const names = (xs: CalendarEntry[]) => {
  const n = xs.map((x) => x.name.replace(/ \(.*\)$/, (m) => (/round/.test(m) ? m : "")));
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}` : n.join("");
};

function Table({ rows, closed }: { rows: CalendarEntry[]; closed?: boolean }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[620px] text-left text-[14.5px]">
        <thead className="bg-surface">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Scholarship</th>
            <th className="px-4 py-2.5 font-semibold">Who can apply</th>
            <th className="px-4 py-2.5 font-semibold">{closed ? "2027 round" : "Deadline"}</th>
            {closed ? <th className="px-4 py-2.5 font-semibold">Next round</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-line align-top">
              <td className="px-4 py-2.5">
                <Link href={r.href} className="font-medium text-brand underline decoration-current/30 underline-offset-4">
                  {r.name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted">{r.who}</td>
              <td className="px-4 py-2.5">{r.when}</td>
              {closed ? <td className="px-4 py-2.5 text-muted">{r.next ?? "Check the official page"}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScholarshipDeadlines() {
  const open = CALENDAR.filter((e) => phaseOf(e) === "open");
  const soon = CALENDAR.filter((e) => phaseOf(e) === "soon");
  const closed = CALENDAR.filter((e) => phaseOf(e) === "closed");
  const answer = `For 2027 entry, ${names(closed.slice(0, 4))} have closed. Still open: ${names(open.slice(0, 5))}. Coming up in 2027: ${names(soon.slice(0, 5))}. Each scholarship links to its profile with the official page, because exact dates move every cycle.`;
  const faq: [string, string][] = [
    ["Which fully funded scholarships are still open for 2027?", `${names(open.filter((e) => !/may already have closed/.test(e.when)))}, as of ${longDate(CALENDAR_CHECKED)}. ${names(soon)} come next, in early 2027.`],
    ["When is the Gates Cambridge deadline for 2027?", "US citizens resident in the US applied by 14 October 2026. Everyone else applies by 8 December 2026 or 6 January 2027, depending on the course, through the normal Cambridge graduate application."],
    ["When does Chevening open again?", "Chevening applications usually open in early August and close in early October. The round for 2027/28 closed on 6 October 2026, so the next one, for 2028/29, should open in August 2027."],
    ["Is it too late to get a scholarship for September 2027?", "No. Gates Cambridge (international round), Clarendon, Erasmus Mundus programmes, Eiffel, Stipendium Hungaricum, Türkiye Bursları, the Chinese Government Scholarship and GKS are all still ahead. University funding deadlines in the US, UK and Canada also run from December to February."],
  ];
  return (
    <LibraryShell crumbs={[["Scholarships", "/scholarships"], ["Deadlines", PATH]]}>
      <ArticleJsonLd path={PATH} title={TITLE} description={answer} updated={CALENDAR_CHECKED} faq={faq} about={["scholarship deadlines", "fully funded scholarships 2027"]} />
      <ItemListJsonLd path={PATH} name="Scholarship deadlines for 2027 entry" items={CALENDAR.map((e) => [e.name, e.href])} />
      <div className="mx-auto max-w-[860px] px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Scholarships", "/scholarships"]]} />
        <h1 className="mt-5 text-[36px] leading-[1.08] sm:text-[50px]">Scholarship deadlines for 2027 entry</h1>
        <p className="mt-4 text-[13.5px] text-muted">Checked against the official pages on {longDate(CALENDAR_CHECKED)}</p>
        <ShortAnswer>{answer}</ShortAnswer>

        <section className="mt-10">
          <h2 className="font-serif text-[28px]">Open now</h2>
          <Table rows={open} />
        </section>
        <section className="mt-10">
          <h2 className="font-serif text-[28px]">Coming up in 2027</h2>
          <Table rows={soon} />
        </section>
        <section className="mt-10">
          <h2 className="font-serif text-[28px]">Closed for 2027 entry</h2>
          <Table rows={closed} closed />
        </section>

        <div className="prose-iv mt-10">
          <h2>Programme deadlines</h2>
          <p>
            Many universities give their own scholarships to applicants who meet an earlier funding deadline, usually in December or January. Our <Link href="/deadlines">deadline calendar</Link> lists the programmes our agents have checked, month by month, and the <Link href="/guides/application-deadlines-2027-intake">2027 application timeline</Link> explains the order to do things in.
          </p>
          <h2>Applying from a high-income country?</h2>
          <p>
            Most of the awards above are open to you too, and there are home routes as well, such as the Fulbright U.S. Student Program, Marshall and Kennedy scholarships, or student finance you can take abroad. See the pages for the <Link href="/study-abroad/united-states">United States</Link>, the <Link href="/study-abroad/united-kingdom">United Kingdom</Link>, <Link href="/study-abroad/canada">Canada</Link>, <Link href="/study-abroad/germany">Germany</Link> and <Link href="/study-abroad/australia">Australia</Link>, or <Link href="/study-abroad">pick your country</Link>.
          </p>
        </div>

        <Cta title="Never miss a scholarship round" body="Ivyward tracks every round of every programme and scholarship on your list, including priority and funding deadlines, and prepares your applications in time for the earliest one. You review and sign before anything is sent." />
        <Faq items={faq} />
        <AlertSignup source="scholarship-deadlines" />
        <p className="mt-10 text-[13.5px] leading-relaxed text-muted">Dates change every cycle. Confirm on each scholarship&apos;s official page before you apply.</p>
        <Related
          items={[
            { href: "/scholarships", title: "Every scholarship profile", kind: "Scholarships" },
            { href: "/deadlines", title: "Application deadlines by month", kind: "Deadlines" },
            { href: "/guides/application-deadlines-2027-intake", title: "Application deadlines for 2027 entry", kind: "Guide" },
            { href: "/tools/scholarship-finder", title: "Scholarship finder", kind: "Tool" },
          ]}
        />
      </div>
    </LibraryShell>
  );
}
