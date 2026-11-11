import "server-only";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { getProfile } from "@/lib/profile-store";
import { safeFactSheet } from "@/agents/writer";
import { groundCv, type Cv } from "@/lib/cv-check";

// a CV for one program: the applicant's own facts, chosen and ordered for what that program looks for. kept as a
// generated file next to their documents; never uploaded to a portal unless they upload it themselves.
const CvOut = z.object({
  headline: z.string(),
  sections: z.array(z.object({ title: z.string(), items: z.array(z.object({ title: z.string(), org: z.string(), dates: z.string(), bullets: z.array(z.string()) })) })),
});

const SYSTEM = `you write a one-to-two page CV for a university application, tailored to one program.
use only the facts given. you may choose which facts to include, order them, and reword them plainly. you may not add an achievement, number, organisation, title, date, skill or award that isn't in the facts. a number in a bullet must be exactly a number in the facts.
sections, in the order that serves this program: Education, Experience, Projects or Leadership (when there are any), Awards (when there are any), Skills and languages, Test scores (when they help). leave out a section with nothing in it.
bullets: start with a verb, one line each, at most four per item, the ones this program would care about first.
headline: one plain line saying who the applicant is in this program's terms (no adjectives like "passionate", "dynamic").`;

export const cvPath = (userId: string, applicationId: string) => `${userId}/generated/${applicationId}-cv.json`;

export async function makeTailoredCv(userId: string, applicationId: string): Promise<{ cv: Cv; dropped: string[] }> {
  const db = admin();
  const { data: app } = await db.from("applications").select("angle, programs(name, degree, schools(name, country))").eq("id", applicationId).eq("user_id", userId).maybeSingle();
  if (!app) throw new Error("not found");
  const p = app.programs as unknown as { name: string; degree: string | null; schools: { name: string; country: string | null } };
  const profile = await getProfile(userId);
  const facts = JSON.stringify(await safeFactSheet(userId, profile));
  const { output } = await runStructured({
    userId,
    agent: "writer",
    tier: "write",
    promptVersion: "cv-tailored-v1",
    system: SYSTEM,
    cachePrefix: `the applicant's facts (the only source):\n${facts}`,
    prompt: `program: ${p.name}${p.degree ? ` (${p.degree})` : ""} at ${p.schools.name}${p.schools.country ? `, ${p.schools.country}` : ""}\nthe angle this application takes: ${app.angle ?? "(not set)"}`,
    schema: CvOut,
    maxTokens: 3000,
  });
  const grounded = groundCv(output, facts);
  await db.storage.from("documents").upload(cvPath(userId, applicationId), new TextEncoder().encode(JSON.stringify({ ...grounded.cv, made_at: new Date().toISOString() })), { contentType: "application/json", upsert: true });
  return grounded;
}

export async function loadTailoredCv(userId: string, applicationId: string): Promise<(Cv & { made_at?: string }) | null> {
  const { data } = await admin().storage.from("documents").download(cvPath(userId, applicationId));
  if (!data) return null;
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
}
