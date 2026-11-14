import "server-only";
import { admin } from "@/lib/supabase/admin";
import { loadProfile } from "@/lib/profile";
import { PORTAL_DETAIL_FIELDS, type PortalDetails } from "@/lib/portal-fields";
import { chapterStates, type Level } from "@/lib/profile-chapters";
import { journey, todaysTask, type Journey, type Task, type TodayInput } from "@/lib/today";
import { sharpenState } from "@/lib/sharpen";
import { appNeeds, heldDocs } from "@/lib/doc-data";
import { docChecklist, docCount } from "@/lib/doc-checklist";

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
  const profile = loadProfile(prof?.profile);
  const level = (profile.goals.study_level ?? null) as Level | null;
  const states = chapterStates(details, level);
  const kinds = new Set((docs ?? []).map((d) => d.kind as string));
  const quick = states.find((s) => s.chapter.style === "quick" && s.chapter.id !== "background" && s.chapter.id !== "fineprint" && s.next.length);
  const story = states.find((s) => s.chapter.id === "story");
  // applications being written: the nearest deadline still missing a document
  const working = ((apps ?? []) as unknown as { id: string; status: string; target_deadline: string | null; programs: { degree: string | null; name?: string; schools: { name: string } } | null }[])
    .filter((a) => a.programs && ["preparing", "ready_for_review", "packet_approved"].includes(a.status))
    .sort((a, b) => (a.target_deadline ?? "9999").localeCompare(b.target_deadline ?? "9999"))
    .slice(0, 5);
  let appDoc: TodayInput["appDoc"] = null;
  if (working.length) {
    const [held, needs] = await Promise.all([heldDocs(userId, profile), appNeeds(userId, working.map((a) => a.id), profile)]);
    for (const a of working) {
      const n = needs.get(a.id);
      if (!n) continue;
      const { missing } = docCount(docChecklist(n, held));
      if (missing.length) {
        appDoc = { appId: a.id, school: a.programs!.schools.name, deadline: a.target_deadline, label: missing[0].label, missing: missing.length };
        break;
      }
    }
  }
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
    appDoc,
    sharpenOpen: sharpenState(profile, (details as Record<string, string | undefined>).passport_country ?? null).open.length,
  };
  return { task: todaysTask(input), journey: journey(input) };
}
