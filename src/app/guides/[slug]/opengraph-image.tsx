import { ogCard, OG_SIZE } from "@/lib/og-card";
import { guide } from "@/content";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ivyward";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guide(slug);
  return ogCard(g?.category ?? "Guide", g?.title ?? "Ivyward guides");
}
