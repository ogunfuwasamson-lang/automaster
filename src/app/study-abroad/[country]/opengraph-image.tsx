import { ogCard, OG_SIZE } from "@/lib/og-card";
import { ORIGINS, inText, origin } from "@/content/countries";

export const runtime = "nodejs";

// render every card at build time, like the pages themselves; an unknown country is a 404
export const dynamicParams = false;
export function generateStaticParams() {
  return ORIGINS.map((o) => ({ country: o.slug }));
}
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ivyward";

export default async function Image({ params }: { params: Promise<{ country: string }> }) {
  const o = origin((await params).country);
  return ogCard("Study abroad, 2027", o ? `Study abroad from ${inText(o)}: scholarships and how to apply` : "Study abroad");
}
