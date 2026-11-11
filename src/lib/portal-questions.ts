import "server-only";
import { admin } from "@/lib/supabase/admin";
import { getProfile, updateProfile } from "@/lib/profile-store";
import { answerFor } from "@/lib/runner-map";
import type { FillSheet } from "@/lib/fillsheet";
import { confirmFact } from "@/lib/profile";
import { PORTAL_DETAIL_FIELDS, detailFor } from "@/lib/portal-fields";
import { logEvent } from "@/lib/events";
import { notify, resolve } from "@/lib/notify";
import type { PortalQuestion } from "@/lib/cloud-engine";
import { profileBrief } from "@/lib/profile";
import { detailsBrief, type PortalDetails } from "@/lib/portal-fields";
import { runStructured } from "@/lib/llm";
import { acceptInferred, answerable, Inferred, INFER_SYSTEM, inferPrompt } from "@/lib/profile-answers";

export { notForApplicant } from "@/lib/question-filter";
import { notForApplicant } from "@/lib/question-filter";

// questions a portal asked that the profile can't answer. the interviewer pops up and asks them; answers are
// kept in the profile, so no school asks twice.

export const qkeyOf = (q: string) =>
  q
    .toLowerCase()
    .replace(/\(\s*(required|optional)\s*\)/g, "")
    .replace(/\s+(required|optional)\s*\**\s*$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 160);

const DETAIL_KEYS = new Set(PORTAL_DETAIL_FIELDS.map((f) => f.key as string));
const detailKey = (k?: string) => (!k ? null : k.startsWith("dob_") ? "date_of_birth" : DETAIL_KEYS.has(k) ? k : null);

export type OpenQuestion = { id: string; question: string; options: string[]; field_type: string | null; sheet_key: string | null; school: string | null; application_id: string | null };

const nrm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// the option on this form that says the same as an earlier answer ("English" -> "English (Anglais)")
export function matchOption(value: string, options: string[]): string | null {
  const v = nrm(value);
  if (!v) return null;
  const opts = options.filter((o) => o && !/^(select|choose|please|--)/i.test(o.trim()));
  return opts.find((o) => nrm(o) === v) ?? opts.find((o) => nrm(o).length >= 3 && v.length >= 3 && (nrm(o).startsWith(v) || v.startsWith(nrm(o)) || nrm(o).split(" ").includes(v))) ?? null;
}

