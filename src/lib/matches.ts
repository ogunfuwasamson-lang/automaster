import "server-only";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile-store";
import { enqueue } from "@/lib/queue";
import { rankMatches, type LibraryProgram, type Match } from "@/lib/match-rules";

export type InstantMatch = Match & { awards: number };

const today = () => new Date().toISOString().slice(0, 10);
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

// the library, for the applicant's regions: a few hundred rows, matched in memory (lib/match-rules)
export async function instantMatches(userId: string, limit = 6): Promise<InstantMatch[]> {
  const profile = await getProfile(userId);
  const regions = profile.preferences.regions ?? [];
  if (!regions.length) return [];
  const db = admin();
  const { data } = await db
    .from("programs")
    .select("id, name, degree, url, kind, deadlines, funding_signals, schools!inner(name, country, region, ranking_note)")
    .in("schools.region", regions)
    .limit(3000);
  const library = (data ?? []).map((r) => ({ ...r, school: r.schools as unknown as LibraryProgram["school"] })) as unknown as LibraryProgram[];
  const picked = rankMatches(library, { level: profile.goals.study_level, fields: profile.goals.fields, regions }, today(), limit);
  if (!picked.length) return [];
  // scholarships on file for each (open to international applicants, or not known either way)
  const { data: awards } = await db.from("funding_opportunities").select("program_id, intl_eligible").in("program_id", picked.map((m) => m.programId));
  const count = new Map<string, number>();
  for (const a of awards ?? []) if (a.intl_eligible !== false) count.set(a.program_id as string, (count.get(a.program_id as string) ?? 0) + 1);
  return picked.map((m) => ({ ...m, awards: count.get(m.programId) ?? 0 }));
}

// the instant matches go on the applicant's shortlist for real: the agents judge fit for this applicant from the
// facts already on file (no web search, a fraction of a cent each). they run a few minutes after setup so a CV
// uploaded on the matches screen is read first. same idempotency key as the agents' own research, so a programme
// the search also finds today isn't checked twice.
export async function queueInstantMatches(userId: string): Promise<number> {
  const matches = await instantMatches(userId).catch(() => []);
  const at = new Date(Date.now() + 3 * 60_000);
  for (const m of matches) {
    await enqueue({
      userId,
      agent: "recon",
      task: "research_program",
      payload: {
        school: m.school,
        program: m.program,
        degree: m.degree,
        url: m.url ?? "",
        why: "matched from programmes the agents have already checked, on the applicant's level, field and regions",
        funding_angle: m.funding ?? "",
        country: m.country ?? undefined,
        region: m.region ?? undefined,
        ranking_note: m.rankingNote ?? "",
        library_id: m.programId,
      },
      idempotencyKey: `research:${userId}:${slugify(m.school)}:${slugify(m.program)}:${today()}`,
      runAt: at,
    });
  }
  return matches.length;
}
