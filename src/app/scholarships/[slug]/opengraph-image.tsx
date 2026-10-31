import { ogCard, OG_SIZE } from "@/lib/og-card";
import { scholarship } from "@/content";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ivyward";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = scholarship(slug);
  return ogCard(s ? `Scholarship, ${s.country}` : "Scholarship", s ? `${s.name}: who can apply and how` : "Scholarships");
}
