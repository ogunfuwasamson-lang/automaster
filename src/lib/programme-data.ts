import "server-only";
import { admin } from "@/lib/supabase/admin";
import { cleanName, levelOfDegree } from "@/lib/match-rules";
import { publishable, type PublicProgramme } from "@/lib/programme-pages";

// the library, public-safe: only structured fields (no research notes, which can mention an applicant).
// cached per server for an hour; the pages themselves revalidate every few hours.
let cache: { at: number; rows: PublicProgramme[] } | null = null;

export async function publicProgrammes(): Promise<PublicProgramme[]> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.rows;
  // local design preview only: a saved copy of the library instead of the database
  const fixture = process.env.NODE_ENV !== "production" && process.env.AM_PREVIEW === "1" ? process.env.AM_PREVIEW_LIBRARY : undefined;
  const { data } = fixture
    ? { data: JSON.parse((await import("node:fs")).readFileSync(fixture, "utf8")) as unknown[] }
    : await admin()
    .from("programs")
    .select("id, name, degree, url, kind, deadlines, funding_signals, test_policy, tuition_usd, verified_at, schools!inner(name, country, region)")
    .not("schools.region", "is", null)
    .limit(10000);
  const rows: PublicProgramme[] = [];
  for (const r of (data ?? []) as unknown as {
    id: string;
    name: string;
    degree: string | null;
    url: string | null;
    kind: string | null;
    deadlines: { date?: string | null }[] | null;
    funding_signals: { full_funding_realistic?: string | null; english_moi_waiver?: string | null } | null;
    test_policy: string | null;
    tuition_usd: number | null;
    verified_at: string | null;
    schools: { name: string; country: string | null; region: string };
  }[]) {
    if (r.kind === "scholarship" || /\bonline\b|distance learning/i.test(r.name) || !publishable(r)) continue;
    rows.push({
      id: r.id,
      name: cleanName(r.name),
      school: r.schools.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
      country: r.schools.country,
      region: r.schools.region,
      level: levelOfDegree(r.degree, r.name),
      degree: r.degree ?? "",
      url: r.url && /^https?:\/\//.test(r.url) ? r.url : null,
      tuition: typeof r.tuition_usd === "number" && r.tuition_usd > 500 && r.tuition_usd < 200000 ? r.tuition_usd : null,
      testPolicy: r.test_policy,
      moi: r.funding_signals?.english_moi_waiver ?? null,
      funding: r.funding_signals?.full_funding_realistic ?? null,
      deadlines: (Array.isArray(r.deadlines) ? r.deadlines : []).map((d) => d?.date ?? "").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
      checked: r.verified_at?.slice(0, 10) ?? null,
    });
  }
  // the same programme researched twice (for two applicants, or under a slightly different name): keep the
  // most recently checked copy
  const key = (r: PublicProgramme) => `${r.school.toLowerCase()}|${r.name.toLowerCase().replace(/in-person|on campus|full-time|[^a-z]/g, "")}`;
  const best = new Map<string, PublicProgramme>();
  for (const r of rows) {
    const k = key(r);
    const have = best.get(k);
    if (!have || (r.checked ?? "") > (have.checked ?? "") || (!have.tuition && r.tuition)) best.set(k, r);
  }
  const unique = [...best.values()];
  cache = { at: Date.now(), rows: unique };
  return unique;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);
