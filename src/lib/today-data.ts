import "server-only";
import { admin } from "@/lib/supabase/admin";
import { loadProfile } from "@/lib/profile";
import { PORTAL_DETAIL_FIELDS, type PortalDetails } from "@/lib/portal-fields";
import { chapterStates, type Level } from "@/lib/profile-chapters";
import { journey, todaysTask, type Journey, type Task, type TodayInput } from "@/lib/today";
import { sharpenState } from "@/lib/sharpen";
import { appNeeds, heldDocs } from "@/lib/doc-data";
import { docChecklist, docCount } from "@/lib/doc-checklist";
import { journeyMap, type JourneyMap } from "@/lib/journey-map";
import { VERIFIED } from "@/lib/admission-rules";

// everything today's task looks at, for one applicant (the dashboard and the morning email)
export async function loadToday(userId: string): Promise<{ task: Task | null; journey: Journey; map: JourneyMap }> {
  const db = admin();
  const [{ data: prof }, { data: docs }, { data: apps }, { data: mail }, { data: verified }, { data: marks }] = await Promise.all([
    db.from("profiles").select("profile, portal_details").eq("id", userId).single(),
    db.from("documents").select("kind").eq("user_id", userId),
    db.from("applications").select("id, status, target_deadline, runner_status, aid_offered, programs(name, degree, schools(name, country))").eq("user_id", userId).not("status", "in", "(dropped,withdrawn)").limit(300),
    db.from("mail_accounts").select("status").eq("user_id", userId).maybeSingle(),
    db.from("outcomes").select("application_id").eq("user_id", userId).eq("label", VERIFIED),
    // the journey's ticks (api/journey) and the steps that tick themselves, oldest first so the latest wins
    db.from("events").select("action, application_id, context").eq("user_id", userId).in("action", ["journey.step", "scholarships.school_checked"]).order("created_at", { ascending: true }).limit(2000),
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
  const ok = new Set((verified ?? []).map((v) => v.application_id as string));
  const ticks = new Set<string>();
  const checked = new Set<string>();
  for (const m of marks ?? []) {
    if (m.action === "scholarships.school_checked") checked.add(m.application_id as string);
    const c = (m.context ?? {}) as { key?: string; done?: boolean };
    if (m.action === "journey.step" && c.key) {
      if (c.done) ticks.add(c.key);
      else ticks.delete(c.key);
    }
  }
  const map = journeyMap({
    citizenship: profile.identity.citizenship || ((details as Record<string, string | undefined>).passport_country ?? null),
    hasCv: input.hasCv,
    hasTranscript: input.hasTranscript,
    basicsMissing: input.basicsMissing,
    ticks,
    apps: ((apps ?? []) as unknown as { id: string; status: string; target_deadline: string | null; runner_status: string | null; aid_offered: { amount_usd?: number; accept_by?: string | null } | null; programs: { name: string; schools: { name: string; country: string | null } } | null }[])
      .filter((a) => a.programs)
      .map((a) => ({
        id: a.id,
        school: a.programs!.schools.name,
        programme: a.programs!.name,
        country: a.programs!.schools.country,
        status: a.status,
        runner: a.runner_status,
        deadline: a.target_deadline,
        verified: ok.has(a.id),
        aid: Number(a.aid_offered?.amount_usd) || 0,
        acceptBy: a.aid_offered?.accept_by ?? null,
        scholarshipsChecked: checked.has(a.id),
      })),
  });
  return { task: todaysTask(input), journey: journey(input), map };
}