// called when an agent stops on a form: one open question per distinct question, whichever school asked first.
// before asking, the applicant's earlier answers are tried: the same question asked by another school (or reworded)
// is answered from the profile in the form's own wording, and a question they said doesn't apply isn't asked again.
export async function recordQuestions(userId: string, applicationId: string, questions: PortalQuestion[] | undefined) {
  if (!questions?.length) return 0;
  const db = admin();
  const { data: past, error } = await db.from("portal_questions").select("qkey, question, status, answer").eq("user_id", userId).limit(2000);
  if (error) return 0; // table not there yet
  const have = new Set((past ?? []).filter((x) => x.status === "open").map((x) => x.qkey));
  const triedBefore = new Set((past ?? []).filter((x) => x.status === "answered").map((x) => x.qkey));
  const notApplicable = (past ?? []).filter((x) => x.status === "dismissed").map((x) => ({ key: `na:${x.qkey}`, question: x.question as string }));
  const profile = await getProfile(userId);
  const facts = profile.confirmed_facts;
  const asSheet = (answers: { key: string; question: string }[]) => ({ answers }) as unknown as FillSheet;
  const factSheet = asSheet(facts.map((f, i) => ({ key: `answer:${i}`, question: f.topic })));

  const rows: Record<string, unknown>[] = [];
  const reused: { question: string; value: string }[] = [];
  for (const q of questions) {
    if (notForApplicant(q.label, q.type)) continue;
    const qkey = qkeyOf(q.label);
    if (!qkey || have.has(qkey)) continue;
    have.add(qkey);
    const base = { user_id: userId, application_id: applicationId, qkey, question: q.label, field_type: q.type, options: q.options ?? [], sheet_key: q.key ?? null };
    // already filled from this exact answer and the form still asked: the applicant has to look at it
    if (!triedBefore.has(qkey)) {
      const k = answerFor(q.label, factSheet, q.options ?? []);
      const prior = k ? facts[Number(k.split(":")[1])]?.value : null;
      const value = prior ? (q.options?.length ? matchOption(prior, q.options) : prior) : null;
      if (value) {
        rows.push({ ...base, status: "answered", answer: value, answered_at: new Date().toISOString() });
        reused.push({ question: q.label, value });
        continue;
      }
      if (answerFor(q.label, asSheet(notApplicable), q.options ?? [])) {
        rows.push({ ...base, status: "dismissed", answered_at: new Date().toISOString() });
        continue;
      }
    }
    rows.push(base);
  }
  if (!rows.length) return 0;
  // what's left would go to the applicant. first: does their profile already answer it? (a question the fill
  // sheet couldn't match to one stored value, but that follows from what they told us.) answered ones are saved
  // as facts with the line they rest on, and the run carries on without asking
  const toAsk = rows.filter((r) => !r.status && !triedBefore.has(r.qkey as string) && answerable(r.question as string, r.field_type as string | null));
  if (toAsk.length) {
    const found = await fromProfile(userId, applicationId, profile, toAsk.map((r) => ({ label: r.question as string, type: r.field_type as string | null, options: r.options as string[] }))).catch(() => new Map<number, { value: string; basis: string }>());
    for (const [i, a] of found) {
      Object.assign(toAsk[i], { status: "answered", answer: a.value, answered_at: new Date().toISOString() });
      reused.push({ question: toAsk[i].question as string, value: a.value });
    }
    if (found.size) await logEvent({ userId, actor: "agent:runner", action: "runner.answers_from_profile", applicationId, context: { count: found.size, answers: [...found].map(([i, a]) => ({ question: (toAsk[i].question as string).slice(0, 120), answer: a.value.slice(0, 120), basis: a.basis.slice(0, 160) })) } });
  }
  // one open copy per question (unique index): a run that recorded the same question a moment ago fails the whole
  // batch, so the rest go in one by one and only the duplicate is dropped
  const { error: batch } = await db.from("portal_questions").insert(rows);
  if (batch) for (const r of rows) await db.from("portal_questions").insert(r);
  // earlier answers, saved under this form's wording so the next run fills them exactly (this restarts the run)
  if (reused.length) {
    await updateProfile(userId, (p) => reused.reduce((acc, r) => confirmFact(acc, r.question, r.value), p));
    await logEvent({ userId, actor: "agent:runner", action: "runner.answers_reused", applicationId, context: { count: reused.length } });
  }
  const asked = rows.filter((r) => !r.status).length;
  if (!asked) return 0;
  await logEvent({ userId, actor: "agent:runner", action: "runner.questions", applicationId, context: { count: asked } });
  // one notice for all of them, pointing at the card where they can be answered with a tap
  const { count } = await db.from("portal_questions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "open");
  const n = count ?? asked;
  await notify({ userId, key: "portal-questions", kind: "setup", urgent: true, title: `Your schools are asking ${n} question${n === 1 ? "" : "s"}`, body: "An application form is paused until they're answered. Most take one tap.", href: "/dashboard#questions", actionLabel: "Answer them" }).catch(() => {});
  return asked;
}

// one small model call for all of a page's unanswered questions. no key, no credit or any failure: nothing is
// answered and the questions go to the applicant as before
async function fromProfile(userId: string, applicationId: string, profile: Awaited<ReturnType<typeof getProfile>>, questions: { label: string; type?: string | null; options?: string[] }[]) {
  const db = admin();
  const [{ data: prof }, { data: app }] = await Promise.all([
    db.from("profiles").select("portal_details").eq("id", userId).maybeSingle(),
    db.from("applications").select("programs(name, degree, schools(name, country))").eq("id", applicationId).maybeSingle(),
  ]);
  const p = app?.programs as unknown as { name: string; degree: string | null; schools: { name: string; country: string | null } } | null;
  const brief = profileBrief(profile);
  const details = detailsBrief((prof?.portal_details ?? {}) as PortalDetails, "all");
  const school = p ? `${p.name}${p.degree ? ` (${p.degree})` : ""} at ${p.schools.name}${p.schools.country ? `, ${p.schools.country}` : ""}` : "a university";
  const { output } = await runStructured({ userId, agent: "runner", tier: "cheap", promptVersion: "profile-answers-v1", system: INFER_SYSTEM, prompt: inferPrompt(brief, details, school, questions), schema: Inferred, maxTokens: 1500, lessons: false });
  return acceptInferred(output, questions, `${brief}\n${details}\n${school}`);
}

export async function openQuestions(userId: string): Promise<OpenQuestion[]> {
  const { data, error } = await admin()
    .from("portal_questions")
    .select("id, question, options, field_type, sheet_key, application_id, applications(programs(schools(name)))")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("created_at")
    .limit(20);
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    question: r.question,
    options: (r.options as string[]) ?? [],
    field_type: r.field_type,
    sheet_key: r.sheet_key,
    application_id: r.application_id,
    school: (r.applications as unknown as { programs: { schools: { name: string } } } | null)?.programs?.schools?.name ?? null,
  }));
}

