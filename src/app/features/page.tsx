import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, LibraryShell } from "@/components/library/library";
import { ItemListJsonLd } from "@/components/seo/json-ld";
import { FEATURES } from "@/lib/features";

export const metadata: Metadata = {
  title: "Features: what Ivyward's agents do",
  description:
    "Everything Ivyward's AI agents do for a university application: a checked shortlist, essays from your own facts, application forms filled in, fee waivers and funding asked for, school replies read, deadlines on your calendar, and a Chrome extension.",
  alternates: { canonical: "/features" },
};

export default function Features() {
  return (
    <LibraryShell crumbs={[["Features", "/features"]]}>
      <ItemListJsonLd path="/features" name="What Ivyward's agents do" items={FEATURES.map((f) => [f.nav, `/features/${f.slug}`])} />
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:pt-14">
        <Crumbs items={[["Features", "/features"]]} />
        <h1 className="mt-6 max-w-3xl text-[42px] leading-[1.05] sm:text-[58px]">What the agents do, from shortlist to funding.</h1>
        <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-muted">Every part of studying abroad, from your shortlist to your first day in school, with every step you approve kept with you.</p>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.slug}>
              <Link href={`/features/${f.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-7 transition-colors hover:border-foreground/25">
                <span className="text-[13px] text-muted">{f.nav}</span>
                <span className="mt-3 font-serif text-[23px] leading-snug">{f.title}</span>
                <span className="mt-2.5 text-[15px] leading-relaxed text-muted">{f.lead}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </LibraryShell>
  );
}
