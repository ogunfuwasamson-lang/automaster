import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { research } from "@/lib/research";
import { getProfile } from "@/lib/profile-store";
import { profileBrief, REGIONS, levelOf } from "@/lib/profile";
import { levelGuide, programChecklist, levelName } from "@/lib/levels";
import { logEvent } from "@/lib/events";
import { enqueue } from "@/lib/queue";
import { userPlan } from "@/lib/budget";
import { screen, targetDeadline } from "@/lib/fit";
import { canTransition, type AppStatus } from "@/lib/app-state";

const today = () => new Date().toISOString().slice(0, 10);
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const MAX_PROGRAMS = 20; // across all selected regions per run (web research is the main api cost)
const CACHE_DAYS = 30; // reuse another run's (or user's) program research this fresh

const regionList = (regions: string[] | null) => (regions?.length ? regions : ["us"]).filter((r) => REGIONS[r]);

// ---------------------------------------------------------------------------
// discover: a planner that fans out one discovery job per selected region,
// each starting from that region's top-ranked universities and working down
// ---------------------------------------------------------------------------
const DISCOVER_SYSTEM = `you are the recon agent on a platform that helps applicants in ANY field apply to bachelor's, master's and PhD programs anywhere in the world. the applicant's level and how admissions and funding work at that level are given in each request.
you find programs worth applying to, and you are honest about admissions odds and funding.

strategy: admissions first. the goal is as many good admits as possible, then the platform's closer agent works each admit for money (merit reconsideration, assistantships offered after admission, departmental awards, competing offers, outside scholarships). most schools never publish full-funding odds, so funding is information you report, NOT a reason to skip a program. never leave out a strong program because funding isn't advertised.

order of search, always:
1. start at the top: the region's highest-ranked universities (QS/THE/ARWU world top ~100, plus the strongest national names). for each, look for programs at the applicant's level, in their fields and degree types, that fit their constraints. top schools often have programs people miss: specialised degrees, programs without a required admissions test or with waivers, joint and interdisciplinary programs.
2. then strong schools just below that, which often fund more generously.
3. then accessible options with good funding odds.
don't default to an MBA (or any single degree) unless the applicant's degree types include it.

search the web and use official university pages, not rankings blogs or agents' sites.`;

export const Candidates = z.object({
  candidates: z.array(
    z.object({
      school: z.string(),
      country: z.string(),
      program: z.string(),
      degree: z.string(),
      url: z.string(),
      band: z.enum(["top", "strong", "accessible"]),
      ranking_note: z.string(), // e.g. "QS world #12" or "top 5 in Germany"
      why: z.string(),
      funding_angle: z.string(),
    }),
  ),
  strategy_notes: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// research one program
// ---------------------------------------------------------------------------
const PROGRAM_SYSTEM = `you are the recon agent researching ONE program (bachelor's, master's or PhD; any country, any field) for one applicant.
use the program's official pages first (admissions, requirements, tuition, deadlines, scholarships/assistantships, international students). fetch them. cite what you use.
money: give amounts in USD (convert approximately) and mention the original currency in the notes.
report facts exactly as the school states them, with dates in YYYY-MM-DD. when a fact isn't stated anywhere you found, say "not found", never guess.
then judge fit for this applicant honestly: tier (reach/target/safety) and a 0-10 fit score are about ADMISSION odds, not funding. red flags are things that block admission.
also report funding levers that open up after admission: whether admits get considered for merit aid automatically, whether assistantships are posted after admission, whether aid can be appealed or reconsidered, and who to contact.`;

export const ProgramFacts = z.object({
  school_name: z.string(),
  school_city: z.string(),
  school_state: z.string(), // state/province, "" if none
  country: z.string(),
  region: z.enum(["us", "canada", "uk", "europe", "asia", "australia_nz", "middle_east", "africa", "latin_america"]),
  ranking_note: z.string(),
  post_study_work: z.string(), // e.g. "STEM OPT up to 36 months", "UK Graduate Route 2 years"
  program_name: z.string(),
  degree: z.string(),
  program_url: z.string(),
  stem_designated: z.enum(["yes", "no", "unknown"]),
  test_policy: z.enum(["required", "optional", "waivable", "not_required", "unknown"]),
  test_notes: z.string(),
  english_moi_waiver: z.enum(["accepted", "not_accepted", "case_by_case", "unknown"]),
  english_notes: z.string(),
  toefl_min: z.string(),
  ielts_min: z.string(),
  app_fee_usd: z.string(),
  fee_waiver_notes: z.string(),
  tuition_usd_total: z.string(),
  duration_months: z.string(),
  deadlines: z.array(
    z.object({ round: z.string(), date: z.string(), funding_priority: z.enum(["yes", "no", "unknown"]), notes: z.string() }),
  ),
  funding: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["merit_scholarship", "assistantship", "fellowship", "fee_waiver", "external", "other"]),
      amount_note: z.string(),
      intl_eligible: z.enum(["yes", "no", "unknown"]),
      deadline: z.string(),
      url: z.string(),
      notes: z.string(),
    }),
  ),
  full_funding_realistic: z.enum(["likely", "possible", "rare", "unknown"]),
  funding_summary: z.string(),
  portal_notes: z.string(),
  tier: z.enum(["reach", "target", "safety"]),
  fit_score: z.string(),
  fit_reasoning: z.string(),
  angle: z.string(), // the applicant's strongest angle for this program, one line
  red_flags: z.array(z.string()),
});
export type ProgramFacts = z.infer<typeof ProgramFacts>;

