import { notFound } from "next/navigation";
import { ogCard, OG_SIZE } from "@/lib/og-card";
import { COUNTRY_NAME, SLUG_COUNTRY, findSchool, regionLabel } from "@/lib/directory";

export const runtime = "nodejs";

// the share card for a school page: rendered on first request (there are thousands) and kept for a day, like the page.
// before this existed the pages' structured data pointed here and crawlers got a 404.
export const revalidate = 86400;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "How to apply, on Ivyward";

export default async function Image({ params }: { params: Promise<{ country: string; region: string; slug: string }> }) {
  const { country, region, slug } = await params;
  const c = SLUG_COUNTRY[country];
  const s = c ? await findSchool(c, region, slug) : null;
  if (!s) notFound();
  const place = [regionLabel(s.country, s.region), COUNTRY_NAME[s.country]].filter(Boolean).join(", ");
  return ogCard(place, `How to apply to ${s.name}`);
}
