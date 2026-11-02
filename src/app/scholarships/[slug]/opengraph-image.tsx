import { ogCard, OG_SIZE } from "@/lib/og-card";
import { SCHOLARSHIPS, scholarship } from "@/content";

export const runtime = "nodejs";

// render every card at build time, where the font files exist; a request for an unknown slug is a 404, not a crash
export const dynamicParams = false;
export function generateStaticParams() {
  return SCHOLARSHIPS.map((x) => ({ slug: x.slug }));
}
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ivyward";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = scholarship(slug);
  return ogCard(s ? `Scholarship, ${s.country}` : "Scholarship", s ? `${s.name}: who can apply and how` : "Scholarships");
}
