import { ogCard, OG_SIZE } from "@/lib/og-card";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ivyward";

export default async function Image() {
  return ogCard("Scholarships", "Scholarship deadlines for 2027 entry: what's open now");
}
