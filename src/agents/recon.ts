import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { research } from "@/lib/research";
import { getProfile } from "@/lib/profile-store";
import { profileBrief } from "@/lib/profile";
import { logEvent } from "@/lib/events";
import { enqueue } from "@/lib/queue";
import { screen, targetDeadline } from "@/lib/fit";
import { canTransition, type AppStatus } from "@/lib/app-state";

const today = () => new Date().toISOString().slice(0, 10);
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const MAX_PROGRAMS = 25;

// ---------------------------------------------------------------------------
// discover: find candidate programs
// ---------------------------------------------------------------------------
const DISCOVER_SYSTEM = `you are the recon agent for an international applicant going to a US masters program.
you find programs worth applying to, and you are honest about funding.

how full funding for a business/finance master's actually happens in the US, for an international student:
- graduate assistantships (tuition waiver + stipend), mostly at public universities, often in MS Management, MS Finance, MS Entrepreneurship, MS Business Analytics, MS Information Systems, or economics-adjacent programs. many are only offered after admission and some go mainly to PhD students; say so when that's the case.
- full-tuition merit scholarships at some MBA/MS programs, usually competitive, sometimes with GMAT/GRE waivers for experienced applicants.
- program-specific fellowships, and external awards open to the applicant's citizenship.
most one-year business master's give partial scholarships at best. don't pretend otherwise.

search the web. go past the obvious top-20 list: mid-ranked and regional schools that fund internationals, STEM-designated programs, schools with test waivers for experienced professionals. look for real program pages, not rankings blogs.`;

