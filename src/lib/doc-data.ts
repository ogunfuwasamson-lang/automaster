import "server-only";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile-store";
import { docChecklist, docCount, inSentence, requirementsFromBrief, type AppNeeds, type DocRow, type HeldDocs } from "@/lib/doc-checklist";
import type { Profile } from "@/lib/profile";
import { notify, resolve } from "@/lib/notify";

const ENGLISH = /ielts|toefl|duolingo|\bpte\b/i;
const ADMISSIONS = /\bgre\b|\bgmat\b/i;

// what the applicant has: documents by kind, test results, referees
export async function heldDocs(userId: string, profile?: Profile): Promise<HeldDocs> {
  const db = admin();
  const [p, { data: docs }, { count: referees }] = await Promise.all([
    profile ? Promise.resolve(profile) : getProfile(userId),
    db.from("documents").select("kind, filename, status, extracted").eq("user_id", userId),
    db.from("recommenders").select("id", { count: "exact", head: true }).eq("user_id", userId).not("email", "is", null),
  ]);
  const kinds: Record<string, number> = {};
  let english = false;
  let admissions = false;
  for (const d of docs ?? []) {
    if (d.status === "failed") continue;
    const k = d.kind === "degree_cert" ? "degree_certificate" : (d.kind as string);
    kinds[k] = (kinds[k] ?? 0) + 1;
    if (k === "test_score") {
      const text = `${d.filename} ${JSON.stringify(d.extracted ?? {})}`;
      if (ADMISSIONS.test(text) && !ENGLISH.test(text)) admissions = true;
      else english = true; // an english result, or one we can't tell: counted as english
    }
  }
  for (const t of p.tests) {
    if (t.status !== "taken") continue;
    if (["IELTS", "TOEFL", "Duolingo"].includes(t.name)) english = true;
    if (["GRE", "GMAT"].includes(t.name)) admissions = true;
  }
  return { kinds, englishTest: english, admissionsTest: admissions, referees: referees ?? 0 };
}

// what each application needs: the agents' plan (references, other requirements) and the programme's test policy
export async function appNeeds(userId: string, appIds: string[], profile?: Profile): Promise<Map<string, AppNeeds>> {
  const out = new Map<string, AppNeeds>();
  if (!appIds.length) return out;
  const db = admin();
  const [p, { data: apps }, { data: planned }, { data: refMsgs }] = await Promise.all([
    profile ? Promise.resolve(profile) : getProfile(userId),
    db.from("applications").select("id, programs(degree, test_policy)").eq("user_id", userId).in("id", appIds),
    db.from("events").select("application_id, context, created_at").eq("user_id", userId).eq("action", "application.planned").in("application_id", appIds).order("created_at", { ascending: false }),
    db.from("messages").select("threads!inner(application_id)").eq("user_id", userId).eq("purpose", "reference_request").in("threads.application_id", appIds),
  ]);
  const plan = new Map<string, { references?: number; requirements?: string[] }>();
  for (const e of planned ?? []) if (!plan.has(e.application_id as string)) plan.set(e.application_id as string, (e.context ?? {}) as { references?: number; requirements?: string[] });
  const asked = new Map<string, number>();
  for (const m of (refMsgs ?? []) as unknown as { threads: { application_id: string } | null }[]) {
    const id = m.threads?.application_id;
    if (id) asked.set(id, (asked.get(id) ?? 0) + 1);
  }
  // plans made before requirements were stored with the event: read them from the positioning brief
  const older = [...plan.entries()].filter(([, c]) => !c.requirements).map(([id]) => id);
  const briefs = new Map<string, string>();
  if (older.length) {
    const { data: arts } = await db.from("artifacts").select("application_id, current_version, artifact_versions(version, content)").eq("user_id", userId).eq("kind", "strategy").in("application_id", older);
    for (const a of (arts ?? []) as unknown as { application_id: string; current_version: number; artifact_versions: { version: number; content: string }[] }[])
      briefs.set(a.application_id, a.artifact_versions.find((v) => v.version === a.current_version)?.content ?? "");
  }
  for (const a of (apps ?? []) as unknown as { id: string; programs: { degree: string | null; test_policy: string | null } | null }[]) {
    const c = plan.get(a.id);
    out.set(a.id, {
      level: p.goals.study_level,
      award: a.programs?.degree === "Scholarship",
      testPolicy: a.programs?.test_policy ?? null,
      englishRoute: p.english.route,
      references: c ? (typeof c.references === "number" ? c.references : null) : null,
      refsRequested: asked.get(a.id) ?? 0,
      requirements: c?.requirements ?? requirementsFromBrief(briefs.get(a.id)),
    });
  }
  return out;
}

export async function checklistFor(userId: string, appId: string): Promise<{ rows: DocRow[]; done: number; total: number; missing: DocRow[] } | null> {
  const profile = await getProfile(userId);
  const [held, needs] = await Promise.all([heldDocs(userId, profile), appNeeds(userId, [appId], profile)]);
  const n = needs.get(appId);
  if (!n) return null;
  const rows = docChecklist(n, held);
  return { rows, ...docCount(rows) };
}

const longDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });

// after the agents plan an application: one notice naming the documents this school still needs, the school and
// the deadline (resolved once they're all in). a general "upload your documents" got nine transcripts in a month.
export async function askForMissingDocs(userId: string, appId: string): Promise<number> {
  const c = await checklistFor(userId, appId);
  const key = `docs:${appId}`;
  if (!c) return 0;
  if (!c.missing.length) {
    await resolve(userId, key).catch(() => {});
    return 0;
  }
  const { data: app } = await admin().from("applications").select("target_deadline, programs(name, degree, schools(name))").eq("id", appId).maybeSingle();
  const prog = (app?.programs ?? null) as unknown as { name: string; degree: string | null; schools: { name: string } } | null;
  const school = prog?.degree === "Scholarship" ? prog.name : (prog?.schools.name ?? "This school");
  const names = c.missing.map((r) => inSentence(r.label));
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  await notify({
    userId,
    key,
    kind: "setup",
    urgent: !!app?.target_deadline && Date.parse(app.target_deadline) - Date.now() < 21 * 86_400_000,
    title: `${school} needs your ${list}`,
    body: `Your agents can't submit without ${c.missing.length === 1 ? "it" : "them"}.${app?.target_deadline ? ` Applications close ${longDay(app.target_deadline)}.` : ""} You have ${c.done} of ${c.total} in. Each one takes a minute: a photo from your phone works.`,
    href: `/applications/${appId}#documents`,
    actionLabel: "Add them",
    email: true,
  });
  return c.missing.length;
}

// a document came in: every application it might complete gets its notice refreshed (resolved when nothing's left)
export async function refreshDocAsks(userId: string): Promise<void> {
  const { data: open } = await admin().from("notifications").select("dedupe_key").eq("user_id", userId).like("dedupe_key", "docs:%").is("resolved_at", null);
  for (const n of open ?? []) await askForMissingDocs(userId, String(n.dedupe_key).slice(5)).catch(() => {});
}
