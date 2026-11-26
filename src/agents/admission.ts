import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent, recordOutcome } from "@/lib/events";
import { notify, resolve } from "@/lib/notify";
import { runStructured } from "@/lib/llm";
import { getProfile } from "@/lib/profile-store";
import { canReadMail, recentMail } from "@/lib/gmail";
import { hostRoot } from "@/lib/verify-mail";
import { normalizeUrl } from "@/lib/portal-url";
import { canTransition, type AppStatus } from "@/lib/app-state";
import { findInstitution, linkSchool } from "@/lib/institutions";
import { VERIFIED, admitQuery, regionOfCountry, sameSchool, verdict } from "@/lib/admission-rules";
import { toBlocks } from "./intake";
import { slugify } from "./recon";

// an admission counts once the school's email or the letter backs it (founder's call, 26 nov 2026). the applicant
// says "admitted" → their inbox is searched for the school's email; no inbox, or nothing there → they're asked for
// the letter. a letter can also come on its own: an admission they had before Ivyward, which becomes an
// application here. once confirmed: the funding agent, the school's scholarships and the visa steps start.

export { VERIFIED };

const OfferRead = z.object({
  is_offer: z.boolean(),
  conditional: z.boolean(),
  conditions: z.string(),
  school: z.string(),
  country: z.string(),
  programme: z.string(),
  degree: z.string(),
  intake: z.string(),
  applicant_name: z.string(),
  same_school: z.boolean(),
  funding: z.string(),
  funding_usd_per_year: z.number(),
  accept_by: z.string(),
  summary: z.string(),
});
type OfferRead = z.infer<typeof OfferRead>;

const SYSTEM = `you read a letter or email an applicant got from a university and say whether it offers them admission.
is_offer: true only for an offer of admission to a programme (conditional or unconditional), including an admission notice or offer letter. false for an application receipt, an invitation to apply or interview, a waitlist, a rejection, marketing, or a document that isn't from a university.
conditional: true when the offer depends on conditions (final transcript, english score, deposit is not a condition). conditions: what they are, or "".
school, country, programme, degree, intake (e.g. "September 2027"): as the letter states them, or "".
applicant_name: the full name the letter is addressed to, or "".
same_school: true when the offer comes from the school named under "check against" (any name it goes by, its faculties and graduate school count); false when it is another school or nothing is given to check against.
funding: any scholarship, assistantship, tuition waiver or award offered with it, in a line, or "". funding_usd_per_year: its yearly value in USD (convert roughly), 0 when none or unclear.
accept_by: the date to accept or reply by, as YYYY-MM-DD, or "".
summary: one plain sentence for the applicant.`;

async function readOffer(userId: string, jobId: string, content: Awaited<ReturnType<typeof toBlocks>> | string, check: string | null) {
  const { output } = await runStructured({
    userId,
    agent: "intake",
    jobId,
    tier: "cheap",
    promptVersion: "admission-read-v1",
    system: SYSTEM,
    prompt: [
      ...(typeof content === "string" ? [{ type: "text" as const, text: content.slice(0, 20_000) }] : content),
      { type: "text" as const, text: `check against: ${check ?? "(nothing given)"}` },
    ],
    schema: OfferRead,
    maxTokens: 2000,
  });
  return output;
}

type AppRow = { id: string; status: AppStatus; portal_url: string | null; program_id: string; programs: { name: string; url: string | null; schools: { name: string; website: string | null } } };
async function loadApp(userId: string, applicationId: string): Promise<AppRow | null> {
  const { data } = await admin()
    .from("applications")
    .select("id, status, portal_url, program_id, programs!inner(name, url, schools!inner(name, website))")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data as unknown as AppRow | null;
}

export async function isVerified(applicationId: string): Promise<boolean> {
  const { count } = await admin().from("outcomes").select("id", { count: "exact", head: true }).eq("application_id", applicationId).eq("label", VERIFIED);
  return (count ?? 0) > 0;
}

// moves an application to admitted along the allowed path (a signed application the applicant then submitted
// themselves goes through submitted first). false when its stage has no path there (it stays as it is; the
// confirmed admission is still recorded against it)
async function moveToAdmitted(app: AppRow, aid: { amount_usd: number; note: string; accept_by: string | null }): Promise<boolean> {
  const db = admin();
  let status = app.status;
  if (status === "admitted" || status === "accepted") return true;
  if (status === "packet_approved") {
    const { error } = await db.from("applications").update({ status: "submitted" }).eq("id", app.id);
    if (error) return false;
    status = "submitted";
  }
  if (status === "submitted" && !canTransition(status, "admitted")) status = "under_review";
  if (!canTransition(status, "admitted")) return false;
  const { error } = await db
    .from("applications")
    .update({ status: "admitted", decision: "admitted", decision_at: new Date().toISOString(), aid_offered: aid })
    .eq("id", app.id);
  return !error;
}

