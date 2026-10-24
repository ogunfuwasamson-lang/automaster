import "server-only";
import { admin } from "@/lib/supabase/admin";
import { updateProfile } from "@/lib/profile-store";
import { confirmFact } from "@/lib/profile";
import { PORTAL_DETAIL_FIELDS } from "@/lib/portal-fields";
import { logEvent } from "@/lib/events";
import type { PortalQuestion } from "@/lib/cloud-engine";

// questions a portal asked that the profile can't answer. the interviewer pops up and asks them; answers are
// kept in the profile, so no school asks twice.

export const qkeyOf = (q: string) =>
  q
    .toLowerCase()
    .replace(/\(?(required|optional)\)?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 160);

const DETAIL_KEYS = new Set(PORTAL_DETAIL_FIELDS.map((f) => f.key as string));
const detailKey = (k?: string) => (!k ? null : k.startsWith("dob_") ? "date_of_birth" : DETAIL_KEYS.has(k) ? k : null);

export type OpenQuestion = { id: string; question: string; options: string[]; field_type: string | null; sheet_key: string | null; school: string | null; application_id: string | null };

// called when an agent stops on a form: one open question per distinct question, whichever school asked first
export async function recordQuestions(userId: string, applicationId: string, questions: PortalQuestion[] | undefined) {
  if (!questions?.length) return 0;
  const db = admin();
  const { data: open, error } = await db.from("portal_questions").select("qkey").eq("user_id", userId).eq("status", "open");
  if (error) return 0; // table not there yet
  const have = new Set((open ?? []).map((x) => x.qkey));
  const rows = [];
  for (const q of questions) {
    const qkey = qkeyOf(q.label);
    if (!qkey || have.has(qkey)) continue;
    have.add(qkey);
    rows.push({ user_id: userId, application_id: applicationId, qkey, question: q.label, field_type: q.type, options: q.options ?? [], sheet_key: q.key ?? null });
  }
  if (!rows.length) return 0;
  await db.from("portal_questions").insert(rows);
  await logEvent({ userId, actor: "agent:runner", action: "runner.questions", applicationId, context: { count: rows.length } });
  return rows.length;
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
  const { data: q } = await db.from("portal_questions").select("id, question, sheet_key, status").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!q || q.status !== "open") return false;
  const value = (answer ?? "").trim().slice(0, 2000);
  await db.from("portal_questions").update({ status: value ? "answered" : "dismissed", answer: value || null, answered_at: new Date().toISOString() }).eq("id", id);
  if (!value) return true;
  const dk = detailKey(q.sheet_key ?? undefined);
  if (dk) {
    const { data: prof } = await db.from("profiles").select("portal_details").eq("id", userId).single();
    await db.from("profiles").update({ portal_details: { ...((prof?.portal_details as Record<string, unknown>) ?? {}), [dk]: value } }).eq("id", userId);
  }
  // also resumes any submission that stopped for a question
  await updateProfile(userId, (p) => confirmFact(p, q.question, value));
  await logEvent({ userId, actor: "user", action: "profile.portal_answer", context: { question: q.question.slice(0, 120), detail: dk } });
  return true;
}
