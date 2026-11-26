import "server-only";
import { admin } from "@/lib/supabase/admin";
import { logEvent, recordOutcome } from "@/lib/events";
import { enqueue } from "@/lib/queue";
import { canTransition, type AppStatus } from "@/lib/app-state";

export type Decision = "interview" | "admitted" | "waitlisted" | "rejected";

// records what a school decided. used by the applicant's own "record decision" and by a confirmed school email.
export async function recordDecision(
  userId: string,
  applicationId: string,
  decision: Decision,
  aidIn?: { amount_usd?: number; note?: string; accept_by?: string | null },
  source: "user" | "inbox" = "user",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = admin();
  const { data: app } = await db.from("applications").select("status, program_id").eq("id", applicationId).eq("user_id", userId).maybeSingle();
  if (!app) return { ok: false, error: "not found" };
  let status = app.status as AppStatus;
  const move = async (to: AppStatus, extra: Record<string, unknown> = {}) => {
    const { error } = await db.from("applications").update({ status: to, ...extra }).eq("id", applicationId);
    if (error) throw new Error(error.message);
    status = to;
  };
  if (!canTransition(status, decision)) {
    if (status === "submitted" && canTransition("under_review", decision)) await move("under_review");
    else return { ok: false, error: `can't record ${decision} on an application that is ${status}` };
  }
  const aid = decision === "admitted" ? { amount_usd: aidIn?.amount_usd ?? 0, note: aidIn?.note ?? "", accept_by: aidIn?.accept_by ?? null } : null;
  await move(decision, { decision, decision_at: new Date().toISOString(), ...(aid ? { aid_offered: aid } : {}) });
  await logEvent({ userId, actor: "user", action: `decision.${decision}`, applicationId, programId: app.program_id, context: { ...(aid ?? {}), source } });
  await recordOutcome({ userId, applicationId, kind: decision === "interview" ? "proxy" : "final", label: decision, value: aid?.amount_usd, source });
  if (decision === "admitted") {
    // the school's own email said so (the inbox watcher): that backs it. said by the applicant: their inbox is
    // searched, or they're asked for the letter (agents/admission)
    if (source === "inbox") {
      const { VERIFIED, afterAdmit, isVerified } = await import("@/agents/admission");
      if (!(await isVerified(applicationId))) {
        await recordOutcome({ userId, applicationId, kind: "final", label: VERIFIED, value: aid?.amount_usd || undefined, source: "mail" });
        await logEvent({ userId, actor: "agent:inbox", action: "admission.verified", applicationId, programId: app.program_id, context: { source: "mail" } });
        await afterAdmit(userId, applicationId);
      }
    } else await enqueue({ userId, agent: "admission", task: "check", payload: { applicationId }, idempotencyKey: `admission-check:${applicationId}:${Date.now()}` });
  }
  return { ok: true };
}
