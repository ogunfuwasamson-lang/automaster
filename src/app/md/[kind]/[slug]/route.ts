import { libraryMarkdown, libraryMdParams } from "@/lib/library-md";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return libraryMdParams();
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  const md = libraryMarkdown(kind, slug);
  if (!md) return new Response("Not found", { status: 404 });
  return new Response(md, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
