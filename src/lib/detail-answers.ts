import "server-only";
import { admin } from "@/lib/supabase/admin";
import { NEVER_FILL } from "@/lib/never-fill";
import { CHAPTERS, chapterStates, detailAsk, fieldFor, nextQuestions, type Level } from "@/lib/profile-chapters";
import type { PortalDetails } from "@/lib/portal-fields";
import { loadProfile } from "@/lib/profile";
import { resumeAfterProfileChange } from "@/lib/requeue";

// one answer to a profile-chapter question, from the card deck or from Ivyward AI. null = skip (never asked again).
// returns false when the key isn't a question or the value isn't acceptable.
export async function saveDetail(userId: string, key: string, raw: string | null): Promise<{ ok: boolean; error?: string }> {
  const f = fieldFor(key);
  if (!f) return { ok: false, error: "unknown question" };
  const db = admin();
  const { data: row } = await db.from("profiles").select("portal_details").eq("id", userId).single();
  const cur = { ...((row?.portal_details as Record<string, unknown>) ?? {}) };
  const skipped = new Set(Array.isArray(cur._skipped) ? (cur._skipped as string[]) : []);
  let value = raw?.trim() ?? "";
  if (value) {
    const max = f.kind === "long" ? 2000 : 300;
    value = value.slice(0, max);
    // never id numbers (passport, national id, bank): those stay with the applicant
    if (/\b\d{6,}\b/.test(value) && NEVER_FILL.test(f.label)) return { ok: false, error: "id numbers aren't stored" };
    if (/\b[A-Z]?\d{8,}\b/.test(value) && /passport|national id|nin\b|bvn|ssn|social security/i.test(value)) return { ok: false, error: "id numbers aren't stored" };
    if (f.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "a date, please" };
      value = d.toISOString().slice(0, 10);
    }
    // a choice must be one of its options (matched loosely: "yes" -> "Yes")
    if ((f.kind === "select" || f.kind === "yes_no") && f.options?.length) {
      const hit = f.options.find((o) => o.toLowerCase() === value.toLowerCase()) ?? f.options.find((o) => o.toLowerCase().startsWith(value.toLowerCase()));
      if (!hit) return { ok: false, error: `one of: ${f.options.join(", ")}` };
      value = hit;
    }
    cur[key] = value;
    skipped.delete(key);
  } else {
    skipped.add(key);
  }
  cur._skipped = [...skipped];
  const { error } = await db.from("profiles").update({ portal_details: cur }).eq("id", userId);
  if (error) return { ok: false, error: "couldn't save" };
  return { ok: true };
}

export async function detailsAndLevel(userId: string): Promise<{ details: PortalDetails; level: Level | null }> {
  const { data } = await admin().from("profiles").select("portal_details, profile").eq("id", userId).single();
  return { details: (data?.portal_details as PortalDetails) ?? {}, level: (loadProfile(data?.profile).goals.study_level as Level | null) ?? null };
}

// what to say and ask after an answer: the next question in the same chapter, a short "done" when a chapter
// finishes, then the next chapter's first question
export async function afterDetailAnswer(userId: string, key: string): Promise<{ reply: string; next: ReturnType<typeof detailAsk> | null; chapterDone: string | null }> {
  const { details, level } = await detailsAndLevel(userId);
  const chapter = CHAPTERS.find((c) => c.keys.includes(key)) ?? null;
  const here = nextQuestions(details, level, 1, chapter?.id);
  if (chapter && here.chapter?.chapter.id === chapter.id && here.questions[0]) {
    const st = here.chapter;
    return { reply: `${here.questions[0].ask ?? here.questions[0].label}${st.total > 3 ? ` (${st.done + 1} of ${st.total})` : ""}`, next: detailAsk(here.questions[0]), chapterDone: null };
  }
  // the chapter is done: let the agents that were waiting on these details carry on
  void resumeAfterProfileChange(userId, "profile chapter").catch(() => 0);
  const after = nextQuestions(details, level, 1);
  const done = chapter ? `That's "${chapter.title}" done.` : "Saved.";
  if (!after.chapter || !after.questions[0]) return { reply: `${done} Your application profile is complete: the agents can fill any form without asking you.`, next: null, chapterDone: chapter?.id ?? null };
  const left = chapterStates(details, level).filter((s) => s.next.length).length;
  return {
    reply: `${done} ${left} short chapter${left === 1 ? "" : "s"} to go. Next, "${after.chapter.chapter.title}": ${after.chapter.chapter.blurb} ${after.questions[0].ask ?? after.questions[0].label}`,
    next: detailAsk(after.questions[0]),
    chapterDone: chapter?.id ?? null,
  };
}
