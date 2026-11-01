import { LOCAL } from "@/content/i18n";
import { LocalGuidePage, localGuideMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCAL.pt.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return localGuideMetadata("pt", (await params).slug);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LocalGuidePage lang="pt" slug={(await params).slug} />;
}