// the applicant answered (or said it doesn't apply). the answer becomes part of the profile: a confirmed fact
// keyed by the question, plus the matching form detail when there is one. saving it resumes stopped submissions.
export async function answerQuestion(userId: string, id: string, answer: string | null) {
  const db = admin();
  const { data: q } = await db.from("portal_questions").select("id, question, sheet_key, status, application_id").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!q || q.status !== "open") return false;
  const value = (answer ?? "").trim().slice(0, 2000);
  await db.from("portal_questions").update({ status: value ? "answered" : "dismissed", answer: value || null, answered_at: new Date().toISOString() }).eq("id", id);
  if (!value) {
    await clearNoticeIfDone(userId);
    await carryOnIfAnswered(userId, q.application_id as string | null);
    return true;
  }
  // the matching profile detail, when there is one (by the form's key, or by what the question asks)
  const dk = detailKey(q.sheet_key ?? undefined) ?? detailFor(q.question);
  if (dk) {
    const { data: prof } = await db.from("profiles").select("portal_details").eq("id", userId).single();
    await db.from("profiles").update({ portal_details: { ...((prof?.portal_details as Record<string, unknown>) ?? {}), [dk]: value } }).eq("id", userId);
  }
  // also resumes any submission that stopped for a question
  await updateProfile(userId, (p) => confirmFact(p, q.question, value));
  await logEvent({ userId, actor: "user", action: "profile.portal_answer", context: { question: q.question.slice(0, 120), detail: dk } });
  await clearNoticeIfDone(userId);
  await carryOnIfAnswered(userId, q.application_id as string | null);
  return true;
}

// the last question an application was waiting on is answered: it carries on by itself, from where it stopped
async function carryOnIfAnswered(userId: string, applicationId: string | null) {
  if (!applicationId) return;
  const db = admin();
  const { count } = await db.from("portal_questions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("application_id", applicationId).eq("status", "open");
  if (count) return;
  const { data: app } = await db.from("applications").select("status, runner_status").eq("id", applicationId).maybeSingle();
  if (app?.status !== "packet_approved" || !["needs_you", "failed"].includes(app.runner_status as string)) return;
  const { queueRunner } = await import("@/agents/runner");
  await queueRunner(userId, applicationId, { note: "got your answers: carrying on where it stopped" });
  await logEvent({ userId, actor: "system", action: "runner.resumed", applicationId, context: { after: "answers" } });
}

async function clearNoticeIfDone(userId: string) {
  const { count } = await admin().from("portal_questions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "open");
  if (!count) await resolve(userId, "portal-questions").catch(() => {});
}
