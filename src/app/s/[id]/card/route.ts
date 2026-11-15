import { notFound } from "next/navigation";
import { loadShareProgram } from "@/lib/share-data";
import { shareFacts } from "@/lib/share-school";
import { shareCard } from "@/lib/share-card";

export const runtime = "nodejs";
export const revalidate = 3600;

// the portrait image to post on a whatsapp or instagram status (1080x1350)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await loadShareProgram(id);
  if (!p) notFound();
  const img = await shareCard(shareFacts(p, new Date().toISOString().slice(0, 10)), "status");
  img.headers.set("content-disposition", `inline; filename="ivyward-${p.school.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}.png"`);
  img.headers.set("cache-control", "public, max-age=3600, s-maxage=3600");
  return img;
}
