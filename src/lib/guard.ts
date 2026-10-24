import "server-only";
import { admin } from "@/lib/supabase/admin";
import { decide, type ActionContext, type Capability, type Grant, type Ripcord, type Verdict } from "@/lib/policy";
import { logEvent } from "@/lib/events";

// the auditor in practice: load the user's dial, decide, log the decision, and
// open a one-tap approval when the action needs the user.
export async function guard(
  userId: string,
  capability: Capability,
  ctx: ActionContext,
  approval?: { kind: string; title: string; summary?: string; payload?: Record<string, unknown>; applicationId?: string; urgency?: number },
): Promise<Verdict & { approvalId?: string }> {
  const db = admin();
  const [{ data: grants }, { data: ripcords }] = await Promise.all([
    db.from("grants").select("capability, mode, undo_seconds, ceiling_cents, rate_limit").eq("user_id", userId),
    db.from("ripcords").select("scope_kind, scope_value, active").eq("user_id", userId).eq("active", true),
  ]);
  const verdict = decide(capability, (grants ?? []) as Grant[], (ripcords ?? []) as Ripcord[], ctx);

  let approvalId: string | undefined;
  if (verdict.kind === "needs_approval" && approval) {
    const { data, error } = await db
      .from("approvals")
      .insert({
        user_id: userId,
        kind: approval.kind,
        title: approval.title,
        summary: approval.summary ?? verdict.reason,
        payload: approval.payload ?? {},
        application_id: approval.applicationId ?? null,
        urgency: approval.urgency ?? 0,
        created_by: ctx.agent,
      })
      .select("id")
      .single();
    if (error) throw new Error(`approval insert failed: ${error.message}`);
    approvalId = data.id as string;
  }

  await logEvent({
    userId,
    actor: ctx.agent,
    action: `guard.${verdict.kind}`,
    capability,
    schoolId: ctx.schoolId ?? null,
    applicationId: approval?.applicationId ?? null,
    context: { reason: verdict.reason, approvalId },
  });

  return { ...verdict, approvalId };
}