// the admission is backed: record it, then start what comes after an admit
export async function confirmAdmission(userId: string, app: AppRow, read: OfferRead, ev: { source: "letter" | "mail"; documentId?: string; messageId?: string }) {
  if (await isVerified(app.id)) return;
  const aid = { amount_usd: Math.max(0, Math.round(read.funding_usd_per_year || 0)), note: read.funding, accept_by: /^\d{4}-\d{2}-\d{2}$/.test(read.accept_by) ? read.accept_by : null };
  const moved = await moveToAdmitted(app, aid);
  await recordOutcome({ userId, applicationId: app.id, kind: "final", label: VERIFIED, value: aid.amount_usd || undefined, source: ev.source });
  await logEvent({
    userId,
    actor: "agent:intake",
    action: "admission.verified",
    applicationId: app.id,
    programId: app.program_id,
    context: { source: ev.source, documentId: ev.documentId, messageId: ev.messageId, conditional: read.conditional, conditions: read.conditions, intake: read.intake, moved },
  });
  await afterAdmit(userId, app.id);
  await resolve(userId, new RegExp(`^admission-proof:${app.id}$`)).catch(() => {});
  await notify({
    userId,
    key: `admission-verified:${app.id}`,
    kind: "info",
    title: `Admission confirmed: ${app.programs.schools.name}`,
    body: `${read.conditional ? "A conditional offer" : "An offer"} for ${read.programme || app.programs.name}${read.intake ? `, ${read.intake}` : ""}. Next: funding and scholarships, then your visa. Your agents have started on both.`,
    href: `/applications/${app.id}`,
    actionLabel: "See next steps",
    email: true,
  });
}

// what an admit starts: the funding agent (aid offered, negotiation, outside scholarships) and the school's own
// scholarships. the visa steps show on the application and the journey once the admission is confirmed.
export async function afterAdmit(userId: string, applicationId: string) {
  await enqueue({ userId, agent: "closer", task: "funding_plan", payload: { applicationId }, idempotencyKey: `funding-plan:${applicationId}` });
  await enqueue({ userId, agent: "closer", task: "school_scholarships", payload: { applicationId }, idempotencyKey: `school-scholarships:${applicationId}` });
}

function askForProof(userId: string, app: AppRow, mailChecked: boolean) {
  return notify({
    userId,
    key: `admission-proof:${app.id}`,
    kind: "setup",
    title: `Confirm your admission to ${app.programs.schools.name}`,
    body: mailChecked
      ? "We didn't find the school's admission email in your inbox. Upload the admission letter, and your agents start on funding and your visa."
      : "Connect your email so your agents can find the school's admission email, or upload the admission letter. Then they start on funding and your visa.",
    href: `/applications/${app.id}#admission`,
    actionLabel: "Confirm it",
    urgent: true,
  });
}

// a school's email domains: its programme page, application form and website
function domainsOf(app: AppRow): string[] {
  const out = new Set<string>();
  for (const u of [app.programs.url, app.portal_url, app.programs.schools.website]) {
    const n = normalizeUrl(u);
    if (n) out.add(hostRoot(new URL(n).hostname));
  }
  return [...out];
}

// finds the applicant's application for the school a letter names, or adds one: an admission from before Ivyward
async function applicationFor(userId: string, read: OfferRead): Promise<AppRow | null> {
  const db = admin();
  const { data } = await db
    .from("applications")
    .select("id, status, portal_url, program_id, programs!inner(name, url, schools!inner(name, website))")
    .eq("user_id", userId)
    .neq("status", "dropped");
  const apps = (data ?? []) as unknown as AppRow[];
  const bySchool = apps.filter((a) => sameSchool(read.school, a.programs.schools.name));
  if (bySchool.length === 1) return bySchool[0];
  if (bySchool.length > 1) return bySchool.find((a) => sameSchool(read.programme, a.programs.name)) ?? bySchool[0];
  if (!read.school) return null;

  // a new one. the school: the registry's record when there is one, the school on file, or a new school row
  const inst = await findInstitution({ name: read.school, country: read.country || null }).catch(() => null);
  let schoolId = inst?.school_id ?? null;
  if (!schoolId) {
    const { data: known } = await db.from("schools").select("id").ilike("name", read.school).limit(1).maybeSingle();
    schoolId = (known?.id as string) ?? null;
  }
  if (!schoolId) {
    const name = inst?.name ?? read.school;
    const { data: made, error } = await db
      .from("schools")
      .upsert({ slug: slugify(name), name, country: read.country || null, region: regionOfCountry(read.country) }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error || !made) return null;
    schoolId = made.id as string;
  }
  if (inst) await linkSchool(schoolId, inst).catch(() => {});
  // the programme as the letter names it. never marked checked (verified_at stays empty), so it stays off the
  // shared list until the agents research it
  const programme = read.programme || "Admission";
  const degree = read.degree || "";
  let { data: prog } = await db.from("programs").select("id").eq("school_id", schoolId).ilike("name", programme).eq("degree", degree).limit(1).maybeSingle();
  if (!prog) ({ data: prog } = await db.from("programs").insert({ school_id: schoolId, name: programme, degree, kind: "program" }).select("id").single());
  if (!prog) return null;
  const { data: made } = await db
    .from("applications")
    .insert({ user_id: userId, program_id: prog.id, status: "admitted", decision: "admitted", decision_at: new Date().toISOString() })
    .select("id")
    .single();
  if (!made) return null;
  await logEvent({ userId, actor: "agent:intake", action: "application.added_from_admission", applicationId: made.id as string, programId: prog.id as string, context: { school: read.school } });
  return loadApp(userId, made.id as string);
}

