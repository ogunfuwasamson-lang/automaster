import "server-only";
import { createHash } from "node:crypto";
import { admin } from "@/lib/supabase/admin";

// lessons: instructions the agents learned (see 0021_lessons.sql). every model call picks up the ones that apply
// to its agent and task, its applicant, and the portal or school it's working on.

export type Lesson = { id: string; scope: "user" | "global"; user_id: string | null; agent: string; task: string | null; topic: string | null; text: string; status: string };

export const taskOf = (promptVersion?: string | null) => (promptVersion ?? "").replace(/-v\d+$/, "") || null;

// strip anything personal before a lesson can be shared
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

const fp = (l: { scope: string; user_id?: string | null; agent: string; task?: string | null; topic?: string | null; text: string }) =>
  createHash("sha256").update([l.scope, l.user_id ?? "", l.agent, l.task ?? "", l.topic ?? "", l.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()].join("|")).digest("hex").slice(0, 32);

export async function addLesson(l: { scope: "user" | "global"; userId?: string | null; agent: string; task?: string | null; topic?: string | null; text: string; evidence?: Record<string, unknown>; status: "proposed" | "active"; source?: string }) {
  const text = l.scope === "global" ? scrub(l.text) : l.text.trim().slice(0, 400);
  if (text.length < 8) return null;
  const row = { scope: l.scope, user_id: l.scope === "user" ? (l.userId ?? null) : null, agent: l.agent, task: l.task ?? null, topic: l.topic ?? null, text };
  const { data, error } = await admin()
    .from("lessons")
    .upsert({ ...row, evidence: l.evidence ?? {}, status: l.status, source: l.source ?? "auto", fingerprint: fp(row), decided_at: l.status === "active" ? new Date().toISOString() : null }, { onConflict: "fingerprint", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  return error ? null : ((data?.id as string) ?? null);
}

// global lessons change rarely: cache them for a few minutes per server instance
let cache: { at: number; rows: Lesson[] } | null = null;
async function globalActive(): Promise<Lesson[]> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.rows;
  const { data, error } = await admin().from("lessons").select("id, scope, user_id, agent, task, topic, text, status").eq("scope", "global").eq("status", "active").limit(1000);
  cache = { at: Date.now(), rows: error ? [] : ((data ?? []) as Lesson[]) };
  return cache.rows;
}

export function pick(all: Lesson[], q: { agent: string; task: string | null; topic?: string | null; userId?: string | null }) {
  const fits = (l: Lesson) => l.agent === q.agent && (!l.task || l.task === q.task) && (!l.topic || (!!q.topic && l.topic === q.topic));
  const mine = all.filter((l) => l.scope === "user" && l.user_id === q.userId && fits(l)).slice(-10);
  const here = all.filter((l) => l.scope === "global" && l.topic && fits(l)).slice(-6);
  const general = all.filter((l) => l.scope === "global" && !l.topic && fits(l)).slice(-10);
  return { mine, here, general };
}

export function lessonText(p: ReturnType<typeof pick>): string {
  const part = (h: string, xs: Lesson[]) => (xs.length ? `${h}\n${xs.map((l) => `- ${l.text}`).join("\n")}` : "");
  return [
    part("lessons learned from earlier runs (follow them unless the task in front of you clearly contradicts one):", p.general),
    part("about this particular portal or school, from earlier runs:", p.here),
    part("about this applicant's preferences, learned from their own edits and choices:", p.mine),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function lessonsFor(q: { agent: string; task: string | null; topic?: string | null; userId?: string | null }): Promise<{ ids: string[]; text: string }> {
  try {
    const glob = await globalActive();
    let mine: Lesson[] = [];
    if (q.userId) {
      const { data } = await admin().from("lessons").select("id, scope, user_id, agent, task, topic, text, status").eq("scope", "user").eq("user_id", q.userId).eq("agent", q.agent).eq("status", "active").order("created_at", { ascending: true }).limit(30);
      mine = (data ?? []) as Lesson[];
    }
    const p = pick([...glob, ...mine], q);
    const ids = [...p.general, ...p.here, ...p.mine].map((l) => l.id);
    return { ids, text: lessonText(p) };
  } catch {
    return { ids: [], text: "" };
  }
}

export function clearLessonCache() {
  cache = null;
}
