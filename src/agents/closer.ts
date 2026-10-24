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

// the closer: money. fee waivers before applying; aid after admission.
// it drafts; the applicant reads, edits and sends from their own email. nothing goes out on its own.
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
    .select("id, status, decision, aid_offered, programs(id, name, degree, url, app_fee_usd, fee_waiver, funding_signals, schools(id, name, country))")
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
    const { error } = await db.from("messages").insert({
      user_id: userId,
      thread_id: t.id,
      direction: "out",
      subject: m.subject,
      body: m.body,
      to_email: m.to_email || null,
      purpose: m.purpose,
      status: "draft",
    });
    if (error) throw new Error(error.message);
    saved++;
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

export const closer: Record<string, Handler> = {
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
applicant citizenship: ${profile.identity.citizenship ?? "unknown"}; level: ${LEVEL_LABEL[levelOf(profile)]}

find: whether application fee waivers exist and who qualifies (e.g. by country, income, event attendance, early application, alumni, partner programs), how to request one, and the official admissions contact email.`,
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

draft at most one fee-waiver request (purpose fee_waiver) if the research shows a waiver route the applicant plausibly fits, or a polite general request if waivers are granted case by case. if the school says it does not waive fees, draft nothing and say so in notes. levers: the waiver routes found.`,
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
