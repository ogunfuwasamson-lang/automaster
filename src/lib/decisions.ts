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
  if (decision === "admitted") await enqueue({ userId, agent: "closer", task: "funding_plan", payload: { applicationId } });
  return { ok: true };
}
