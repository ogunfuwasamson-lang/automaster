import { LOCAL } from "@/content/i18n";
import { LocalGuidePage, localGuideMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCAL.es.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return localGuideMetadata("es", (await params).slug);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LocalGuidePage lang="es" slug={(await params).slug} />;
}
