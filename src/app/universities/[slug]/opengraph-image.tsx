import { ogCard, OG_SIZE } from "@/lib/og-card";
import { university } from "@/content/universities";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ivyward";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const u = university(slug);
  return ogCard(u?.country ?? "Universities", u ? `How to apply to ${u.name}` : "How to apply");
}
