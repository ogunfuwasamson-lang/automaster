import "server-only";
import * as z from "zod/v4";
import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/crypto";
import { getProfile } from "@/lib/profile-store";
import { buildSheet, type FillSheet, type PortalDetails, type RecommenderRow, type SheetEssay } from "@/lib/fillsheet";
import { mapByRules, resolve, keyMenu, type Fill, type PageField } from "@/lib/runner-map";
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
- yes/no questions, preferences, demographics not in the sheet, and anything you're unsure about: "".
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
