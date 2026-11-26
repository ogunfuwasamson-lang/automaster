import "server-only";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { research } from "@/lib/research";
import { runStructured } from "@/lib/llm";
import { REGIONS } from "@/lib/profile";
import { programChecklist } from "@/lib/levels";
import { findInstitution, isDefunct, linkSchool, registryBrief } from "@/lib/institutions";
import { pickTargets, type Want, type LibraryRow } from "@/lib/library-targets";
import { Candidates, ProgramFacts, slugify, upsertProgram } from "./recon";
import { searchableRegions, usStudyBlocked } from "@/lib/us-visa-suspension";

// growing the checked programme list on its own (founder's call, 25 nov 2026: 500 more programmes, about 100 a day,
// ~$35). each day it picks what applicants ask for (field, level, destination) with the fewest programmes on file,
// finds programmes there on the schools' own pages, and checks each one the way a user's search does, without
// placing it on anyone's list or charging anyone's credits. its AI has its own allowance (lib/budget, agent "library")
// and steps aside before the platform's daily limit.

export const SEED_KEY = "library_seed";
export type SeedState = { target: number; perDay: number; baseline: number | null; started: string; lastDay?: string; done?: boolean };
const DEFAULT: SeedState = { target: 500, perDay: 100, baseline: null, started: "2026-11-25" };
const PER_SEARCH = 10;
const today = () => new Date().toISOString().slice(0, 10);

export async function seedState(): Promise<SeedState> {
  const { data } = await admin().from("billing_settings").select("value").eq("key", SEED_KEY).maybeSingle();
  try {
    return { ...DEFAULT, ...(typeof data?.value === "string" ? JSON.parse(data.value) : (data?.value ?? {})) };
  } catch {
    return DEFAULT;
  }
}
async function saveSeed(s: SeedState) {
  await admin().from("billing_settings").upsert({ key: SEED_KEY, value: JSON.stringify(s) });
}

