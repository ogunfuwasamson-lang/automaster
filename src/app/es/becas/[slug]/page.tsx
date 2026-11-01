import { SCHOLARSHIPS_ES } from "@/content/i18n/scholarships-es";
import { LocalScholarshipPage, localScholarshipMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return SCHOLARSHIPS_ES.map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return localScholarshipMetadata("es", (await params).slug);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LocalScholarshipPage lang="es" slug={(await params).slug} />;
}
