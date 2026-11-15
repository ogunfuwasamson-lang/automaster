import { loadShareProgram } from "@/lib/share-data";
import { shareFacts } from "@/lib/share-school";
import { shareCard } from "@/lib/share-card";
import { ogCard } from "@/lib/og-card";

// the preview whatsapp shows under a shared link: the programme's card
export const runtime = "nodejs";
export const alt = "A programme shared from Ivyward";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await loadShareProgram(id);
  if (!p) return ogCard("Shared programme", "Study abroad with Ivyward");
  return shareCard(shareFacts(p, new Date().toISOString().slice(0, 10)), "link");
}
