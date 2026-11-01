import { LOCAL } from "@/content/i18n";
import { LocalGuidePage, localGuideMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCAL.ar.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return localGuideMetadata("ar", (await params).slug);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LocalGuidePage lang="ar" slug={(await params).slug} />;
}
