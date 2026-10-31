import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { research } from "@/lib/research";
import { getProfile } from "@/lib/profile-store";
import { LEVEL_LABEL, levelOf } from "@/lib/profile";
import { logEvent } from "@/lib/events";
import { safeFactSheet } from "./writer";
import { schedule } from "@/lib/outbox";
import { schoolBrief } from "@/lib/school-memory";

// the closer: money. fee waivers before applying; aid after admission.
// it drafts, then hands each email to the outbox: with gmail connected and the dial on "auto with undo"
// it sends after the undo window; otherwise it waits in the applicant's queue for one tap.
// honesty rules: only official contact addresses; only real competing offers (from the applicant's own recorded decisions);
// never imply need, hardship or circumstances the profile doesn't state.

const today = () => new Date().toISOString().slice(0, 10);

export const Outreach = z.object({
  contacts: z.array(z.object({ name: z.string(), role: z.string(), email: z.string(), source_url: z.string() })),
  levers: z.array(
    z.object({
      lever: z.string(),
      how: z.string(),
      deadline: z.string(),
      worth_trying: z.enum(["yes", "maybe", "no"]),
    }),
  ),
  messages: z.array(
    z.object({
      purpose: z.enum(["fee_waiver", "aid_reconsideration", "assistantship_inquiry", "scholarship_inquiry", "supervisor_intro", "other"]),
      to_email: z.string(),
      to_name: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  ),
  notes: z.string(),
});

const RESEARCH_SYSTEM = `you are the closer on a university application platform (bachelor's, master's, PhD; any country).
you find the official, published way to get money from one program: fee waivers before applying, and after admission: merit-aid reconsideration or appeal processes, assistantships/fellowships posted to admitted students, departmental awards, and who handles each.
use official university pages only. report contact emails exactly as published, with the page they're on. if no email is published, say so; never guess an address.`;

const DRAFT_SYSTEM = `you are the closer on a university application platform. you draft short, professional emails the applicant will send from their own email.
rules:
- only official contact addresses from the research. if none was found, leave to_email "" and say in notes how to reach them (portal, form).
- facts about the applicant come only from their fact sheet. never invent achievements, hardship or circumstances.
- competing offers: only mention ones listed as real offers, with the exact amounts given. never bluff.
- tone: polite, specific, brief (under 180 words), one clear ask, no flattery, no begging. sign with the applicant's name.
- a reconsideration request gives a concrete reason (a real competing offer, new achievements since applying, or a documented change) and a concrete ask.
- skip a message entirely if there's no honest basis for it; explain in notes.`;

async function appContext(userId: string, applicationId: string) {
  const db = admin();
  const { data, error } = await db
    .from("applications")
    .select("id, status, decision, aid_offered, target_deadline, programs(id, name, degree, url, app_fee_usd, fee_waiver, funding_signals, schools(id, name, country))")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("application not found");
  const p = data.programs as unknown as {
    id: string; name: string; degree: string; url: string | null; app_fee_usd: number | null; fee_waiver: string | null;
    funding_signals: Record<string, unknown>; schools: { id: string; name: string; country: string | null };
  };
  return { app: data, program: p, school: p.schools };
}

// offers the applicant actually holds, for honest leverage
async function realOffers(userId: string, exceptId: string) {
  const { data } = await admin()
    .from("applications")
    .select("id, aid_offered, programs(name, schools(name))")
    .eq("user_id", userId)
    .eq("status", "admitted")
    .neq("id", exceptId);
  return (data ?? []).map((a) => {
    const p = a.programs as unknown as { name: string; schools: { name: string } };
    const aid = (a.aid_offered ?? {}) as { amount_usd?: number; note?: string };
    return `${p.schools.name} (${p.name}): admitted, aid ${aid.amount_usd ? `$${aid.amount_usd}` : "none stated"}${aid.note ? ` (${aid.note})` : ""}`;
  });
}

async function saveDrafts(userId: string, applicationId: string, out: z.infer<typeof Outreach>, runId: string, kind: "fee" | "funding") {
  const db = admin();
  let saved = 0;
  for (const m of out.messages) {
    const { data: t, error: terr } = await db
      .from("threads")
      .insert({ user_id: userId, application_id: applicationId, subject: m.subject, status: "draft" })
      .select("id")
      .single();
    if (terr) throw new Error(terr.message);
    const { data: msg, error } = await db.from("messages").insert({
      user_id: userId,
      thread_id: t.id,
      direction: "out",
      subject: m.subject,
      body: m.body,
      to_email: m.to_email || null,
      purpose: m.purpose,
      status: "draft",
    }).select("id").single();
    if (error) throw new Error(error.message);
    saved++;
    // the dial decides whether this goes out on its own (with an undo window) or waits for the applicant
    if (m.to_email) await schedule(userId, msg.id as string, "agent").catch(() => null);
  }

  // the plan lives as an artifact so the applicant can read it on the application page
  const list = (h: string, xs: string[]) => (xs.length ? `## ${h}\n${xs.map((x) => `- ${x}`).join("\n")}\n` : "");
  const md = [
    list("levers", out.levers.map((l) => `${l.lever} (${l.worth_trying}): ${l.how}${l.deadline ? ` · by ${l.deadline}` : ""}`)),
    list("contacts", out.contacts.map((c) => `${c.name || c.role}: ${c.email || "no email published"}${c.source_url ? ` (${c.source_url})` : ""}`)),
    out.notes ? `## notes\n${out.notes}\n` : "",
  ].join("\n");
  const title = kind === "fee" ? "fee waiver plan" : "funding plan";
  const { data: existing } = await db.from("artifacts").select("id, current_version").eq("application_id", applicationId).eq("kind", kind === "fee" ? "fee_plan" : "funding_plan").maybeSingle();
  let artId = existing?.id as string | undefined;
  const version = (existing?.current_version ?? 0) + 1;
  if (!artId) {
    const { data, error } = await db
      .from("artifacts")
      .insert({ user_id: userId, application_id: applicationId, kind: kind === "fee" ? "fee_plan" : "funding_plan", title, current_version: 0 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    artId = data.id as string;
  }
  await db.from("artifact_versions").insert({ artifact_id: artId, user_id: userId, version, content: md, author: "agent:closer" });
  await db.from("artifacts").update({ current_version: version }).eq("id", artId);

  await logEvent({
    userId,
    actor: "agent:closer",
    action: kind === "fee" ? "fee_waiver.drafted" : "funding.plan_drafted",
    applicationId,
    agentRunId: runId,
    context: { drafts: saved, levers: out.levers.length, contacts: out.contacts.length },
  });
  return saved;
}

const RefOut = z.object({ subject: z.string(), body: z.string() });

export const closer: Record<string, Handler> = {
  // ask the applicant's recommenders for a reference, early, with what it's for and when it's due
  "closer.reference_requests": async (job) => {
    const { applicationId, count = 2 } = job.payload as { applicationId: string; count?: number };
    const db = admin();
    const { app, program, school } = await appContext(job.user_id, applicationId);
    const { data: recs } = await db.from("recommenders").select("name, email, title, organization, relationship").eq("user_id", job.user_id).order("created_at");
    const usable = (recs ?? []).filter((r) => r.email);
    if (!usable.length) {
      await logEvent({ userId: job.user_id, actor: "agent:closer", action: "references.missing", applicationId, context: { needed: count } });
      return { skipped: "no recommenders with an email on file" };
    }
    // don't ask the same person twice for the same application
    const { data: already } = await db.from("messages").select("to_email, threads!inner(application_id)").eq("user_id", job.user_id).eq("purpose", "reference_request").eq("threads.application_id", applicationId);
    const asked = new Set((already ?? []).map((m) => String(m.to_email).toLowerCase()));
    const profile = await getProfile(job.user_id);
    const award = program.degree === "Scholarship";
    const due = (app as { target_deadline?: string | null }).target_deadline ?? null;
    let saved = 0;
    for (const r of usable.filter((x) => !asked.has(String(x.email).toLowerCase())).slice(0, count)) {
      const { output, runId } = await runStructured({
        userId: job.user_id,
        agent: "closer",
        jobId: job.id,
        tier: "cheap",
        promptVersion: "reference-request-v1",
        system: `draft a short, warm email from the applicant to someone who knows their work, asking for a reference. under 150 words. say what it's for, the deadline, that the system or the applicant will send the link or form, and offer a short summary of what to highlight. no flattery, no pressure, easy to say no. sign with the applicant's name. facts about the applicant only from the fact sheet.`,
        prompt: `applicant: ${profile.identity.full_name ?? "the applicant"}
referee: ${r.name}${r.title ? `, ${r.title}` : ""}${r.organization ? ` at ${r.organization}` : ""}${r.relationship ? ` (${r.relationship})` : ""}
for: ${award ? `the ${program.name} scholarship from ${school.name}` : `${program.name} at ${school.name}`}
deadline: ${due ?? "not confirmed yet"}
fact sheet: ${JSON.stringify(await safeFactSheet(job.user_id, profile)).slice(0, 6000)}`,
        schema: RefOut,
        maxTokens: 800,
      });
      const { data: t, error: terr } = await db.from("threads").insert({ user_id: job.user_id, application_id: applicationId, subject: output.subject, status: "draft" }).select("id").single();
      if (terr) throw new Error(terr.message);
      const { data: msg, error } = await db
        .from("messages")
        .insert({ user_id: job.user_id, thread_id: t.id, direction: "out", subject: output.subject, body: output.body, to_email: r.email, purpose: "reference_request", status: "draft" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      // the dial decides: sent after an undo window, or waiting in Messages for one tap
      await schedule(job.user_id, msg.id as string, "agent").catch(() => null);
      await logEvent({ userId: job.user_id, actor: "agent:closer", action: "references.requested", applicationId, agentRunId: runId, context: { referee: r.name } });
      saved++;
    }
    return { drafted: saved };
  },

  // after a program application goes in: find the school's separate scholarship forms and start them
  "closer.school_scholarships": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const db = admin();
    const { program, school } = await appContext(job.user_id, applicationId);
    if (program.degree === "Scholarship") return { skipped: "already a scholarship" };
    const found = await research({
      userId: job.user_id,
      agent: "closer",
      jobId: job.id,
      system: "you find scholarships, fellowships and awards at one university that need a SEPARATE application from the program application itself (their own form, essay or portal, often with an earlier or later deadline). official university pages only. ignore awards that are automatic with the program application.",
      prompt: `${program.name} at ${school.name}. list each award that needs its own application: name, amount, deadline, who's eligible (international students?), and the url of its application page.${await (async () => {
        const { data: known } = await db.from("funding_opportunities").select("name, deadline, url").eq("school_id", school.id).limit(15);
        return known?.length ? `\nalready known from earlier Ivyward research (check they're still open and look for any others): ${known.map((k) => `${k.name}${k.deadline ? ` (deadline ${k.deadline})` : ""}${k.url ? ` ${k.url}` : ""}`).join("; ")}` : "";
      })()}`,
      maxSearches: 3,
      maxFetches: 3,
    });
    const { output } = await runStructured({
      userId: job.user_id,
      agent: "closer",
      jobId: job.id,
      tier: "cheap",
      promptVersion: "school-scholarships-v1",
      system: "extract awards that need a separate application, only ones the notes name. deadline as YYYY-MM-DD or \"\". url exactly as given or \"\".",
      prompt: found.text,
      schema: z.object({ awards: z.array(z.object({ name: z.string(), amount: z.string(), deadline: z.string(), intl_eligible: z.enum(["yes", "no", "unknown"]), url: z.string() })) }),
      maxTokens: 3000,
    });
    const { startScholarship } = await import("@/lib/scholarships");
    const today = new Date().toISOString().slice(0, 10);
    let started = 0;
    for (const a of output.awards.slice(0, 5)) {
      const deadline = /^\d{4}-\d{2}-\d{2}$/.test(a.deadline) ? a.deadline : null;
      if (a.intl_eligible === "no" || (deadline && deadline < today)) continue;
      const { data: have } = await db.from("funding_opportunities").select("id").eq("school_id", school.id).eq("name", a.name).maybeSingle();
      let oppId = have?.id as string | undefined;
      const fields = { school_id: school.id, program_id: program.id, name: a.name, kind: "merit_scholarship", amount_note: a.amount || null, deadline, intl_eligible: a.intl_eligible === "unknown" ? null : true, url: a.url || null, verified_at: new Date().toISOString() };
      if (oppId) await db.from("funding_opportunities").update(fields).eq("id", oppId);
      else {
        const { data: ins, error } = await db.from("funding_opportunities").insert(fields).select("id").single();
        if (error) continue;
        oppId = ins.id as string;
      }
      const { data: uf } = await db
        .from("user_funding")
        .upsert({ user_id: job.user_id, opportunity_id: oppId, fit: "strong", why: `Separate scholarship form for ${school.name} applicants` }, { onConflict: "user_id,opportunity_id" })
        .select("id")
        .single();
      if (!uf) continue;
      const r = await startScholarship(job.user_id, uf.id as string, "agent");
      if ("applicationId" in r && r.created) started++;
    }
    await logEvent({ userId: job.user_id, actor: "agent:closer", action: "scholarships.school_checked", applicationId, context: { found: output.awards.length, started } });
    return { found: output.awards.length, started };
  },

  "closer.fee_waiver": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const profile = await getProfile(job.user_id);
    const { program, school } = await appContext(job.user_id, applicationId);
    if (program.app_fee_usd === 0) return { skipped: "no application fee" };

    const found = await research({
      userId: job.user_id,
      agent: "closer",
      jobId: job.id,
      system: RESEARCH_SYSTEM,
      prompt: `program: ${program.name} (${program.degree}) at ${school.name}${school.country ? `, ${school.country}` : ""}
official page: ${program.url ?? "(find it)"}
what recon already found about the fee and waivers: fee ${program.app_fee_usd ?? "unknown"} USD; ${program.fee_waiver ?? "no waiver info"}
${await schoolBrief(school.id).catch(() => "")}
applicant citizenship: ${profile.identity.citizenship ?? "unknown"}; level: ${LEVEL_LABEL[levelOf(profile)]}

find: whether application fee waivers exist and who qualifies, by EVERY route, not just nationality: country or region, income or financial hardship, attending a webinar, info session, fair or campus visit, applying early, alumni or partner-organisation links, employer sponsorship, military service, academic merit (grades, test scores, honours), first-generation status, athletes and artists, service programmes (peace corps, teach for, americorps, ngos), mcnair/fulbright/other scholar networks, competitions, and case-by-case requests. say how to request one (a form, a code, an email) and the official admissions contact email.`,
      maxSearches: 2,
      maxFetches: 2,
    });

    const { output, runId } = await runStructured({
      userId: job.user_id,
      agent: "closer",
      jobId: job.id,
      promptVersion: "fee-v1",
      system: DRAFT_SYSTEM,
      cachePrefix: `applicant fact sheet ("[disputed figure]" = unconfirmed, never use):\n${JSON.stringify(await safeFactSheet(job.user_id, profile))}`,
      prompt: `program: ${program.name} at ${school.name}
today: ${today()}
research on fees and contacts:
${found.text}
${await schoolBrief(school.id).catch(() => "")}
when earlier applicants' experience shows a contact that answers or a waiver route that worked, prefer it; never use an address marked as bounced.

draft at most one fee-waiver request (purpose fee_waiver) if the research shows a waiver route the applicant plausibly fits, or a polite general request if waivers are granted case by case. if the school says it does not waive fees, draft nothing and say so in notes. levers: the waiver routes found, matched against everything in the profile that could qualify them (achievements, career milestones, grades, sport, arts, service, family background they've shared, financial situation they've stated, events they attended), not only their nationality. only claim what the profile states.`,
      schema: Outreach,
      maxTokens: 3000,
    });
    const drafts = await saveDrafts(job.user_id, applicationId, output, runId, "fee");
    return { drafts };
  },

  "closer.funding_plan": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const profile = await getProfile(job.user_id);
    const { app, program, school } = await appContext(job.user_id, applicationId);
    const offers = await realOffers(job.user_id, applicationId);
    const aid = (app.aid_offered ?? {}) as { amount_usd?: number; note?: string; accept_by?: string | null };

    const found = await research({
      userId: job.user_id,
      agent: "closer",
      jobId: job.id,
      system: RESEARCH_SYSTEM,
      prompt: `the applicant was ADMITTED to ${program.name} (${program.degree}) at ${school.name}${school.country ? `, ${school.country}` : ""}.
official page: ${program.url ?? "(find it)"}
aid offered: ${aid.amount_usd ? `$${aid.amount_usd}` : "none stated"}${aid.note ? ` (${aid.note})` : ""}; accept by ${aid.accept_by ?? "unknown"}
what recon found earlier: ${JSON.stringify(program.funding_signals ?? {}).slice(0, 1500)}
level: ${LEVEL_LABEL[levelOf(profile)]}; citizenship: ${profile.identity.citizenship ?? "unknown"}

find every legitimate route to more money for an admitted international student: merit reconsideration or appeal process, assistantships or student jobs posted to admitted students (and the portal), departmental or college awards, fellowships with spring deadlines, and the right contacts (financial aid office, graduate coordinator, department) with official emails.`,
      maxSearches: 3,
      maxFetches: 3,
    });

    const { output, runId } = await runStructured({
      userId: job.user_id,
      agent: "closer",
      jobId: job.id,
      promptVersion: "funding-v1",
      system: DRAFT_SYSTEM,
      cachePrefix: `applicant fact sheet ("[disputed figure]" = unconfirmed, never use):\n${JSON.stringify(await safeFactSheet(job.user_id, profile))}`,
      prompt: `admitted to: ${program.name} at ${school.name}
${await schoolBrief(school.id).catch(() => "")}
aid offered here: ${aid.amount_usd ? `$${aid.amount_usd}` : "none stated"}${aid.note ? ` (${aid.note})` : ""}
real competing offers the applicant holds (the ONLY ones you may mention): ${offers.length ? offers.join("; ") : "none"}
applicant's funding need: ${profile.funding.need ?? "unknown"}${profile.funding.notes ? ` (${profile.funding.notes})` : ""}
today: ${today()}

research on this school's funding routes and contacts:
${found.text}

draft up to 3 messages, most promising first (aid reconsideration, assistantship inquiry, scholarship inquiry...), only where there's an honest basis and an official contact or channel. rate every lever.`,
      schema: Outreach,
      maxTokens: 5000,
    });
    const drafts = await saveDrafts(job.user_id, applicationId, output, runId, "funding");
    return { drafts };
  },
};
