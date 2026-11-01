import { FR_COUNTRIES } from "@/content/i18n/countries";
import { LocalCountryPage, localCountryMetadata } from "@/components/library/local-pages";

export const dynamicParams = false;
export function generateStaticParams() {
  return FR_COUNTRIES.map((c) => ({ pays: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ pays: string }> }) {
  return localCountryMetadata("fr", (await params).pays);
}
export default async function Page({ params }: { params: Promise<{ pays: string }> }) {
  return <LocalCountryPage lang="fr" slug={(await params).pays} />;
}
