import "server-only";
import * as z from "zod/v4";
import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/crypto";
import { getProfile } from "@/lib/profile-store";
import { buildSheet, type FillSheet, type PortalDetails, type RecommenderRow, type SheetEssay } from "@/lib/fillsheet";
import { mapByRules, resolve, keyMenu, bestOption, type Fill, type PageField } from "@/lib/runner-map";
import { runStructured } from "@/lib/llm";
import { guard } from "@/lib/guard";
import { textPdf } from "@/lib/pdf";

// the extension authenticates with a personal key (Authorization: Bearer amr_...). we keep only its hash.
export async function runnerUser(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!/^amr_[\w-]{20,}$/.test(token)) return null;
  const db = admin();
  const { data } = await db.from("runner_tokens").select("id, user_id").eq("token_hash", sha256(token)).is("revoked_at", null).maybeSingle();
  if (!data) return null;
  await db.from("runner_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data.user_id as string;
}

const NON_ESSAY = new Set(["strategy", "fee_plan", "funding_plan", "video_or_interview"]);

export async function loadApp(userId: string, applicationId: string) {
  const { data } = await admin()
    .from("applications")
    .select("id, status, packet_approved_at, attested_at, portal_url, runner_status, program_id, programs(name, degree, url, app_fee_usd, school_id, schools(name, country)), artifacts(id, kind, title, prompt, current_version, artifact_versions(version, content, user_approved_at))")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function loadSheet(userId: string, applicationId: string): Promise<FillSheet | null> {
  const db = admin();
  const app = await loadApp(userId, applicationId);
  if (!app || !app.packet_approved_at) return null;
  const p = app.programs as unknown as { name: string; degree: string | null; url: string | null; schools: { name: string; country: string | null } };
  type Art = { id: string; kind: string; title: string; prompt: string | null; current_version: number; artifact_versions: { version: number; content: string; user_approved_at: string | null }[] };
  // only the exact versions the applicant approved
  const essays: SheetEssay[] = ((app.artifacts ?? []) as unknown as Art[])
    .filter((a) => !NON_ESSAY.has(a.kind))
    .flatMap((a) => {
      const v = a.artifact_versions.find((x) => x.version === a.current_version && x.user_approved_at);
      return v ? [{ artifact_id: a.id, title: a.title, prompt: a.prompt, kind: a.kind, text: v.content }] : [];
    });
  const [profile, { data: prof }, { data: recs }, { data: docs }, { data: user }, { data: mail }] = await Promise.all([
    getProfile(userId),
    db.from("profiles").select("email, portal_details, target_term").eq("id", userId).single(),
    db.from("recommenders").select("name, email, title, organization, relationship, phone").eq("user_id", userId).order("created_at"),
    db.from("documents").select("id, kind, filename").eq("user_id", userId).eq("status", "extracted").order("created_at"),
    db.auth.admin.getUserById(userId),
    db.from("mail_accounts").select("email, status").eq("user_id", userId).maybeSingle(),
  ]);
  // the target term sometimes lives only on the profile row ("fall-2027"), not in the interview profile
  if (!profile.goals.target_term && prof?.target_term) profile.goals.target_term = prof.target_term;
  return buildSheet({
    applicationId,
    school: p.schools.name,
    program: p.name,
    degree: p.degree,
    portalUrl: app.portal_url ?? p.url,
    attested: !!app.attested_at,
    schoolCountry: p.schools.country,
    // portal accounts use the connected gmail, so the agents can read the portal's verification emails.
    // an email the applicant typed into "details for application forms" still wins.
    accountEmail: (mail?.status === "active" ? mail.email : null) ?? prof?.email ?? user?.user?.email ?? null,
    profile,
    details: (prof?.portal_details ?? {}) as PortalDetails,
    recommenders: (recs ?? []) as RecommenderRow[],
    essays,
    documents: docs ?? [],
  });
}

const ModelMap = z.object({ picks: z.array(z.object({ id: z.string(), key: z.string() })) });

const MAP_SYSTEM = `you map fields on a university application portal to keys in the applicant's fill sheet.
for each field, pick the ONE sheet key whose value answers it, or "" when nothing in the sheet answers it.
rules:
- only keys from the menu. never make up a key or a value.
- dropdowns: pick the key whose value matches one of the options, even when the label words it differently ("application type" or "intake" whose options are terms -> entry_term; "admit type" -> application_type; "program of interest" -> program).
- yes/no questions about the applicant's history, demographics not in the sheet, and anything with no supporting key: "".
- edu1/work1 = most recent; use edu2/work2... when the field is clearly about an earlier entry (e.g. "previous institution").
- essays: pick essay:<id> when a text box or upload clearly asks for that essay.`;

export async function mapFields(userId: string, sheet: FillSheet, fields: PageField[]): Promise<Fill[]> {
  const { fills, unresolved } = mapByRules(fields, sheet);
  if (!unresolved.length) return fills;
  let picks: { id: string; key: string }[] = [];
  try {
    const { output } = await runStructured({
      userId,
      agent: "runner",
      promptVersion: "map-v1",
      tier: "cheap",
      system: MAP_SYSTEM,
      cachePrefix: `fill sheet keys:\n${keyMenu(sheet)}`,
      prompt: `portal fields:\n${unresolved.map((f) => `${f.id} | ${f.type} | ${f.label}${f.options?.length ? ` | options: ${f.options.slice(0, 30).join(" / ")}` : ""}`).join("\n")}`,
      schema: ModelMap,
      maxTokens: 1500,
    });
    picks = output.picks;
  } catch {
    picks = [];
  }
  for (const f of unresolved) {
    const key = picks.find((p) => p.id === f.id)?.key ?? "";
    const r = key ? resolve(f, key, sheet) : null;
    fills.push(r ?? { id: f.id, action: "skip", reason: "not in your profile" });
  }
  return fills;
}

const Decide = z.object({
  picks: z.array(
    z.object({
      id: z.string(),
      choice: z.enum(["option", "key", "ask"]),
      option: z.string(), // exactly one of the field's options, when choice = option
      key: z.string(), // a fill-sheet key, when choice = key (or the key that supports the option)
      why: z.string(),
    }),
  ),
});

const DECIDE_SYSTEM = `you complete required questions on a university application form for an applicant who has signed their application packet. the rules engine couldn't answer these; you get one careful look before the applicant is bothered.
you have the applicant's whole fill sheet (key: value), the program, and the page.
for each field choose:
- "option": for a dropdown or radio, pick the ONE option (copied exactly from its list) that the sheet supports, and name the supporting key. examples: "Application type" with options "Fall / Automne 2027 / Winter 2028" and entry_term "fall-2027" -> the Fall 2027 option, key entry_term. "Program of study" -> the option naming the program. "Degree level" -> from level/degree. "Country" -> from country or citizenship.
  administrative questions with no fact about the applicant at stake may use key "none": how did you hear about us (pick a neutral web/internet/online option if present, else "other"), preferred contact method (email), campus or delivery mode when only one fits the program, preferred language of correspondence (english, unless the sheet says otherwise).
- "key": for a text box, the ONE sheet key whose value answers it exactly.
- "ask": anything that is a fact about the applicant the sheet doesn't state (criminal record, disciplinary history, disability, health, visa or immigration history, finances, race or ethnicity, religion, family details, prior applications), any legal declaration, or anything you can't support. never guess facts.
never write a value of your own. explain each pick in a few words.`;

// a second look at required fields the rules left empty. the model chooses from the field's own options or picks
// a sheet key; values still come only from the sheet (or, for neutral admin questions, from the page's own list).
export async function decideFields(userId: string, sheet: FillSheet, fields: PageField[], page: { url: string; title: string; body: string }, jobId?: string): Promise<Fill[]> {
  if (!fields.length) return [];
  const values = Object.entries(sheet.fields)
    .map(([k, v]) => `${k}: ${v.length > 160 ? `${v.slice(0, 160)}…` : v}`)
    .join("\n");
  let picks: z.infer<typeof Decide>["picks"] = [];
  try {
    const { output } = await runStructured({
      userId,
      agent: "runner",
      jobId,
      promptVersion: "decide-v1",
      tier: "chat",
      system: DECIDE_SYSTEM,
      cachePrefix: `applying to: ${sheet.program} at ${sheet.school}\n\nfill sheet:\n${values}`,
      prompt: `page: ${page.title} (${page.url})\npage text: ${page.body.slice(0, 1500)}\n\nrequired fields still empty:\n${fields
        .map((f) => `${f.id} | ${f.type} | ${f.label.slice(0, 160)}${f.options?.length ? ` | options: ${f.options.filter((o) => o.trim()).slice(0, 60).join(" / ").slice(0, 1500)}` : ""}`)
        .join("\n")}`,
      schema: Decide,
      maxTokens: 2000,
    });
    picks = output.picks;
  } catch {
    return [];
  }
  const out: Fill[] = [];
  for (const f of fields) {
    const p = picks.find((x) => x.id === f.id);
    if (!p || p.choice === "ask") continue;
    if (p.choice === "option" && (f.type === "select" || f.type === "radio" || f.combo)) {
      // the option must really be one of the field's own (allowing for small spelling differences)
      const opt = (f.options ?? []).find((o) => o.trim() === p.option.trim()) ?? bestOption(p.option, f.options ?? []);
      const backed = p.key === "none" || !!sheet.fields[p.key];
      if (opt && backed) out.push(f.combo && !f.options?.length ? { id: f.id, action: "fill", value: p.option, source: `decide:${p.key}` } : { id: f.id, action: "choose", option: opt, source: `decide:${p.key}` });
      else if (f.combo && backed && p.key !== "none") out.push({ id: f.id, action: "fill", value: sheet.fields[p.key], source: `decide:${p.key}` });
      continue;
    }
    if (p.choice === "key" && p.key) {
      const r = resolve(f, p.key, sheet);
      if (r) out.push({ ...r, source: `decide:${p.key}` } as Fill);
    }
  }
  return out;
}

// may the runner press submit on this application right now?
export async function submitDecision(userId: string, applicationId: string) {
  const app = await loadApp(userId, applicationId);
  if (!app) return { allowed: false, reason: "application not found" };
  if (app.status !== "packet_approved") return { allowed: false, reason: app.status === "submitted" ? "already submitted" : "packet not approved" };
  if (!app.attested_at) return { allowed: false, reason: "approve the packet with the attestation first" };
  const schoolId = (app.programs as unknown as { school_id: string }).school_id;
  const v = await guard(userId, "submit", { agent: "runner", schoolId, packetApproved: true });
  if (v.kind === "allow" || v.kind === "allow_with_undo") return { allowed: true, reason: "packet approved and attested" };
  return { allowed: false, reason: v.kind === "needs_approval" ? "your dial says to ask you before submitting" : v.reason };
}

// the bytes behind a fill-sheet file key: an approved essay as pdf, or one of the applicant's documents
export async function sheetFile(userId: string, sheet: FillSheet, key: string): Promise<{ name: string; mime: string; buffer: Buffer }> {
  const f = sheet.files.find((x) => x.key === key);
  if (!f) throw new Error(`not in the packet: ${key}`);
  if (key.startsWith("essay:")) {
    const e = sheet.essays.find((x) => `essay:${x.artifact_id}` === key)!;
    return { name: f.filename, mime: "application/pdf", buffer: textPdf(e.title, e.text) };
  }
  const docId = new URL(f.url, "http://x").searchParams.get("document")!;
  const db = admin();
  const { data: doc } = await db.from("documents").select("storage_path, filename, mime_type").eq("id", docId).eq("user_id", userId).single();
  const { data: blob, error } = await db.storage.from("documents").download(doc!.storage_path);
  if (error || !blob) throw new Error("couldn't read " + f.label);
  return { name: doc!.filename, mime: doc!.mime_type ?? "application/octet-stream", buffer: Buffer.from(await blob.arrayBuffer()) };
}
