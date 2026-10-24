import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { research } from "@/lib/research";
import { getProfile } from "@/lib/profile-store";
import { sortWork, levelOf, LEVEL_LABEL, type Profile } from "@/lib/profile";
import { levelGuide, defaultEssay } from "@/lib/levels";
import { logEvent } from "@/lib/events";
import { enqueue } from "@/lib/queue";
import { withinLimit, nextStep, clichesIn, CLICHES, MAX_ROUNDS, disputedFigures, maskDisputed, placeholdersIn } from "@/lib/writing";

// strategist -> writer -> red team -> (writer -> red team)* -> ready for the user.
// hard rule across all three: nothing goes into a draft that isn't in the applicant's profile.
// the draft is a starting point; the applicant edits it and approves the final in their own words.

const today = () => new Date().toISOString().slice(0, 10);

// everything a writer may draw on. funding details and admin notes stay out.
export function factSheet(p: Profile) {
  return {
    applying_for: LEVEL_LABEL[levelOf(p)],
    name: p.identity.full_name,
    citizenship: p.identity.citizenship,
    lives_in: [p.identity.city, p.identity.country_of_residence].filter(Boolean).join(", "),
    education: p.education,
    work: sortWork(p.work),
    tests: p.tests,
    goals: p.goals,
    stories: p.stories,
    awards_and_other: p.notes,
    skills: p.skills.slice(0, 25),
    confirmed_facts: p.confirmed_facts,
  };
}

async function disputedTopics(userId: string): Promise<string[]> {
  return (await disputed(userId)).titles;
}

// unsettled conflicts: their topics, and the actual figures to mask out of the fact sheet
export async function disputed(userId: string): Promise<{ titles: string[]; figures: string[] }> {
  const { data } = await admin().from("approvals").select("title, payload").eq("user_id", userId).eq("kind", "fact_confirm").eq("status", "pending");
  const titles = (data ?? []).map((d) => d.title as string);
  const options = (data ?? []).flatMap((d) => ((d.payload as { options?: string[] }).options ?? []));
  return { titles, figures: disputedFigures(options) };
}

// the fact sheet an agent may write from: disputed figures already removed
export async function safeFactSheet(userId: string, p: Profile) {
  const { figures } = await disputed(userId);
  return maskDisputed(factSheet(p), figures);
}

async function loadApp(userId: string, applicationId: string) {
  const { data, error } = await admin()
    .from("applications")
    .select("id, angle, fit_reasoning, programs(id, name, degree, url, schools(id, name, country))")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("application not found");
  const p = data.programs as unknown as { id: string; name: string; degree: string; url: string | null; schools: { id: string; name: string; country: string | null } };
  return { app: data, program: p, school: p.schools };
}

// ---------------------------------------------------------------------------
// strategist: find what the program asks for, and decide how to position the applicant
// ---------------------------------------------------------------------------
const STRATEGIST_SYSTEM = `you are the strategist on an application platform for bachelor's, master's and PhD applicants (any field, any country).
for one program and one applicant you work out two things:
1. exactly what written material the application asks for: every essay, statement, short answer and scholarship essay, with the official prompt text and word/character limit. use the program's official application pages. if prompts aren't published yet for this cycle, use last cycle's and say so.
for a PhD, also name the faculty whose research fits the applicant (who to contact, why), and say whether this program expects contact or a proposal before applying. for a bachelor's, note the application system (Common App, UCAS...) and any supplemental essays.
2. the positioning: the one clear story that makes this applicant make sense for this program. specific reasons this program (courses, research groups, faculty, centres, clinics, labs, partnerships) with where you found them. which of the applicant's own stories to use. the weak spots an admissions reader will notice (gaps, field switch, grades, missing tests) and how to address them honestly. what to avoid.
never invent anything about the applicant. work only from the facts given.`;

export const Plan = z.object({
  essays: z.array(
    z.object({
      kind: z.enum(["statement_of_purpose", "personal_statement", "short_answer", "scholarship_essay", "diversity_statement", "research_proposal", "video_or_interview", "other"]),
      title: z.string(),
      prompt: z.string(),
      word_limit: z.string(), // digits, or "" if none
      required: z.enum(["yes", "no"]),
    }),
  ),
  other_requirements: z.array(z.string()), // cv format, references count, portfolio, writing sample...
  prompts_are_current: z.enum(["yes", "last_cycle", "unknown"]),
  brief: z.object({
    narrative: z.string(),
    angle: z.string(),
    why_this_program: z.array(z.string()),
    stories_to_use: z.array(z.string()),
    weaknesses_to_address: z.array(z.string()),
    people_to_contact: z.array(z.string()), // phd: potential supervisors with why; others: [] unless useful
    avoid: z.array(z.string()),
    tone: z.string(),
  }),
});

