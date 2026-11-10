import "server-only";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { notify } from "@/lib/notify";
import { dueBucket, essaysReady, type PieceState } from "@/lib/writing";

// the writing agents are done with an application: say so. the status moves to "ready for you" (it used to stay
// on "agents are preparing it" forever) and the applicant gets a notice and one email with the deadline.
// returns true when it moved.
export async function markReadyForReview(userId: string, applicationId: string, opts: { email?: boolean } = {}): Promise<boolean> {
  const db = admin();
  const { data: app } = await db.from("applications").select("id, status, target_deadline, program_id, programs(name, schools(name))").eq("id", applicationId).eq("user_id", userId).maybeSingle();
  if (!app || app.status !== "preparing") return false;
  const { data: arts } = await db.from("artifacts").select("kind, current_version, artifact_versions(version, author, critique)").eq("application_id", applicationId);
  const pieces: PieceState[] = (arts ?? []).map((a) => ({
    kind: a.kind as string,
    current_version: (a.current_version as number) ?? 0,
    versions: ((a.artifact_versions ?? []) as { version: number; author: string | null; critique: { status?: string } | null }[]).map((v) => ({ version: v.version, author: v.author, status: v.critique?.status ?? null })),
  }));
  if (!essaysReady(pieces)) return false;
  const { data: moved } = await db.from("applications").update({ status: "ready_for_review" }).eq("id", applicationId).eq("status", "preparing").select("id");
  if (!moved?.length) return false;
  const p = app.programs as unknown as { name: string; schools: { name: string } };
  const days = app.target_deadline ? Math.ceil((Date.parse(app.target_deadline as string) - Date.now()) / 86_400_000) : null;
  await notify({
    userId,
    key: `review:${applicationId}`,
    kind: "reminder",
    urgent: true,
    title: `${p.schools.name}: your application is ready for your review`,
    body: `The essays for ${p.name} are drafted and fact-checked. Read them, make them yours, then approve and sign so the agents can submit.${days != null && days >= 0 ? ` Deadline: ${app.target_deadline} (${days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} left`}).` : ""}`,
    href: `/applications/${applicationId}`,
    actionLabel: "Review and sign",
    email: opts.email !== false,
  }).catch(() => {});
  await logEvent({ userId, actor: "system", action: "application.ready_for_review", applicationId, programId: app.program_id as string, context: { deadline: app.target_deadline, days_left: days } });
  return true;
}

// applications waiting on the applicant with a deadline close by: one reminder a week out, three days out and the
// day before. called every few minutes; the notice key makes each one go out once
export async function nudgeReviews(): Promise<number> {
  const db = admin();
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await db.from("applications").select("id, user_id, target_deadline, programs(name, schools(name))").eq("status", "ready_for_review").gte("target_deadline", today).lte("target_deadline", week).limit(300);
  let n = 0;
  for (const a of data ?? []) {
    const days = Math.ceil((Date.parse(a.target_deadline as string) - Date.now()) / 86_400_000);
    const bucket = dueBucket(days);
    if (!bucket) continue;
    const p = a.programs as unknown as { name: string; schools: { name: string } };
    await notify({
      userId: a.user_id as string,
      key: `review-due:${a.id}:${bucket}`,
      kind: "reminder",
      urgent: true,
      title: `${p.schools.name} closes ${days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}: it's waiting for your sign-off`,
      body: `Everything for ${p.name} is ready. Review the essays and sign, and the agents submit it before ${a.target_deadline}.`,
      href: `/applications/${a.id}`,
      actionLabel: "Review and sign",
      email: true,
    }).catch(() => {});
    n++;
  }
  return n;
}
