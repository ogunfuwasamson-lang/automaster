import { LOCAL } from "@/content/i18n";
import { LocalGuidePage, localGuideMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCAL.fr.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return localGuideMetadata("fr", (await params).slug);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LocalGuidePage lang="fr" slug={(await params).slug} />;
}
