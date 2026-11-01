import { ES_COUNTRIES } from "@/content/i18n/countries";
import { LocalCountryPage, localCountryMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return ES_COUNTRIES.map((c) => ({ pais: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ pais: string }> }) {
  return localCountryMetadata("es", (await params).pais);
}
export default async function Page({ params }: { params: Promise<{ pais: string }> }) {
  return <LocalCountryPage lang="es" slug={(await params).pais} />;
}
