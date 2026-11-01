import { PT_COUNTRIES } from "@/content/i18n/countries";
import { LocalCountryPage, localCountryMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return PT_COUNTRIES.map((c) => ({ pais: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ pais: string }> }) {
  return localCountryMetadata("pt", (await params).pais);
}
export default async function Page({ params }: { params: Promise<{ pais: string }> }) {
  return <LocalCountryPage lang="pt" slug={(await params).pais} />;
}