export const admission: Record<string, Handler> = {
  // the applicant said "admitted": look for the school's email in their inbox, or ask for the letter
  "admission.check": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const app = await loadApp(job.user_id, applicationId);
    if (!app) return { skipped: "no application" };
    if (await isVerified(app.id)) return { verified: "already" };
    if (!(await canReadMail(job.user_id))) {
      await askForProof(job.user_id, app, false);
      return { asked: "no inbox" };
    }
    const school = app.programs.schools.name;
    const mails = await recentMail(job.user_id, admitQuery(domainsOf(app), school), 8).catch(() => []);
    // a few at most go to the model: the likeliest first (subject words), each a cheap read
    const likely = mails.sort((a, b) => Number(/admi|offer|congrat/i.test(b.subject)) - Number(/admi|offer|congrat/i.test(a.subject))).slice(0, 3);
    for (const m of likely) {
      const read = await readOffer(job.user_id, job.id, `from: ${m.from}\nsubject: ${m.subject}\n\n${m.text}`, `${school}, ${app.programs.name}`);
      if (verdict(read, { profileName: null, source: "mail", checkSchool: true }).ok) {
        await confirmAdmission(job.user_id, app, read, { source: "mail", messageId: m.id });
        return { verified: "mail" };
      }
    }
    await askForProof(job.user_id, app, true);
    return { asked: "not in inbox", looked: mails.length };
  },

  // an admission letter was uploaded (for an application, or on its own)
  "admission.read_letter": async (job) => {
    const { documentId, applicationId } = job.payload as { documentId: string; applicationId?: string };
    const db = admin();
    const { data: doc } = await db.from("documents").select("id, filename, storage_path, mime_type").eq("id", documentId).eq("user_id", job.user_id).maybeSingle();
    if (!doc) return { skipped: "no document" };
    const { data: file } = await db.storage.from("documents").download(doc.storage_path);
    if (!file) throw new Error("download failed");
    const blocks = await toBlocks(Buffer.from(await file.arrayBuffer()), doc.mime_type ?? "", doc.filename);
    const target = applicationId ? await loadApp(job.user_id, applicationId) : null;
    const read = await readOffer(job.user_id, job.id, blocks, target ? `${target.programs.schools.name}, ${target.programs.name}` : null);
    await db.from("documents").update({ status: "extracted", extracted: { kind: "admission_letter", summary: read.summary, offer: read } }).eq("id", doc.id);
    const profileName = (await getProfile(job.user_id)).identity.full_name;
    const v = verdict(read, { profileName, source: "letter", checkSchool: !!target });
    let app: AppRow | null = null;
    if (v.ok) app = target ?? (await applicationFor(job.user_id, read));
    // uploaded on one application but it's another school's offer: likely one they had before, so it's added
    else if (target && read.is_offer && !read.same_school && verdict(read, { profileName, source: "letter", checkSchool: false }).ok) app = await applicationFor(job.user_id, read);
    if (!app) {
      await notify({
        userId: job.user_id,
        key: `admission-letter:${doc.id}`,
        kind: "setup",
        title: "We couldn't confirm that admission letter",
        body: `${v.why[0].toUpperCase()}${v.why.slice(1)}. If that's wrong, upload a clearer copy of the letter (all pages), or check the name on your profile.`,
        href: target ? `/applications/${target.id}#admission` : "/dashboard#journey",
        actionLabel: "Try again",
      });
      return { verified: false, why: v.why };
    }
    await confirmAdmission(job.user_id, app, read, { source: "letter", documentId: doc.id });
    return { verified: true, applicationId: app.id };
  },
};
