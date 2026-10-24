import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";

// reasons a submission stops that the applicant fixes in automaster itself (a missing profile detail, an
// unanswered question, a missing document). when their profile or documents change, the agents pick these
// up again on their own: nobody should have to press "try again" after filling in what was asked.
const FIXABLE_IN_APP = new Set(["question", "missing"]);

export async function resumeAfterProfileChange(userId: string, what: string): Promise<number> {
  const db = admin();
  const { data } = await db
    .from("applications")
    .select("id, runner_status, runner_state, runner_note, runner_updated_at")
    .eq("user_id", userId)
    .eq("status", "packet_approved")
    .in("runner_status", ["needs_you", "failed"]);
  let n = 0;
  for (const a of data ?? []) {
    const st = (a.runner_state ?? {}) as { reason?: string; missing?: string[]; last_url?: string };
    const fixable = FIXABLE_IN_APP.has(st.reason ?? "") || (st.missing?.length ?? 0) > 0 || /in profile|your profile|upload it|add your|doesn't cover/i.test(a.runner_note ?? "");
    if (!fixable) continue;
    // keep where the portal was and the session cookies; forget what was missing so it's checked fresh
    await db
      .from("applications")
      .update({
        runner_status: "ready",
        runner_note: "picking up your profile update",
        runner_state: { ...st, missing: [], questions: [], samePageCount: 0, reason: null, rechecks: 0 },
        runner_updated_at: new Date().toISOString(),
      })
      .eq("id", a.id);
    await enqueue({ userId, agent: "runner", task: "run", payload: { applicationId: a.id } });
    await logEvent({ userId, actor: "system", action: "runner.resumed", applicationId: a.id, context: { after: what } });
    n++;
  }
  return n;
}

// the safety net, run by the worker: a stopped submission that profile changes could fix, where the profile or
// documents changed after it stopped, is picked up again even if no save path called resumeAfterProfileChange.
export async function sweepResumable(): Promise<number> {
  const db = admin();
  const { data: apps } = await db
    .from("applications")
    .select("id, user_id, runner_state, runner_note, runner_updated_at")
    .eq("status", "packet_approved")
    .eq("runner_status", "needs_you")
    .limit(500);
  const users = [...new Set((apps ?? []).map((a) => a.user_id as string))];
  if (!users.length) return 0;
  const [{ data: profs }, { data: docs }] = await Promise.all([
    db.from("profiles").select("id, updated_at").in("id", users),
    db.from("documents").select("user_id, created_at").in("user_id", users).order("created_at", { ascending: false }).limit(2000),
  ]);
  const changed = new Map<string, string>();
  for (const p of profs ?? []) changed.set(p.id, p.updated_at);
  for (const d of docs ?? []) if ((changed.get(d.user_id) ?? "") < d.created_at) changed.set(d.user_id, d.created_at);
  let n = 0;
  for (const u of users) {
    const stale = (apps ?? []).some((a) => a.user_id === u && (changed.get(u) ?? "") > (a.runner_updated_at ?? ""));
    if (stale) n += await resumeAfterProfileChange(u, "sweep");
  }
  return n;
}
