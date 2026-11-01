import { LocalHub, localHubMetadata } from "@/components/library/local-pages";

export const metadata = localHubMetadata("es");
export default function Page() {
  return <LocalHub lang="es" />;
}
