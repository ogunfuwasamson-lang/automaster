import { AR_COUNTRIES } from "@/content/i18n/countries";
import { LocalCountryPage, localCountryMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return AR_COUNTRIES.map((c) => ({ country: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ country: string }> }) {
  return localCountryMetadata("ar", (await params).country);
}
export default async function Page({ params }: { params: Promise<{ country: string }> }) {
  return <LocalCountryPage lang="ar" slug={(await params).country} />;
}
