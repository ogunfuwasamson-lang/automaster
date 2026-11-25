import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs, Cta, LibraryShell } from "@/components/library/library";
import { COUNTRY_IN, COUNTRY_NAME, COUNTRY_SLUG, REGION_WORD, SLUG_COUNTRY, regionLabel, regions } from "@/lib/directory";

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type P = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = SLUG_COUNTRY[(await params).country];
  if (!c) return {};
  return {
    title: `Universities in ${COUNTRY_IN[c]} by ${REGION_WORD[c]}`,
    description: `Every degree-granting university and college in ${COUNTRY_IN[c]} from the official register, with official links and how international students apply.`,
    alternates: { canonical: `/schools/${COUNTRY_SLUG[c]}` },
  };
}

export default async function CountryPage({ params }: P) {
  const c = SLUG_COUNTRY[(await params).country];
  if (!c) notFound();
  const list = await regions(c);
  const total = list.reduce((n, r) => n + r.count, 0);
  const path = `/schools/${COUNTRY_SLUG[c]}`;
  return (
    <LibraryShell crumbs={[["Schools", "/schools"], [COUNTRY_NAME[c], path]]}>
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Schools", "/schools"], [COUNTRY_NAME[c], path]]} />
        <header className="mt-5 max-w-3xl">
          <h1 className="text-[38px] leading-[1.06] sm:text-[52px]">Universities in {COUNTRY_IN[c]}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            {total.toLocaleString("en")} degree-granting schools, by {REGION_WORD[c]}. Pick one to see its schools and how to apply to each.
          </p>
        </header>
        <ul className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <li key={r.slug}>
              <Link href={`${path}/${r.slug}`} className="group flex items-baseline justify-between gap-3 border-b border-line py-3.5">
                <span className="font-serif text-[19px] group-hover:text-brand">{regionLabel(c, r.region)}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted">{r.count}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="max-w-3xl">
          <Cta title="Applying to several schools?" body="Ivyward's agents handle every application portal: accounts, forms, uploads, fee waivers and follow-ups. You review and sign each application." />
        </div>
      </div>
    </LibraryShell>
  );
}
