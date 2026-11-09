import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemListJsonLd } from "@/components/seo/json-ld";
import { Crumbs, Cta, LibraryShell } from "@/components/library/library";
import { COUNTRY_NAME, COUNTRY_SLUG, SLUG_COUNTRY, controlLabel, inRegion, regionLabel, schoolPath, type DirSchool } from "@/lib/directory";

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type P = { params: Promise<{ country: string; region: string }> };

async function get(params: P["params"]) {
  const { country, region } = await params;
  const c = SLUG_COUNTRY[country];
  if (!c) return null;
  const list = await inRegion(c, region);
  return list.length ? { c, list, label: regionLabel(c, list[0].region), region } : null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await get(params);
  if (!r) return {};
  return {
    title: `Universities in ${r.label}: how to apply as an international student`,
    description: `All ${r.list.length} degree-granting universities and colleges in ${r.label}, ${COUNTRY_NAME[r.c]}, from the official register, with each school's admissions and application links.`,
    alternates: { canonical: `/schools/${COUNTRY_SLUG[r.c]}/${r.region}` },
  };
}

// the groups a reader scans by: research universities first
function group(s: DirSchool) {
  if (s.country === "GB") return /university/i.test(s.name) ? "Universities" : "Colleges and other providers";
  if (s.highest === "Doctor's degree") return "Universities awarding doctorates";
  if (s.highest === "Master's degree" || s.highest === "Post-master's certificate") return "Universities and colleges awarding master's degrees";
  return "Colleges awarding bachelor's degrees";
}

export default async function RegionPage({ params }: P) {
  const r = await get(params);
  if (!r) notFound();
  const path = `/schools/${COUNTRY_SLUG[r.c]}/${r.region}`;
  const groups = [...new Set(r.list.map(group))].sort();
  return (
    <LibraryShell crumbs={[["Schools", "/schools"], [COUNTRY_NAME[r.c], `/schools/${COUNTRY_SLUG[r.c]}`], [r.label, path]]}>
      <ItemListJsonLd path={path} name={`Universities in ${r.label}`} items={r.list.map((s) => [s.name, schoolPath(s)])} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Schools", "/schools"], [COUNTRY_NAME[r.c], `/schools/${COUNTRY_SLUG[r.c]}`], [r.label, path]]} />
        <header className="mt-5 max-w-3xl">
          <h1 className="text-[38px] leading-[1.06] sm:text-[52px]">Universities in {r.label}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            {r.list.length} degree-granting {r.list.length === 1 ? "school" : "schools"} in {r.label}, from the official register. Each page has the school&apos;s admissions and application links and how applying from abroad works there.
          </p>
        </header>
        <div className="mt-12 space-y-12">
          {groups.map((g) => (
            <section key={g} aria-labelledby={`g-${g}`}>
              <h2 id={`g-${g}`} className="border-b border-line pb-3 font-serif text-[26px]">
                {g}
              </h2>
              <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {r.list
                  .filter((s) => group(s) === g)
                  .map((s) => (
                    <li key={s.id}>
                      <Link href={schoolPath(s)} className="group flex items-baseline justify-between gap-3 border-b border-line py-3">
                        <span className="text-[16px] group-hover:text-brand">{s.name}</span>
                        <span className="shrink-0 text-[12.5px] text-muted">{[s.city, controlLabel(s.control)?.split(",")[0]].filter(Boolean).join(" · ")}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="max-w-3xl">
          <Cta title={`Applying to schools in ${r.label}?`} body="Ivyward's agents handle every application portal: accounts, forms, uploads, fee waivers and follow-ups. You review and sign each application." />
        </div>
      </div>
    </LibraryShell>
  );
}
