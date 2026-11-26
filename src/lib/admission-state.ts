import "server-only";
import { admin } from "@/lib/supabase/admin";
import { canReadMail } from "@/lib/gmail";
import { enqueue } from "@/lib/queue";
import { VERIFIED } from "@/lib/admission-rules";

// where an application's admission stands for the applicant: confirmed (and from what), or waiting on their inbox
// or their letter (agents/admission)
export type AdmissionState = { verified: boolean; source: string | null; mail: boolean; busy: boolean };

export async function admissionState(userId: string, applicationId: string): Promise<AdmissionState> {
  const db = admin();
  const [{ data: out }, mail, { count }] = await Promise.all([
    db.from("outcomes").select("source").eq("application_id", applicationId).eq("label", VERIFIED).limit(1).maybeSingle(),
    canReadMail(userId).catch(() => false),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("agent", "admission").in("status", ["queued", "running"]),
  ]);
  return { verified: !!out, source: (out?.source as string) ?? null, mail, busy: (count ?? 0) > 0 };
}

// applications marked admitted with nothing backing them yet: checked again once the inbox is connected
export async function recheckAdmissions(userId: string): Promise<number> {
  const db = admin();
  const { data: apps } = await db.from("applications").select("id").eq("user_id", userId).eq("status", "admitted");
  if (!apps?.length) return 0;
  const { data: done } = await db.from("outcomes").select("application_id").eq("user_id", userId).eq("label", VERIFIED);
  const ok = new Set((done ?? []).map((d) => d.application_id as string));
  let n = 0;
  for (const a of apps) {
    if (ok.has(a.id as string)) continue;
    await enqueue({ userId, agent: "admission", task: "check", payload: { applicationId: a.id }, idempotencyKey: `admission-check:${a.id}:mail-${Date.now()}` });
    n++;
  }
  return n;
}