function briefToText(b: z.infer<typeof Plan>["brief"], extra: { reqs: string[]; current: string; sources: string[] }) {
  const list = (h: string, xs: string[]) => (xs.length ? `## ${h}\n${xs.map((x) => `- ${x}`).join("\n")}\n` : "");
  return [
    `## the story\n${b.narrative}\n`,
    `## angle\n${b.angle}\n`,
    list("why this program", b.why_this_program),
    list("stories to use", b.stories_to_use),
    list("weak spots to handle", b.weaknesses_to_address),
    list("people to contact", b.people_to_contact),
    list("avoid", b.avoid),
    `## tone\n${b.tone}\n`,
    list("other requirements", extra.reqs),
    extra.current !== "yes" ? `_prompts: ${extra.current === "last_cycle" ? "from last cycle, check again when this cycle opens" : "not confirmed"}_\n` : "",
    list("sources", extra.sources.slice(0, 8)),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// writer
// ---------------------------------------------------------------------------
const WRITER_SYSTEM = `you are the writer on an application platform for bachelor's, master's and PhD applicants. match the register to the level: a bachelor's personal statement sounds like a thoughtful school-leaver, not a professional; a PhD research statement is precise about questions, methods and fit with faculty. you draft application essays FOR the applicant to edit and own. they will rewrite it in their own words before submitting; your job is a strong, honest first draft.

non-negotiable:
- every fact, number, name, date and achievement must come from the applicant's fact sheet. if it isn't there, it doesn't go in. no invented anecdotes, quotes, feelings attributed to specific moments, or outcomes.
- never use a disputed figure (listed separately). describe that achievement without the number.
- answer the exact prompt, inside the limit.
- never leave placeholders, brackets or "[insert ...]". if the brief has no program specifics, write a short honest fit paragraph from what it does have.
- no superlatives or firsts ("most senior", "first ever", "largest") unless the fact sheet says exactly that. don't turn volume into revenue or a pipeline into sales.

how it should read:
- first person, plain, specific, confident without bragging. short paragraphs. concrete over abstract: show what they did and what changed, with numbers.
- the program-specific part must name real things from the strategy brief, not generic praise.
- no clichés, no grand openings, no "ever since I was a child", no thesaurus words. it should sound like a sharp person talking, not like ai.
- list every factual claim you made and which fact-sheet item supports it.`;

export const Draft = z.object({
  essay: z.string(),
  claims: z.array(z.object({ claim: z.string(), basis: z.string() })),
  stories_used: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// red team
// ---------------------------------------------------------------------------
const REDTEAM_SYSTEM = `you are the red team on an application platform for bachelor's, master's and PhD applicants. you read a draft as the toughest admissions reader at this program would, and you fact-check it against the applicant's fact sheet.

check, in order:
1. truth: list every claim in the essay that the fact sheet doesn't support, or that uses a disputed figure. this is the most important check. be strict: a rounded-up number or an embellished title counts.
2. the prompt: does it answer every part of what was asked?
3. reasons for this program: specific and real, or generic praise that would fit any school?
4. the reader's doubts: are the applicant's weak spots handled or ignored?
5. writing: clichés, filler, ai-sounding phrasing (${CLICHES.slice(0, 8).join(", ")}...), vague claims without evidence, weak opening, weak ending.
verdict "pass" only if it's genuinely ready for the applicant to personalise. give fixes the writer can act on.`;

export const Review = z.object({
  verdict: z.enum(["pass", "revise"]),
  score: z.string(), // 1-10
  unsupported_claims: z.array(z.string()),
  issues: z.array(z.object({ severity: z.enum(["high", "medium", "low"]), issue: z.string(), fix: z.string() })),
  summary: z.string(),
});

const TEXT_KINDS = new Set(["statement_of_purpose", "personal_statement", "short_answer", "scholarship_essay", "diversity_statement", "research_proposal", "other"]);

export const writer: Record<string, Handler> = {
  "strategist.plan": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const db = admin();
    const profile = await getProfile(job.user_id);
    const { app, program, school } = await loadApp(job.user_id, applicationId);
    const { data: row } = await db.from("profiles").select("target_term").eq("id", job.user_id).single();

    const level = levelOf(profile);
    const fallback = defaultEssay(level);
    const found = await research({
      userId: job.user_id,
      agent: "strategist",
      jobId: job.id,
      system: STRATEGIST_SYSTEM,
      prompt: `${levelGuide(level)}

program: ${program.name} (${program.degree}) at ${school.name}${school.country ? `, ${school.country}` : ""}
official page: ${program.url ?? "(find it)"}
intake: ${row?.target_term ?? "fall-2027"}. today: ${today()}.
recon's earlier read on fit: ${app.fit_reasoning ?? "none"}
recon's suggested angle: ${app.angle ?? "none"}

applicant fact sheet:
${JSON.stringify(await safeFactSheet(job.user_id, profile))}

find the application's written requirements (official prompts and limits), then research the program closely enough to position this applicant specifically.`,
      maxSearches: 6,
      maxFetches: 5,
    });

    const { output: plan, runId } = await runStructured({
      userId: job.user_id,
      agent: "strategist",
      jobId: job.id,
      tier: "write",
      promptVersion: "plan-v1",
      system: `turn the research notes into a structured application plan. essays: only ones the notes say this application asks for; prompt text verbatim where the notes have it; word_limit as digits ("" if none; convert character limits to roughly words/6 and say so in the title). if the notes found no prompts at all, include one ${fallback.kind} titled "${fallback.title}" with prompt "${fallback.prompt}" and word_limit "${fallback.limit}". brief: use only facts from this fact sheet ("[disputed figure]" = unconfirmed, don't use):\n${JSON.stringify(await safeFactSheet(job.user_id, profile))}. why_this_program must name real, specific things from the notes; if the notes have none, say "research didn't find program specifics" instead of inventing.`,
      prompt: `research notes:\n${found.text}`,
      schema: Plan,
      maxTokens: 8000,
    });

    // the brief lives as an artifact so it has versions and the user can read it
    const briefText = briefToText(plan.brief, { reqs: plan.other_requirements, current: plan.prompts_are_current, sources: found.sources });
    const { data: existingBrief } = await db.from("artifacts").select("id, current_version").eq("application_id", applicationId).eq("kind", "strategy").maybeSingle();
    let briefId = existingBrief?.id as string | undefined;
    const briefVersion = (existingBrief?.current_version ?? 0) + 1;
    if (!briefId) {
      const { data, error } = await db
        .from("artifacts")
        .insert({ user_id: job.user_id, application_id: applicationId, kind: "strategy", title: "positioning brief", current_version: 0 })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      briefId = data.id as string;
    }
    await db.from("artifact_versions").insert({ artifact_id: briefId, user_id: job.user_id, version: briefVersion, content: briefText, author: "agent:strategist" });
    await db.from("artifacts").update({ current_version: briefVersion }).eq("id", briefId);
    await db.from("applications").update({ angle: plan.brief.angle }).eq("id", applicationId);

    // one artifact per written requirement; reuse by title so re-planning doesn't duplicate
    const { data: have } = await db.from("artifacts").select("id, title").eq("application_id", applicationId).neq("kind", "strategy");
    const byTitle = new Map((have ?? []).map((a) => [String(a.title).toLowerCase(), a.id as string]));
    let queued = 0;
    for (const e of plan.essays) {
      const limit = parseInt(e.word_limit, 10) || null;
      let id = byTitle.get(e.title.toLowerCase());
      if (id) {
        await db.from("artifacts").update({ prompt: e.prompt, word_limit: limit, kind: e.kind }).eq("id", id);
      } else {
        const { data, error } = await db
          .from("artifacts")
          .insert({ user_id: job.user_id, application_id: applicationId, kind: e.kind, title: e.title, prompt: e.prompt, word_limit: limit, current_version: 0 })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        id = data.id as string;
      }
      if (TEXT_KINDS.has(e.kind)) {
        await enqueue({ userId: job.user_id, agent: "writer", task: "draft", payload: { artifactId: id, round: 1 }, parentJobId: job.id });
        queued++;
      }
    }

    // money before submitting: look for an application fee waiver
    await enqueue({
      userId: job.user_id,
      agent: "closer",
      task: "fee_waiver",
      payload: { applicationId },
      idempotencyKey: `fee_waiver:${applicationId}`,
      parentJobId: job.id,
    });

    await logEvent({
      userId: job.user_id,
      actor: "agent:strategist",
      action: "application.planned",
      applicationId,
      programId: program.id,
      schoolId: school.id,
      agentRunId: runId,
      reasoning: plan.brief.narrative,
      context: { essays: plan.essays.length, drafting: queued, prompts: plan.prompts_are_current },
    });
    return { essays: plan.essays.length, drafting: queued };
  },

  "writer.draft": async (job) => {
    const { artifactId, round, userNotes, strict } = job.payload as { artifactId: string; round: number; userNotes?: string; strict?: boolean };
    const db = admin();
    const { data: art, error } = await db
      .from("artifacts")
      .select("id, application_id, kind, title, prompt, word_limit, current_version")
      .eq("id", artifactId)
      .eq("user_id", job.user_id)
      .single();
    if (error || !art) throw new Error("artifact not found");

    const profile = await getProfile(job.user_id);
    const { program, school } = await loadApp(job.user_id, art.application_id);
    const [{ data: brief }, { data: prev }, disputed] = await Promise.all([
      db.from("artifacts").select("artifact_versions(content, version)").eq("application_id", art.application_id).eq("kind", "strategy").maybeSingle(),
      art.current_version
        ? db.from("artifact_versions").select("content, critique, author").eq("artifact_id", artifactId).eq("version", art.current_version).maybeSingle()
        : Promise.resolve({ data: null }),
      disputedTopics(job.user_id),
    ]);
    const briefText = ((brief?.artifact_versions as { content: string; version: number }[] | undefined) ?? []).sort((a, b) => b.version - a.version)[0]?.content ?? "(no brief)";

    const revising = !!prev;
    const { output, runId } = await runStructured({
      userId: job.user_id,
      agent: "writer",
      jobId: job.id,
      tier: "write",
      promptVersion: "write-v1",
      system: WRITER_SYSTEM,
      cachePrefix: `applicant fact sheet (the only source of facts; "[disputed figure]" means the applicant hasn't confirmed that number, so leave it out):\n${JSON.stringify(await safeFactSheet(job.user_id, profile))}`,
      prompt: `program: ${program.name} (${program.degree}) at ${school.name}
piece: ${art.title} (${art.kind})
prompt: ${art.prompt ?? "(none given)"}
word limit: ${art.word_limit ?? "none"}

strategy brief:
${briefText}

disputed figures (never use these numbers): ${disputed.join("; ") || "none"}
${
  revising
    ? `\nprevious draft (${prev!.author}):\n${prev!.content}\n\nreview of it:\n${JSON.stringify(prev!.critique ?? {})}\n${userNotes ? `\nthe applicant's own notes, follow them:\n${userNotes}\n` : ""}${
    strict
      ? `\nFINAL PASS: delete or rewrite every sentence containing any of these unsupported claims, using only what the fact sheet says. add nothing new. it's fine if the essay gets shorter:\n${((prev!.critique as { unsupported_claims?: string[] } | null)?.unsupported_claims ?? []).map((c) => `- ${c}`).join("\n")}`
      : `\nrevise: first remove or correct EVERY unsupported claim listed in the review (each one, no exceptions), then fix high and medium issues, keep what works.`
  }`
    : "\nwrite the first draft."
}`,
      schema: Draft,
      maxTokens: 6000,
    });

    const version = (art.current_version ?? 0) + 1;
    const { data: v, error: verr } = await db
      .from("artifact_versions")
      .insert({ artifact_id: artifactId, user_id: job.user_id, version, content: output.essay.trim(), author: "agent:writer", critique: { status: "reviewing", round, claims: output.claims } })
      .select("id")
      .single();
    if (verr) throw new Error(verr.message);
    await db.from("artifacts").update({ current_version: version }).eq("id", artifactId);
    await enqueue({ userId: job.user_id, agent: "redteam", task: "review", payload: { versionId: v.id, round, ...(strict ? { strict: true } : {}) }, parentJobId: job.id });
    await logEvent({
      userId: job.user_id,
      actor: "agent:writer",
      action: revising ? "artifact.revised" : "artifact.drafted",
      applicationId: art.application_id,
      artifactVersionId: v.id as string,
      agentRunId: runId,
      context: { title: art.title, round, stories: output.stories_used, userNotes: !!userNotes },
    });
    return { version };
  },

  "redteam.review": async (job) => {
    const { versionId, round, strict } = job.payload as { versionId: string; round: number; strict?: boolean };
    const db = admin();
    const { data: v, error } = await db
      .from("artifact_versions")
      .select("id, artifact_id, content, critique, artifacts(id, application_id, title, kind, prompt, word_limit)")
      .eq("id", versionId)
      .eq("user_id", job.user_id)
      .single();
    if (error || !v) throw new Error("version not found");
    const art = v.artifacts as unknown as { id: string; application_id: string; title: string; kind: string; prompt: string | null; word_limit: number | null };
    const profile = await getProfile(job.user_id);
    const { program, school } = await loadApp(job.user_id, art.application_id);
    const disputed = await disputedTopics(job.user_id);

    const { output: r, runId } = await runStructured({
      userId: job.user_id,
      agent: "redteam",
      jobId: job.id,
      tier: "write",
      promptVersion: "review-v1",
      system: REDTEAM_SYSTEM,
      cachePrefix: `applicant fact sheet (the only source of facts; "[disputed figure]" means the applicant hasn't confirmed that number, so leave it out):\n${JSON.stringify(await safeFactSheet(job.user_id, profile))}`,
      prompt: `program: ${program.name} (${program.degree}) at ${school.name}
piece: ${art.title}
prompt: ${art.prompt ?? "(none)"}
word limit: ${art.word_limit ?? "none"}

disputed figures (using any of these is an unsupported claim): ${disputed.join("; ") || "none"}

draft:
${v.content}`,
      schema: Review,
      maxTokens: 4000,
    });

    const limit = withinLimit(v.content, art.word_limit);
    const cliches = clichesIn(v.content);
    const holes = placeholdersIn(v.content);
    let step = strict ? "ready" : nextStep({ round, verdict: holes.length ? "revise" : r.verdict, unsupportedClaims: r.unsupported_claims.length, fits: limit.ok });
    // never hand the user a draft with claims we know are unsupported: one strict cleanup pass first
    const needsStrict = !strict && step === "ready" && (r.unsupported_claims.length > 0 || holes.length > 0);
    if (needsStrict) step = "revise";
    const critique = {
      ...((v.critique as object) ?? {}),
      status: step === "ready" ? "ready" : "revising",
      round,
      verdict: r.verdict,
      score: parseFloat(r.score) || null,
      unsupported_claims: r.unsupported_claims,
      issues: [
        ...(limit.ok ? [] : [{ severity: "high", issue: limit.note, fix: "cut or expand to fit the limit" }]),
        ...(cliches.length ? [{ severity: "medium", issue: `clichés: ${cliches.join(", ")}`, fix: "replace with something specific to you" }] : []),
        ...(holes.length ? [{ severity: "high", issue: `placeholders left in: ${holes.join(", ")}`, fix: "write the real content or cut the sentence" }] : []),
        ...r.issues,
      ],
      summary: r.summary,
      words: limit.words,
      hit_round_cap: step === "ready" && (round >= MAX_ROUNDS || !!strict) && (r.verdict !== "pass" || r.unsupported_claims.length > 0),
    };
    await db.from("artifact_versions").update({ critique }).eq("id", versionId);

    if (step === "revise") {
      await enqueue({
        userId: job.user_id,
        agent: "writer",
        task: "draft",
        payload: { artifactId: art.id, round: round + 1, ...(needsStrict ? { strict: true } : {}) },
        parentJobId: job.id,
      });
    }
    await logEvent({
      userId: job.user_id,
      actor: "agent:redteam",
      action: step === "ready" ? "artifact.ready_for_user" : "artifact.sent_back",
      applicationId: art.application_id,
      artifactVersionId: versionId,
      agentRunId: runId,
      reasoning: r.summary,
      context: { title: art.title, round, score: r.score, unsupported: r.unsupported_claims.length },
    });
    return { step, score: r.score };
  },
};