const num = (s: string) => {
  const m = s.replace(/[,$\s]/g, "").match(/\d+(\.\d+)?/);
  return m ? Math.round(parseFloat(m[0])) : null;
};
const iso = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s.trim()) ? s.trim() : null);

async function upsertProgram(f: ProgramFacts, sources: string[]) {
  const db = admin();
  const slug = slugify(f.school_name);
  const { data: school, error: serr } = await db
    .from("schools")
    .upsert(
      {
        slug,
        name: f.school_name,
        city: f.school_city || null,
        state: f.school_state || null,
        country: f.country || null,
        region: f.region,
        ranking_note: f.ranking_note || null,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (serr) throw new Error(`school upsert: ${serr.message}`);

  const { data: program, error: perr } = await db
    .from("programs")
    .upsert(
      {
        school_id: school.id,
        name: f.program_name,
        degree: f.degree,
        url: f.program_url || null,
        stem_designated: f.stem_designated === "unknown" ? null : f.stem_designated === "yes",
        test_policy: f.test_policy,
        toefl_min: num(f.toefl_min),
        ielts_min: num(f.ielts_min),
        tuition_usd: num(f.tuition_usd_total),
        duration_months: num(f.duration_months),
        app_fee_usd: num(f.app_fee_usd),
        fee_waiver: f.fee_waiver_notes || null,
        deadlines: f.deadlines,
        funding_signals: {
          full_funding_realistic: f.full_funding_realistic,
          summary: f.funding_summary,
          english_moi_waiver: f.english_moi_waiver,
          english_notes: f.english_notes,
          test_notes: f.test_notes,
          post_study_work: f.post_study_work,
          ranking_note: f.ranking_note,
        },
        source_urls: sources.slice(0, 20),
        verified_at: new Date().toISOString(),
      },
      { onConflict: "school_id,name,degree" },
    )
    .select("id, school_id")
    .single();
  if (perr) throw new Error(`program upsert: ${perr.message}`);

  // funding: replace this program's entries with the fresh set
  await db.from("funding_opportunities").delete().eq("program_id", program.id);
  if (f.funding.length) {
    const { error: ferr } = await db.from("funding_opportunities").insert(
      f.funding.map((x) => ({
        school_id: school.id,
        program_id: program.id,
        name: x.name,
        kind: x.kind,
        amount_note: x.amount_note || null,
        deadline: iso(x.deadline),
        eligibility: x.notes || null,
        intl_eligible: x.intl_eligible === "unknown" ? null : x.intl_eligible === "yes",
        url: x.url || null,
        verified_at: new Date().toISOString(),
      })),
    );
    if (ferr) throw new Error(`funding insert: ${ferr.message}`);
  }

  // playbook: append a version when recon learns something
  const { data: last } = await db.from("playbooks").select("version").eq("school_id", school.id).order("version", { ascending: false }).limit(1).maybeSingle();
  await db.from("playbooks").insert({
    school_id: school.id,
    version: (last?.version ?? 0) + 1,
    author: "agent:recon",
    change_note: `researched ${f.program_name}`,
    content: { portal_notes: f.portal_notes, fee_waiver: f.fee_waiver_notes, funding: f.funding_summary, sources: sources.slice(0, 10) },
  });
  return { schoolId: school.id as string, programId: program.id as string };
}

async function placeApplication(userId: string, programId: string, f: ProgramFacts, verdict: AppStatus, reasons: string[]) {
  const db = admin();
  const deadline = targetDeadline(f.deadlines, today());
  const fields = {
    tier: f.tier,
    fit_score: Math.max(0, Math.min(10, parseFloat(f.fit_score) || 0)),
    fit_reasoning: [f.fit_reasoning, ...reasons.map((r) => `⚑ ${r}`), ...f.red_flags.map((r) => `⚑ ${r}`)].join("\n"),
    angle: f.angle,
    target_deadline: deadline?.date ?? null,
    portal_url: f.program_url || null,
  };
  const { data: existing } = await db.from("applications").select("id, status").eq("user_id", userId).eq("program_id", programId).maybeSingle();
  if (!existing) {
    const { data, error } = await db.from("applications").insert({ user_id: userId, program_id: programId, status: verdict, ...fields }).select("id").single();
    if (error) throw new Error(`application insert: ${error.message}`);
    return data.id as string;
  }
  // refresh research fields; only move status along legal transitions, and never touch work already past shortlisting
  const status = existing.status as AppStatus;
  const move = (status === "researching" || status === "shortlisted") && status !== verdict && canTransition(status, verdict);
  const { error } = await db.from("applications").update({ ...fields, ...(move ? { status: verdict } : {}) }).eq("id", existing.id);
  if (error) throw new Error(`application update: ${error.message}`);
  return existing.id as string;
}

export const recon: Record<string, Handler> = {
  // planner: one discovery job per selected region, plus the scholarship hunt
  "recon.discover": async (job) => {
    const profile = await getProfile(job.user_id);
    const only = (job.payload as { regions?: string[] }).regions;
    const { plan } = await userPlan(job.user_id);
    const regions = (only?.length ? only.filter((r) => REGIONS[r]) : regionList(profile.preferences.regions)).slice(0, plan.maxRegions);
    const total = Math.min(MAX_PROGRAMS, plan.programsPerRun);
    const perRegion = Math.max(Math.min(5, total), Math.ceil(total / regions.length));
    for (const region of regions) {
      await enqueue({
        userId: job.user_id,
        agent: "recon",
        task: "discover_region",
        payload: { region, count: perRegion },
        idempotencyKey: `discover:${job.user_id}:${region}:${job.id}`,
        parentJobId: job.id,
      });
    }
    await enqueue({
      userId: job.user_id,
      agent: "recon",
      task: "scholarships",
      idempotencyKey: `scholarships:${job.user_id}:${today()}`,
      parentJobId: job.id,
    });
    await logEvent({ userId: job.user_id, actor: "agent:recon", action: "recon.planned", context: { regions, perRegion } });
    return { regions };
  },

  "recon.discover_region": async (job) => {
    const { region, count } = job.payload as { region: string; count: number };
    const profile = await getProfile(job.user_id);
    const db = admin();
    const { data: row } = await db.from("profiles").select("target_term").eq("id", job.user_id).single();
    const { data: existing } = await db.from("applications").select("programs(name, schools(name))").eq("user_id", job.user_id);
    const already = (existing ?? [])
      .map((a) => {
        const p = a.programs as unknown as { name: string; schools: { name: string } } | null;
        return p ? `${p.schools.name}: ${p.name}` : "";
      })
      .filter(Boolean);

    const found = await research({
      userId: job.user_id,
      agent: "recon",
      jobId: job.id,
      system: DISCOVER_SYSTEM,
      prompt: `region: ${REGIONS[region]}
${levelGuide(levelOf(profile))}

applicant:
${profileBrief(profile, row?.target_term)}

today is ${today()}. target intake: ${row?.target_term ?? "fall-2027"}.
${already.length ? `already on their list (don't repeat):\n${already.join("\n")}\n` : ""}
find ${count} ${levelName(levelOf(profile))} programs in ${REGIONS[region]} that match their fields and degree types and respect their ADMISSION constraints (admissions tests, english route, deadlines). report funding signals, but don't filter on them.
work top-down: roughly half from the region's top-ranked universities, then strong, then accessible. give each its ranking context and official url.
finish with honest strategy notes for this region: which of their constraints cost them the most admits here, what would open more, and where post-admission funding pushes tend to work (e.g. schools known to reconsider merit aid or post assistantships after admission).`,
      maxSearches: 6,
      maxFetches: 2,
    });

    const { output, runId } = await runStructured({
      userId: job.user_id,
      agent: "recon",
      jobId: job.id,
      tier: "cheap",
      promptVersion: "discover-parse-v2",
      system: "turn research notes into structured data. only include programs the notes actually name. keep urls exactly as written; empty string when none. band: top = world top ~100 or a national flagship; strong = well-ranked below that; accessible = the rest.",
      prompt: `research notes:\n${found.text}\n\nsources seen:\n${found.sources.join("\n")}`,
      schema: Candidates,
      maxTokens: 8000,
    });

    const order = { top: 0, strong: 1, accessible: 2 } as const;
    const picks = [...output.candidates].sort((a, b) => order[a.band] - order[b.band]).slice(0, count);
    for (const c of picks) {
      await enqueue({
        userId: job.user_id,
        agent: "recon",
        task: "research_program",
        payload: { ...c, region },
        idempotencyKey: `research:${job.user_id}:${slugify(c.school)}:${slugify(c.program)}:${today()}`,
        parentJobId: job.id,
      });
    }

    await logEvent({
      userId: job.user_id,
      actor: "agent:recon",
      action: "recon.discovered",
      agentRunId: runId,
      reasoning: output.strategy_notes.join("\n"),
      context: { region, candidates: picks.length, strategy_notes: output.strategy_notes, searches: found.searches },
    });
    return { region, candidates: picks.length };
  },

  "recon.research_program": async (job) => {
    const p = job.payload as {
      school: string; program: string; degree: string; url: string; why: string; funding_angle: string;
      country?: string; region?: string; ranking_note?: string;
    };
    const profile = await getProfile(job.user_id);
    const db = admin();
    const { data: row } = await db.from("profiles").select("target_term").eq("id", job.user_id).single();
    const ug = profile.education.find((e) => /bach|b\.|bsc|ba|btech|b\.tech|hnd|licen/i.test(e.degree ?? "")) ?? profile.education[0];
    const undergrad = ug ? `${ug.institution}${ug.country ? ` (${ug.country})` : ""}` : "their undergraduate university";

    // the world model is shared: if this program was researched recently (by any run, any user),
    // reuse the facts and only judge fit for this applicant. no web calls.
    const cached = await cachedProgramNotes(p.school, p.program);
    const found = cached ?? await research({
      userId: job.user_id,
      agent: "recon",
      jobId: job.id,
      system: PROGRAM_SYSTEM,
      prompt: `program: ${p.program} (${p.degree}) at ${p.school}${p.country ? `, ${p.country}` : ""}
ranking context: ${p.ranking_note || "unknown"}
starting url: ${p.url || "(find it)"}
why it was picked: ${p.why}
funding angle to verify: ${p.funding_angle}
intake: ${row?.target_term ?? "fall-2027"}. today: ${today()}.

applicant:
${profileBrief(profile, row?.target_term)}

${levelGuide(levelOf(profile))}

find and report: degree type and length; ${programChecklist(levelOf(profile))}; admissions tests (GRE/GMAT/other) required, optional or waivable, and waiver rules; english requirements and whether a medium-of-instruction letter from ${undergrad} is accepted; application fee and fee waiver options; tuition; post-study work rights for internationals in that country; every application round with its date and whether it's the priority/scholarship round; every scholarship, assistantship or fellowship open to international students (and to ${profile.identity.citizenship ?? "their"} citizens specifically) in this program, with amounts; how to apply (portal). then judge this applicant's fit.`,
      maxSearches: 3,
      maxFetches: 3,
    });

    const { output: facts, runId } = await runStructured({
      userId: job.user_id,
      agent: "recon",
      jobId: job.id,
      tier: "cheap",
      promptVersion: "program-parse-v2",
      system: `turn research notes into structured program data. use only what the notes say. "unknown" or "" when the notes don't say. dates as YYYY-MM-DD; if a date has no year, assume the ${row?.target_term ?? "fall-2027"} cycle. fit judgement comes from the notes' assessment.`,
      prompt: `${cached ? "stored program facts (judge fit for THIS applicant from them):" : "research notes:"}\n${found.text}${
        cached ? `\n\napplicant:\n${profileBrief(profile, row?.target_term)}` : ""
      }`,
      schema: ProgramFacts,
      maxTokens: 6000,
    });

    const { schoolId, programId } = await upsertProgram(facts, found.sources);
    const { verdict, reasons } = screen(profile, facts, today());
    const appId = await placeApplication(job.user_id, programId, facts, verdict, reasons);

    await logEvent({
      userId: job.user_id,
      actor: "agent:recon",
      action: `program.${verdict}`,
      capability: "school.add_drop",
      schoolId,
      programId,
      applicationId: appId,
      agentRunId: runId,
      reasoning: facts.fit_reasoning,
      context: { tier: facts.tier, fit: facts.fit_score, funding: facts.full_funding_realistic, reasons, sources: found.sources.slice(0, 10), cached: !!cached },
    });
    return { verdict, tier: facts.tier };
  },
};

// ---------------------------------------------------------------------------
// scholarships: hunt by every eligibility hook in the profile, not just nationality
// ---------------------------------------------------------------------------
const SCHOLAR_SYSTEM = `you are the scholarship hunter on an application platform for bachelor's, master's and PhD applicants from any country, in any field, applying anywhere. only awards for the applicant's study level count.
most applicants only search by nationality and miss most of the money. you search by every eligibility hook the applicant actually has. typical hooks, use the ones the profile supports:
- host-country government awards for the regions they're targeting, checked against their citizenship
- field-of-study and profession awards (their actual field and industry), professional bodies and associations
- employer-, alumni- and network-linked funding (companies, accelerators, programs they've been part of)
- talent, leadership, merit and community-impact awards
- founder/entrepreneurship fellowships if they've built something
- competition winners and prize alumni networks
- research, publication or innovation records
- region and nationality awards (home country, home region, developing-country schemes)
- identity- and circumstance-based awards (gender, first-generation, career changer, refugee, disability) ONLY when the profile states it
- legit loan-replacement or income-share options, clearly labelled as such

rules:
- only real, currently-running awards for graduate study in the regions they're targeting (or portable to them). check the official page.
- for each one, name the exact profile fact that makes them eligible, and rate the match honestly: strong, possible, or long_shot.
- amounts in USD (approximate, mention original currency), deadlines for the target intake, and whether their citizenship is eligible. "not found" when a page doesn't say.
- skip scams, essay-mill "scholarships", and anything that charges a fee to apply.`;

export const Scholarships = z.object({
  scholarships: z.array(
    z.object({
      name: z.string(),
      sponsor: z.string(),
      url: z.string(),
      amount_note: z.string(),
      deadline: z.string(),
      intl_eligible: z.enum(["yes", "no", "unknown"]),
      hook: z.string(), // the profile fact that qualifies them
      fit: z.enum(["strong", "possible", "long_shot"]),
      requirements: z.string(),
    }),
  ),
});

recon["recon.scholarships"] = async (job) => {
  const profile = await getProfile(job.user_id);
  const db = admin();
  const { data: row } = await db.from("profiles").select("target_term").eq("id", job.user_id).single();
  const term = row?.target_term ?? "fall-2027";

  const found = await research({
    userId: job.user_id,
    agent: "recon",
    jobId: job.id,
    system: SCHOLAR_SYSTEM,
    prompt: `applicant:
${profileBrief(profile, term)}

awards, ventures and other notes:
${profile.notes.join("\n") || "(none)"}

stories:
${profile.stories.map((s) => `- ${s.title}: ${s.summary}`).join("\n") || "(none)"}

study level: ${levelName(levelOf(profile))}
regions they're targeting: ${regionList(profile.preferences.regions).map((r) => REGIONS[r]).join(", ")}
citizenship: ${profile.identity.citizenship ?? "unknown"}
today is ${today()}. intake: ${term}.
first list every eligibility hook you see in this profile. then search for scholarships and fellowships hook by hook. aim for 15-25 real options, strongest matches first.`,
    maxSearches: 12,
    maxFetches: 5,
  });

  const { output, runId } = await runStructured({
    userId: job.user_id,
    agent: "recon",
    jobId: job.id,
    tier: "cheap",
    promptVersion: "scholarships-parse-v1",
    system: `turn research notes into structured scholarship data. only include awards the notes actually name. keep urls exactly; "" when none. deadlines as YYYY-MM-DD when the notes give a full date, otherwise as written.`,
    prompt: `research notes:\n${found.text}`,
    schema: Scholarships,
    maxTokens: 8000,
  });

  let saved = 0;
  for (const x of output.scholarships) {
    const { data: existing } = await db.from("funding_opportunities").select("id").is("school_id", null).eq("name", x.name).maybeSingle();
    const fields = {
      name: x.name,
      sponsor: x.sponsor || null,
      kind: "external",
      amount_note: x.amount_note || null,
      deadline: iso(x.deadline),
      eligibility: x.requirements || null,
      intl_eligible: x.intl_eligible === "unknown" ? null : x.intl_eligible === "yes",
      url: x.url || null,
      verified_at: new Date().toISOString(),
    };
    let oppId = existing?.id as string | undefined;
    if (oppId) {
      await db.from("funding_opportunities").update(fields).eq("id", oppId);
    } else {
      const { data: ins, error } = await db.from("funding_opportunities").insert(fields).select("id").single();
      if (error) throw new Error(`funding insert: ${error.message}`);
      oppId = ins.id as string;
    }
    const { error: uerr } = await db
      .from("user_funding")
      .upsert({ user_id: job.user_id, opportunity_id: oppId, fit: x.fit, why: x.hook }, { onConflict: "user_id,opportunity_id" });
    if (uerr) throw new Error(`user_funding upsert: ${uerr.message}`);
    saved++;
  }

  await logEvent({
    userId: job.user_id,
    actor: "agent:recon",
    action: "scholarships.found",
    agentRunId: runId,
    context: { found: saved, strong: output.scholarships.filter((x) => x.fit === "strong").length, searches: found.searches },
  });
  return { found: saved };
};

async function cachedProgramNotes(school: string, program: string): Promise<{ text: string; sources: string[] } | null> {
  const db = admin();
  const since = new Date(Date.now() - CACHE_DAYS * 86_400_000).toISOString();
  const { data: sch } = await db.from("schools").select("id, name, city, state, country, region, ranking_note").eq("slug", slugify(school)).maybeSingle();
  if (!sch) return null;
  const { data: progs } = await db
    .from("programs")
    .select("id, name, degree, url, stem_designated, test_policy, toefl_min, ielts_min, tuition_usd, duration_months, app_fee_usd, fee_waiver, deadlines, funding_signals, source_urls, verified_at")
    .eq("school_id", sch.id)
    .gte("verified_at", since);
  const want = slugify(program);
  const prog = (progs ?? []).find((x) => slugify(x.name) === want || slugify(x.name).includes(want) || want.includes(slugify(x.name)));
  if (!prog) return null;
  const { data: funding } = await db.from("funding_opportunities").select("name, kind, amount_note, intl_eligible, deadline, url, eligibility").eq("program_id", prog.id);
  const text = JSON.stringify({ school: sch, program: prog, funding: funding ?? [] });
  return { text, sources: (prog.source_urls as string[]) ?? [] };
}
