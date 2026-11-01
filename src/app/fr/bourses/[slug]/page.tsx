import { SCHOLARSHIPS_FR } from "@/content/i18n/scholarships-fr";
import { LocalScholarshipPage, localScholarshipMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return SCHOLARSHIPS_FR.map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return localScholarshipMetadata("fr", (await params).slug);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LocalScholarshipPage lang="fr" slug={(await params).slug} />;
}
