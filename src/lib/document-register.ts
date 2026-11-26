import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/jobs";
import { releaseHeld } from "@/lib/credit";
import { logEvent } from "@/lib/events";
import { resumeAfterProfileChange } from "@/lib/requeue";
import { resolve } from "@/lib/notify";
import { qualifyAccount } from "@/lib/creators";

// a file now in the applicant's storage becomes a document the agents read: from the website's uploader
// (api/documents) and from WhatsApp (lib/whatsapp-onboard). an admission letter is read for the offer, anything else
// for profile facts (agents/intake, which also files an unlabelled one under what it turns out to be)
export async function registerDocument(
  uid: string,
  d: { id: string; kind: string; filename: string; storagePath: string; mime: string; applicationId?: string },
  via: "web" | "whatsapp" = "web",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = admin();
  const { error } = await db.from("documents").insert({ id: d.id, user_id: uid, kind: d.kind, filename: d.filename, storage_path: d.storagePath, mime_type: d.mime });
  if (error) return { ok: false, error: error.message };
  await logEvent({ userId: uid, actor: "user", action: "document.uploaded", ...(via === "whatsapp" ? { channel: "whatsapp" } : {}), context: { documentId: d.id, kind: d.kind, filename: d.filename } });
  if (d.kind === "admission_letter")
    await enqueue({ userId: uid, agent: "admission", task: "read_letter", payload: { documentId: d.id, applicationId: d.applicationId }, idempotencyKey: `admission-letter:${d.id}` });
  else await enqueue({ userId: uid, agent: "intake", task: "extract", payload: { documentId: d.id }, idempotencyKey: `extract:${d.id}` });
  await releaseHeld(uid).catch(() => {}); // a serious account now: work held for starters goes
  // a new document can be exactly what a stopped submission was waiting for
  await resumeAfterProfileChange(uid, `document:${d.kind}`).catch(() => 0);
  await resolve(uid, `setup:${d.kind}`).catch(() => {});
  // a CV can be the last step for an account a creator brought in (lib/creators)
  if (d.kind === "cv") await qualifyAccount(uid).catch(() => false);
  return { ok: true };
}
