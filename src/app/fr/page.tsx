import { LocalHub, localHubMetadata } from "@/components/library/local-pages";

export const metadata = localHubMetadata("fr");
export default function Page() {
  return <LocalHub lang="fr" />;
}
