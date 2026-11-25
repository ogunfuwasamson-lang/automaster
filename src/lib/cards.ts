import "server-only";
import { admin } from "@/lib/supabase/admin";
import { getProfile, updateProfile } from "@/lib/profile-store";
import { logEvent } from "@/lib/events";
import { openQuestions } from "@/lib/portal-questions";
import { toAsk, type Ask } from "@/lib/ask";
import { applySharpen, sharpenQuestions, sharpenState, type SharpenKey } from "@/lib/sharpen";
import { CITIZENSHIPS } from "@/lib/open-scholarships";
import { chapterStates, detailAsk, formReadiness, skippedKeys, type Level } from "@/lib/profile-chapters";
import type { PortalDetails } from "@/lib/portal-fields";

// the questions with a fixed form, asked as cards (in the chat panel and on the profile) and saved straight to the
// profile with no AI call. nov 2026: 60% of Ivyward AI's turns were walking people through these one at a time, at
// about 3 seconds and $0.013 a tap; on a card each answer is instant and free. the AI keeps what needs a
// conversation: questions, things to do, and the stories essays are written from.
// order: a school's form that's waiting on an answer, then the few facts that decide matches and funding, then the
// form chapters (the quick ones; the story chapters stay a conversation).

export type CardSource = "portal" | "sharpen" | "detail";
export type Card = Ask & { source: CardSource; why: string | null; topic: string | null };
export type CardState = { card: Card | null; left: number; readiness: number; storiesOpen: number };

const SHARPEN_KEYS: SharpenKey[] = ["citizenship", "funding", "budget", "english", "tests", "grades", "applying"];
export const isSharpenId = (id: string) => /^s:[a-z]+$/.test(id) && SHARPEN_KEYS.includes(id.slice(2) as SharpenKey);

export async function cardState(userId: string): Promise<CardState> {
  const db = admin();
  const [profile, { data: row }, portal] = await Promise.all([getProfile(userId), db.from("profiles").select("portal_details").eq("id", userId).single(), openQuestions(userId)]);
  const details = (row?.portal_details as PortalDetails | null) ?? {};
  const skipped = skippedKeys(details);
  const level = (profile.goals.study_level as Level | null) ?? null;
  const passport = (details as Record<string, string | undefined>).passport_country ?? null;

  const sharpen = sharpenState(profile, passport).open.filter((q) => !skipped.has(`s:${q.key}`));
  const states = chapterStates(details, level);
  const quick = states.filter((s) => s.chapter.style === "quick").flatMap((s) => s.next.map((f) => ({ f, chapter: s.chapter })));
  const storiesOpen = states.filter((s) => s.chapter.style === "story").reduce((a, s) => a + s.next.length, 0);

  let card: Card | null = null;
  if (portal[0]) card = { ...toAsk(portal[0]), source: "portal", why: "A school's form is waiting on this. Your answer is saved for every form after it.", topic: portal[0].school };
  else if (sharpen[0]) {
    const q = sharpen[0];
    card = { id: `s:${q.key}`, school: null, question: q.ask, kind: q.options.length ? "choice" : "search", options: q.options.length ? q.options.map((o) => o.label) : [...CITIZENSHIPS], source: "sharpen", why: q.why, topic: "Your matches" };
  } else if (quick[0]) {
    const { f, chapter } = quick[0];
    card = { ...detailAsk(f), source: "detail", why: f.hint ?? chapter.blurb, topic: chapter.title };
  }
  return { card, left: portal.length + sharpen.length + quick.length, readiness: formReadiness(details, level), storiesOpen };
}

// an answer to one of the "your matches" questions, by its label (or a country, for citizenship). null = skip:
// never asked again on a card.
export async function answerSharpen(userId: string, id: string, answer: string | null): Promise<{ ok: boolean; error?: string }> {
  const key = id.slice(2) as SharpenKey;
  if (!SHARPEN_KEYS.includes(key)) return { ok: false, error: "unknown question" };
  if (!answer?.trim()) {
    const db = admin();
    const { data: row } = await db.from("profiles").select("portal_details").eq("id", userId).single();
    const cur = { ...((row?.portal_details as Record<string, unknown>) ?? {}) };
    const skipped = new Set(Array.isArray(cur._skipped) ? (cur._skipped as string[]) : []);
    skipped.add(id);
    await db.from("profiles").update({ portal_details: { ...cur, _skipped: [...skipped] } }).eq("id", userId);
    return { ok: true };
  }
  const p = await getProfile(userId);
  const q = sharpenQuestions(p.goals.study_level).find((x) => x.key === key);
  if (!q) return { ok: false, error: "that question doesn't apply" };
  const a = answer.trim();
  const value = q.options.length ? q.options.find((o) => o.label.toLowerCase() === a.toLowerCase() || o.value === a)?.value : a.slice(0, 60);
  if (!value) return { ok: false, error: `one of: ${q.options.map((o) => o.label).join(", ")}` };
  await updateProfile(userId, (x) => applySharpen(x, key, value));
  await logEvent({ userId, actor: "user", action: "profile.sharpened", context: { key, value: key === "citizenship" ? "set" : value, via: "card" } }).catch(() => {});
  return { ok: true };
}
