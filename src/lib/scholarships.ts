import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { normalizeUrl } from "@/lib/portal-url";
import { SCHOLARSHIP_DEGREE } from "@/lib/scholarship-kind";
export { isScholarship, SCHOLARSHIP_DEGREE } from "@/lib/scholarship-kind";

// applying for a scholarship = an application whose "program" is the scholarship, under its sponsor. from there the
// usual pipeline runs: strategist (requirements + angle), writer and red team (essays), you sign, the runner submits.

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const FIT_SCORE: Record<string, number> = { strong: 8, possible: 6, long_shot: 4 };

type Opp = { id: string; name: string; sponsor: string | null; school_id: string | null; amount_note: string | null; deadline: string | null; eligibility: string | null; url: string | null };

export async function startScholarship(userId: string, userFundingId: string, by: "user" | "agent"): Promise<{ applicationId: string; created: boolean } | { error: string }> {
  const db = admin();
  const { data: uf } = await db
    .from("user_funding")
    .select("id, fit, why, status, application_id, funding_opportunities(id, name, sponsor, school_id, amount_note, deadline, eligibility, url)")
    .eq("id", userFundingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!uf) return { error: "scholarship not found" };
  if (uf.application_id) return { applicationId: uf.application_id as string, created: false };
  const o = uf.funding_opportunities as unknown as Opp | null;
  if (!o) return { error: "scholarship not found" };
  if (o.deadline && o.deadline < new Date().toISOString().slice(0, 10)) return { error: "this scholarship's deadline has passed" };

  // the sponsor is the "school": a school's own award sits under that school, an outside award under its sponsor
  let schoolId = o.school_id;
  if (!schoolId) {
    const sponsor = (o.sponsor || o.name).trim();
    const { data: school, error } = await db
      .from("schools")
      .upsert({ slug: `award-${slug(sponsor)}`, name: sponsor, website: o.url ? new URL(normalizeUrl(o.url) ?? o.url).origin : null }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) return { error: `couldn't save the sponsor: ${error.message}` };
    schoolId = school.id as string;
  }

  const row = {
    school_id: schoolId,
    name: o.name,
    degree: SCHOLARSHIP_DEGREE,
    url: normalizeUrl(o.url),
    app_fee_usd: 0,
    deadlines: o.deadline ? [{ round: "Deadline", date: o.deadline, funding_priority: "no" }] : [],
    funding_signals: { summary: [o.amount_note, o.eligibility].filter(Boolean).join(". ") },
    source_urls: o.url ? [o.url] : [],
  };
  // the kind column arrives with migration 0012; until then the degree alone marks it as a scholarship
  let res = await db.from("programs").upsert({ ...row, kind: "scholarship" }, { onConflict: "school_id,name,degree" }).select("id").single();
  if (res.error && /kind/.test(res.error.message)) res = await db.from("programs").upsert(row, { onConflict: "school_id,name,degree" }).select("id").single();
  if (res.error || !res.data) return { error: `couldn't save the scholarship: ${res.error?.message}` };
  const program = res.data;

  let applicationId: string;
  const { data: existing } = await db.from("applications").select("id").eq("user_id", userId).eq("program_id", program.id).maybeSingle();
  if (existing) applicationId = existing.id as string;
  else {
    const { data: app, error } = await db
      .from("applications")
      .insert({
        user_id: userId,
        program_id: program.id,
        status: "shortlisted",
        fit_score: FIT_SCORE[uf.fit as string] ?? null,
        fit_reasoning: uf.why ?? null,
        target_deadline: o.deadline,
        portal_url: normalizeUrl(o.url),
      })
      .select("id")
      .single();
    if (error) return { error: `couldn't start it: ${error.message}` };
    applicationId = app.id as string;
  }
  await db.from("applications").update({ status: "preparing" }).eq("id", applicationId).eq("status", "shortlisted");
  await db.from("user_funding").update({ application_id: applicationId, status: "preparing" }).eq("id", uf.id);
  await enqueue({ userId, agent: "strategist", task: "plan", payload: { applicationId }, idempotencyKey: `plan:${applicationId}` });
  await logEvent({ userId, actor: by === "user" ? "user" : "agent:closer", action: "scholarship.started", applicationId, context: { scholarship: o.name, sponsor: o.sponsor } });
  return { applicationId, created: !existing };
}

// with "apply for strong matches on their own" switched on: start every strong-fit scholarship still open
export async function autoStartScholarships(userId: string): Promise<number> {
  const db = admin();
  const { data: prof } = await db.from("profiles").select("auto_scholarships").eq("id", userId).maybeSingle();
  if (!prof?.auto_scholarships) return 0;
  const { data } = await db.from("user_funding").select("id, funding_opportunities(deadline, intl_eligible)").eq("user_id", userId).eq("fit", "strong").is("application_id", null).limit(20);
  const today = new Date().toISOString().slice(0, 10);
  let n = 0;
  for (const x of data ?? []) {
    const o = x.funding_opportunities as unknown as { deadline: string | null; intl_eligible: boolean | null } | null;
    if (!o || o.intl_eligible === false || (o.deadline && o.deadline < today)) continue;
    const r = await startScholarship(userId, x.id as string, "agent");
    if ("applicationId" in r && r.created) n++;
  }
  return n;
}
