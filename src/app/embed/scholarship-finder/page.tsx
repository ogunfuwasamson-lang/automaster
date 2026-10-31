import type { Metadata } from "next";
import { SCHOLARSHIPS } from "@/content";
import { Finder } from "@/app/tools/scholarship-finder/finder";
import { SITE } from "@/lib/site";

// the finder on its own, for other sites to embed. results link back to Ivyward in a new tab.
export const metadata: Metadata = { title: "Scholarship finder", robots: { index: false, follow: true } };

export default function EmbedFinder() {
  return (
    <div className="min-h-dvh bg-background p-4">
      <Finder embedded items={SCHOLARSHIPS.map((s) => ({ slug: s.slug, name: s.name, country: s.country, levels: s.levels, funding: s.funding }))} />
      <p className="mt-4 text-[13px] text-muted">
        Scholarship finder by{" "}
        <a href={`${SITE.url}/?utm_source=embed&utm_medium=widget`} target="_blank" rel="noopener" className="text-brand underline">
          Ivyward
        </a>
        : AI agents that run your university applications.
      </p>
    </div>
  );
}