const Candidates = z.object({
  candidates: z.array(
    z.object({
      school: z.string(),
      program: z.string(),
      degree: z.string(),
      url: z.string(),
      why: z.string(),
      funding_angle: z.string(),
    }),
  ),
  external_funding: z.array(z.object({ name: z.string(), url: z.string(), notes: z.string() })),
  strategy_notes: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// research one program
// ---------------------------------------------------------------------------
const PROGRAM_SYSTEM = `you are the recon agent researching ONE US masters program for one applicant.
use the program's official pages first (admissions, requirements, tuition, deadlines, scholarships/assistantships, international students). fetch them. cite what you use.
report facts exactly as the school states them, with dates in YYYY-MM-DD. when a fact isn't stated anywhere you found, say "not found", never guess.
then judge fit for this applicant honestly: tier (reach/target/safety), a 0-10 fit score, and red flags.`;

const ProgramFacts = z.object({
  school_name: z.string(),
  school_city: z.string(),
  school_state: z.string(),
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
      { slug, name: f.school_name, city: f.school_city || null, state: f.school_state || null, verified_at: new Date().toISOString() },
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
  "recon.discover": async (job) => {
    const profile = await getProfile(job.user_id);
    const db = admin();
    const { data: row } = await db.from("profiles").select("target_term").eq("id", job.user_id).single();
    const { data: existing } = await db
      .from("applications")
      .select("programs(name, schools(name))")
      .eq("user_id", job.user_id);
    const already = (existing ?? []).map((a) => {
      const p = a.programs as unknown as { name: string; schools: { name: string } } | null;
      return p ? `${p.schools.name}: ${p.name}` : "";
    }).filter(Boolean);

    const found = await research({
      userId: job.user_id,
      agent: "recon",
      jobId: job.id,
      system: DISCOVER_SYSTEM,
      prompt: `applicant:
${profileBrief(profile, row?.target_term)}

today is ${today()}. target intake: ${row?.target_term ?? "fall-2027"}.
${already.length ? `already on their list (don't repeat):\n${already.join("\n")}\n` : ""}
find ${MAX_PROGRAMS} US masters programs that fit their fields and constraints, spread across reach, target and safety, with the strongest realistic path to full funding first. include each program's official url.
also list external scholarships and fellowships they could win. don't stop at nationality: the dedicated scholarship agent runs separately, so a handful of strong leads is enough here.
finish with honest strategy notes: which of their constraints cost them the most options, and what would open more funding.`,
      maxSearches: 10,
      maxFetches: 4,
    });

    const { output, runId } = await runStructured({
      userId: job.user_id,
      agent: "recon",
      jobId: job.id,
      promptVersion: "discover-parse-v1",
      system: "turn research notes into structured data. only include programs and scholarships the notes actually name. keep urls exactly as written; empty string when none.",
      prompt: `research notes:\n${found.text}\n\nsources seen:\n${found.sources.join("\n")}`,
      schema: Candidates,
      maxTokens: 8000,
    });

    const picks = output.candidates.slice(0, MAX_PROGRAMS);
    for (const c of picks) {
      await enqueue({
        userId: job.user_id,
        agent: "recon",
        task: "research_program",
        payload: { school: c.school, program: c.program, degree: c.degree, url: c.url, why: c.why, funding_angle: c.funding_angle },
        idempotencyKey: `research:${job.user_id}:${slugify(c.school)}:${slugify(c.program)}:${today()}`,
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

    // external scholarships go straight into the world model
    for (const s of output.external_funding) {
      const { data: dupe } = await db.from("funding_opportunities").select("id").is("school_id", null).eq("name", s.name).maybeSingle();
      if (!dupe) {
        await db.from("funding_opportunities").insert({ name: s.name, kind: "external", url: s.url || null, eligibility: s.notes, verified_at: new Date().toISOString() });
      }
    }

    await logEvent({
      userId: job.user_id,
      actor: "agent:recon",
      action: "recon.discovered",
      agentRunId: runId,
      reasoning: output.strategy_notes.join("\n"),
      context: { candidates: picks.length, external: output.external_funding.length, strategy_notes: output.strategy_notes, searches: found.searches },
    });
    return { candidates: picks.length };
  },

  "recon.research_program": async (job) => {
    const p = job.payload as { school: string; program: string; degree: string; url: string; why: string; funding_angle: string };
    const profile = await getProfile(job.user_id);
    const db = admin();
    const { data: row } = await db.from("profiles").select("target_term").eq("id", job.user_id).single();

    const found = await research({
      userId: job.user_id,
      agent: "recon",
      jobId: job.id,
      system: PROGRAM_SYSTEM,
      prompt: `program: ${p.program} (${p.degree}) at ${p.school}
starting url: ${p.url || "(find it)"}
why it was picked: ${p.why}
funding angle to verify: ${p.funding_angle}
intake: ${row?.target_term ?? "fall-2027"}. today: ${today()}.

applicant:
${profileBrief(profile, row?.target_term)}

find and report: degree and STEM designation; GMAT/GRE policy and any waiver rules; english requirements and whether a medium-of-instruction letter from a Nigerian university is accepted; application fee and fee waiver options; tuition and length; every application round with its date and whether it's the priority/scholarship round; every scholarship, assistantship or fellowship open to international students in this program, with amounts; how to apply (portal). then judge this applicant's fit.`,
      maxSearches: 6,
      maxFetches: 6,
    });

    const { output: facts, runId } = await runStructured({
      userId: job.user_id,
      agent: "recon",
      jobId: job.id,
      promptVersion: "program-parse-v1",
      system: `turn research notes into structured program data. use only what the notes say. "unknown" or "" when the notes don't say. dates as YYYY-MM-DD; if a date has no year, assume the ${row?.target_term ?? "fall-2027"} cycle. fit judgement comes from the notes' assessment.`,
      prompt: `research notes:\n${found.text}`,
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
      context: { tier: facts.tier, fit: facts.fit_score, funding: facts.full_funding_realistic, reasons, sources: found.sources.slice(0, 10) },
    });
    return { verdict, tier: facts.tier };
  },
};

// ---------------------------------------------------------------------------
// scholarships: hunt by every eligibility hook in the profile, not just nationality
// ---------------------------------------------------------------------------
const SCHOLAR_SYSTEM = `you are the scholarship hunter on a US masters application platform.
most applicants only search by nationality and miss most of the money. you search by every eligibility hook the applicant has:
- talent, leadership and merit awards (leadership track record, team leadership, community impact)
- founder and entrepreneurship awards and fellowships (they're building a startup)
- competition winners and alumni networks (e.g. a hult prize win, accelerator alumni like y combinator companies they worked at)
- employer- and industry-linked funding: fintech, payments, banking, sales/partnerships, professional associations in their field
- field-of-study awards for business, finance, management, entrepreneurship, analytics, fintech
- region and nationality: african, nigerian, sub-saharan, developing-country awards
- underrepresented-group, first-generation, career-changer and experienced-professional awards when the profile supports them
- loan-replacement and income-share options only if clearly legit, and say so

rules:
- only real, currently-running programs for graduate study in the US (or portable to the US). check the official page.
- for each one, name the exact profile fact that makes them eligible, and rate the match honestly: strong, possible, or long_shot.
- note amounts, deadlines for the target intake, and whether internationals are eligible. "not found" when a page doesn't say.
- skip scams, essay-mill "scholarships", and anything that charges a fee to apply.`;

const Scholarships = z.object({
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

today is ${today()}. intake: ${term}.
first list every eligibility hook you see in this profile. then search for scholarships and fellowships hook by hook. aim for 15-25 real options, strongest matches first.`,
    maxSearches: 12,
    maxFetches: 5,
  });

  const { output, runId } = await runStructured({
    userId: job.user_id,
    agent: "recon",
    jobId: job.id,
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
