import "server-only";
import { admin } from "@/lib/supabase/admin";
import { loadProfile } from "@/lib/profile";
import { PORTAL_DETAIL_FIELDS, type PortalDetails } from "@/lib/portal-fields";
import { chapterStates, type Level } from "@/lib/profile-chapters";
import { journey, todaysTask, type Journey, type Task, type TodayInput } from "@/lib/today";

// everything today's task looks at, for one applicant (the dashboard and the morning email)
export async function loadToday(userId: string): Promise<{ task: Task | null; journey: Journey }> {
  const db = admin();
  const [{ data: prof }, { data: docs }, { data: apps }, { data: mail }] = await Promise.all([
    db.from("profiles").select("profile, portal_details").eq("id", userId).single(),
    db.from("documents").select("kind").eq("user_id", userId),
    db.from("applications").select("id, status, target_deadline, programs(degree, schools(name))").eq("user_id", userId).not("status", "in", "(dropped,withdrawn)").limit(300),
    db.from("mail_accounts").select("status").eq("user_id", userId).maybeSingle(),
  ]);
  const details = (prof?.portal_details ?? {}) as PortalDetails;
  const level = (loadProfile(prof?.profile).goals.study_level ?? null) as Level | null;
  const states = chapterStates(details, level);
  const kinds = new Set((docs ?? []).map((d) => d.kind as string));
  const quick = states.find((s) => s.chapter.style === "quick" && s.chapter.id !== "background" && s.chapter.id !== "fineprint" && s.next.length);
  const story = states.find((s) => s.chapter.id === "story");
  const input: TodayInput = {
    apps: ((apps ?? []) as unknown as { id: string; status: string; target_deadline: string | null; programs: { degree: string | null; schools: { name: string } } | null }[])
      .filter((a) => a.programs)
      .map((a) => ({ id: a.id, school: a.programs!.schools.name, status: a.status, deadline: a.target_deadline })),
    hasCv: kinds.has("cv"),
    hasTranscript: kinds.has("transcript"),
    basicsMissing: PORTAL_DETAIL_FIELDS.filter((f) => f.required && !String(details[f.key] ?? "").trim()).length,
    gmail: mail?.status === "active",
    story: story ? { open: story.next.length } : null,
    nextChapter: quick ? { id: quick.chapter.id, title: quick.chapter.title, open: quick.next.length } : null,
  };
  return { task: todaysTask(input), journey: journey(input) };
}
