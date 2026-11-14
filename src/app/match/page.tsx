import type { Metadata } from "next";
import { LibraryShell } from "@/components/library/library";
import { REGIONS } from "@/lib/profile";
import { parseGoal } from "@/lib/goal-parse";
import { Matcher } from "./matcher";

export const metadata: Metadata = {
  title: "Find programmes that match you, in 30 seconds",
  description: "Tell us your level, your field and where you want to study. See programmes our agents have already checked, with their next deadline and the funding on file. Free, no account needed.",
  alternates: { canonical: "/match" },
};

const LEVELS = new Set(["undergraduate", "masters", "phd"]);

// the public front door: the same instant matches a new account gets in setup, before any sign-up. the home page's
// "What do you want to study?" box lands here with its words (goal), or a link can carry the choices directly.
export default async function MatchPage({ searchParams }: { searchParams: Promise<{ goal?: string; level?: string; fields?: string; regions?: string }> }) {
  const sp = await searchParams;
  const parsed = sp.goal ? parseGoal(sp.goal.slice(0, 200)) : { level: null, fields: [], regions: [] };
  const initial = {
    level: LEVELS.has(sp.level ?? "") ? sp.level! : (parsed.level ?? ""),
    fields: sp.fields ? sp.fields.split("|").map((f) => f.trim()).filter(Boolean).slice(0, 4) : parsed.fields,
    regions: sp.regions ? sp.regions.split(",").filter((r) => REGIONS[r]) : parsed.regions,
  };
  return (
    <LibraryShell crumbs={[["Find your matches", "/match"]]}>
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:pt-16">
        <h1 className="max-w-3xl text-[40px] leading-[1.05] sm:text-[56px]">Find programmes that match you</h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-[18px]">
          Three answers, and you see programmes our agents have already checked: the next deadline, and the funding and scholarships on file. Free, and nothing is saved until you make an account.
        </p>
        <div className="mt-10">
          <Matcher regions={REGIONS} initial={initial} />
        </div>
      </div>
    </LibraryShell>
  );
}
