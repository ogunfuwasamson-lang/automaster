import { ogCard, OG_SIZE } from "@/lib/og-card";
import { UNIVERSITIES, university } from "@/content/universities";

export const runtime = "nodejs";

// render every card at build time, where the font files exist; a request for an unknown slug is a 404, not a crash
export const dynamicParams = false;
export function generateStaticParams() {
  return UNIVERSITIES.map((x) => ({ slug: x.slug }));
}
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ivyward";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const u = university(slug);
  return ogCard(u?.country ?? "Universities", u ? `How to apply to ${u.name}` : "How to apply");
}