// the checked list: every programme (not scholarship) at a school with a destination
async function libraryRows(): Promise<LibraryRow[]> {
  const out: LibraryRow[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data } = await admin().from("programs").select("name, degree, kind, schools!inner(name, region)").not("schools.region", "is", null).not("verified_at", "is", null).order("id").range(from, from + 999);
    for (const r of data ?? []) {
      if (r.kind === "scholarship") continue;
      const s = r.schools as unknown as { name: string; region: string };
      out.push({ name: r.name as string, degree: (r.degree as string | null) ?? null, school: s.name, region: s.region });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

// what applicants named: field, level and destinations, with how many asked
async function wants(): Promise<Want[]> {
  const { data } = await admin().from("profiles").select("profile").limit(10_000);
  return (data ?? []).map((r) => {
    const p = (r.profile ?? {}) as { identity?: { citizenship?: string | null; other_citizenship?: string | null }; goals?: { fields?: string[] | null; study_level?: string | null }; preferences?: { regions?: string[] | null } };
    // US programmes aren't researched on behalf of someone who can't get a US student visa now
    const blocked = usStudyBlocked(p.identity?.citizenship, p.identity?.other_citizenship);
    return { fields: p.goals?.fields ?? [], level: p.goals?.study_level ?? null, regions: searchableRegions(p.preferences?.regions ?? [], blocked) };
  });
}

const LEVEL: Record<string, string> = { masters: "master's", phd: "PhD", undergraduate: "bachelor's" };

export const library: Record<string, Handler> = {
  // once a day (api/worker): the day's searches, spread over the day, until the list has grown by the target
  "library.seed_day": async (job) => {
    const s = await seedState();
    const day = today();
    if (s.done) return { done: true };
    if (s.lastDay === day) return { skipped: "already planned today" };
    const rows = await libraryRows();
    const baseline = s.baseline ?? rows.length;
    const added = rows.length - baseline;
    if (added >= s.target) {
      await saveSeed({ ...s, baseline, done: true, lastDay: day });
      await logEvent({ userId: job.user_id, actor: "agent:library", action: "library.target_reached", context: { added, total: rows.length } }).catch(() => {});
      return { done: true, added };
    }
    // a search brings back fewer than it asks for (the first found 4 of 10): plan by what recent ones brought
    const { data: recent } = await admin().from("jobs").select("result").eq("agent", "library").eq("task", "find").eq("status", "done").order("finished_at", { ascending: false }).limit(20);
    const yields = (recent ?? []).map((j) => Number((j.result as { queued?: number } | null)?.queued ?? 0));
    const perSearch = yields.length >= 3 ? Math.max(2, yields.reduce((a, b) => a + b, 0) / yields.length) : 6;
    const searches = Math.min(25, Math.ceil(Math.min(s.perDay, s.target - added) / perSearch));
    const targets = pickTargets(await wants(), rows, searches);
    for (const [i, t] of targets.entries())
      await enqueue({
        userId: job.user_id,
        agent: "library",
        task: "find",
        payload: t,
        idempotencyKey: `library-find:${day}:${t.level}:${slugify(t.field)}:${t.region}`,
        parentJobId: job.id,
        // spread over the day, so the checks never crowd applicants' own work
        runAt: new Date(Date.now() + i * 45 * 60_000),
      });
    await saveSeed({ ...s, baseline, lastDay: day });
    await logEvent({ userId: job.user_id, actor: "agent:library", action: "library.planned", context: { day, added, total: rows.length, targets } }).catch(() => {});
    return { searches: targets.length, added };
  },

  // one field at one level in one destination: up to 10 programmes, each with its official page
  "library.find": async (job) => {
    const t = job.payload as { field: string; level: string; region: string };
    const known = (await libraryRows()).filter((r) => r.region === t.region).map((r) => `${r.school}: ${r.name}`);
    const found = await research({
      userId: job.user_id,
      agent: "library",
      jobId: job.id,
      system: "you find university programmes on their official pages for a shared, checked list that international applicants use. name only real programmes with their official page; never invent one.",
      prompt: `find ${PER_SEARCH} ${LEVEL[t.level] ?? "master's"} programmes in ${t.field} (or what universities usually call that field) in ${REGIONS[t.region] ?? t.region} that admit international students.
mix: a few from top-ranked universities, then well-regarded and accessible ones. for each: school, country, the programme's name as the school writes it, degree, official programme page url, and ranking context.
already on the list (don't repeat any of these):
${known.slice(0, 120).join("\n") || "(none)"}`,
      maxSearches: 4,
      maxFetches: 2,
    });
    const { output } = await runStructured({
      userId: job.user_id,
      agent: "library",
      jobId: job.id,
      tier: "cheap",
      promptVersion: "library-find-v1",
      system: "turn research notes into structured data. only include programmes the notes actually name. keep urls exactly as written; empty string when none. band: top = world top ~100 or a national flagship; strong = well-ranked below that; accessible = the rest. why: one line on how it matches the field. funding_angle: what the notes say about funding, or empty.",
      prompt: `research notes:\n${found.text}\n\nsources seen:\n${found.sources.join("\n")}`,
      schema: Candidates,
      maxTokens: 6000,
    });
    const have = new Set(known.map((k) => k.toLowerCase()));
    const picks = output.candidates.filter((c) => c.url && !have.has(`${c.school}: ${c.program}`.toLowerCase())).slice(0, PER_SEARCH);
    for (const [i, c] of picks.entries())
      await enqueue({
        userId: job.user_id,
        agent: "library",
        task: "check",
        payload: { ...c, region: t.region, level: t.level },
        idempotencyKey: `library-check:${slugify(c.school)}:${slugify(c.program)}`,
        parentJobId: job.id,
        runAt: new Date(Date.now() + (i + 1) * 4 * 60_000),
      });
    return { found: output.candidates.length, queued: picks.length };
  },

  // one programme read on its official pages and saved to the checked list (no applicant, no fit judgement)
  "library.check": async (job) => {
    const p = job.payload as { school: string; program: string; degree: string; url: string; country?: string; region: string; level: string; ranking_note?: string };
    const inst = await findInstitution({ name: p.school, url: p.url, country: p.country }).catch(() => null);
    if (isDefunct(inst)) return { skipped: inst!.status };
    const level = (["masters", "phd", "undergraduate"].includes(p.level) ? p.level : "masters") as "masters" | "phd" | "undergraduate";
    const found = await research({
      userId: job.user_id,
      agent: "library",
      jobId: job.id,
      system:
        'you research ONE university programme on its official pages for a shared, checked list. report facts exactly as the school states them, with dates as YYYY-MM-DD and amounts in USD (original currency alongside). when a fact isn\'t stated on any page you found, say "not found"; never guess. there is no applicant: don\'t judge anyone\'s fit.',
      prompt: `programme: ${p.program} (${p.degree}) at ${p.school}${p.country ? `, ${p.country}` : ""}
ranking context: ${p.ranking_note || "unknown"}
starting url: ${p.url}
${inst ? `${registryBrief(inst)}\n` : ""}today: ${today()}.

find and report: degree type and length; ${programChecklist(level)}; admissions tests (GRE/GMAT/other) required, optional or waivable; english requirements and whether a medium-of-instruction letter is accepted; application fee and fee waivers; tuition; post-study work rights for internationals in that country; every application round with its date and intake; scholarships, assistantships or fellowships open to international students, with amounts; how to apply (the application system).
read the starting url first, then the fees, funding and how-to-apply pages it links to. search for what those pages don't answer, above all the application dates and the tuition for international students.`,
      // a shared entry many applicants will see: one more search and page than a single applicant's check (the
      // first, ETH civil engineering, came back without dates or fees on one search)
      maxSearches: 2,
      maxFetches: 5,
    });
    const { output: facts } = await runStructured({
      userId: job.user_id,
      agent: "library",
      jobId: job.id,
      tier: "cheap",
      promptVersion: "library-parse-v1",
      system:
        'turn research notes into structured program data. use only what the notes say. "unknown" or "" when the notes don\'t say. dates as YYYY-MM-DD. when admission is rolling with no closing date, add one deadline row with round "rolling admission", date "" and the intake. there is no applicant: tier "target", fit_score "", fit_reasoning "", red_flags empty.',
      prompt: `research notes:\n${found.text}`,
      schema: ProgramFacts,
      maxTokens: 6000,
    });
    if (!facts.program_name || !facts.school_name) return { skipped: "nothing usable found" };
    // the checked list promises dates and costs: a programme whose official pages couldn't be read (KU Leuven's and
    // ETH's refused the reader on the first night) stays off it rather than going on with nothing but its name
    const dated = facts.deadlines.some((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date.trim()));
    const costed = /\d/.test(facts.tuition_usd_total);
    if (!dated && !costed) return { skipped: "official pages gave no dates or fees", school: facts.school_name, program: facts.program_name };
    // one school, one record: the registry's school on file wins over the name the notes used
    if (inst?.school_id) {
      const { data: known } = await admin().from("schools").select("name").eq("id", inst.school_id).maybeSingle();
      if (known?.name) facts.school_name = known.name as string;
    }
    const { schoolId, programId } = await upsertProgram(facts, found.sources);
    if (inst) await linkSchool(schoolId, inst).catch(() => {});
    return { programId };
  },
};
