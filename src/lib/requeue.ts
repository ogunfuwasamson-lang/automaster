import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";

// reasons a submission stops that the applicant fixes in Ivyward itself (a missing profile detail, an
// unanswered question, a missing document). when their profile or documents change, the agents pick these
// up again on their own: nobody should have to press "try again" after filling in what was asked.
// "stuck" (the agents couldn't find their way on a page) is not one of them: no profile change moves a page the
// agents can't navigate, and restarting those on every profile save looped one portal 475 times in nine days
const FIXABLE_IN_APP = new Set(["question", "missing"]);
// automatic restarts per application per day, whatever triggers them
export const AUTO_RESUMES_PER_DAY = 3;

export function autoResumeAllowed(st: { autoResumes?: { day: string; n: number } }, now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  return !st.autoResumes || st.autoResumes.day !== day || st.autoResumes.n < AUTO_RESUMES_PER_DAY;
}
export function countAutoResume(st: { autoResumes?: { day: string; n: number } }, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return { day, n: st.autoResumes?.day === day ? st.autoResumes.n + 1 : 1 };
}

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
    const st = (a.runner_state ?? {}) as { reason?: string; missing?: string[]; last_url?: string; autoResumes?: { day: string; n: number } };
    const fixable = FIXABLE_IN_APP.has(st.reason ?? "") || (st.missing?.length ?? 0) > 0 || /in profile|your profile|upload it|add your|doesn't cover/i.test(a.runner_note ?? "");
    if (!fixable || !autoResumeAllowed(st)) continue;
    // keep where the portal was and the session cookies; forget what was missing so it's checked fresh
    await db
      .from("applications")
      .update({
        runner_status: "ready",
        runner_note: "picking up your profile update",
        runner_state: { ...st, missing: [], questions: [], samePageCount: 0, reason: null, rechecks: 0, autoResumes: countAutoResume(st) },
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

// the other safety net: an application marked ready for the cloud runner with no runner job behind it. this
// happens when the job was cancelled while the agents were paused ("Pause all") and nothing queued it again.
// skipped while that applicant's agents are still paused.
export async function sweepOrphans(): Promise<number> {
  const db = admin();
  const before = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: apps } = await db
    .from("applications")
    .select("id, user_id")
    .eq("status", "packet_approved")
    .eq("runner_status", "ready")
    .eq("runner_mode", "cloud")
    .lt("runner_updated_at", before)
    .limit(200);
  if (!apps?.length) return 0;
  const users = [...new Set(apps.map((a) => a.user_id as string))];
  const [{ data: cords }, { data: open }] = await Promise.all([
    db.from("ripcords").select("user_id, scope_kind, scope_value").in("user_id", users).eq("active", true),
    db.from("jobs").select("payload").eq("agent", "runner").in("status", ["queued", "running"]).in("user_id", users).limit(2000),
  ]);
  const paused = new Set((cords ?? []).filter((c) => c.scope_kind === "all" || (c.scope_kind === "agent" && c.scope_value === "runner")).map((c) => c.user_id as string));
  const busy = new Set((open ?? []).map((j) => (j.payload as { applicationId?: string })?.applicationId).filter(Boolean));
  let n = 0;
  for (const a of apps) {
    if (paused.has(a.user_id) || busy.has(a.id)) continue;
    await enqueue({ userId: a.user_id, agent: "runner", task: "run", payload: { applicationId: a.id } });
    await logEvent({ userId: a.user_id, actor: "system", action: "runner.requeued", applicationId: a.id, context: { why: "ready with no job" } });
    n++;
  }
  return n;
}

// "Resume" after "Pause all": put back the agent work the pause cancelled (portal runs are covered by sweepOrphans).
// `since`: a little before the pause, since the jobs it cancelled were queued earlier
export async function requeueAfterPause(userId: string, since: string): Promise<number> {
  const db = admin();
  const { data: jobs } = await db
    .from("jobs")
    .select("agent, task, payload, last_error")
    .eq("user_id", userId)
    .eq("status", "cancelled")
    .neq("agent", "runner")
    .neq("task", "digest")
    .gte("created_at", since)
    .or("last_error.is.null,last_error.eq.paused by you")
    .limit(200);
  const seen = new Set<string>();
  let n = 0;
  for (const j of jobs ?? []) {
    const k = `${j.agent}.${j.task}:${JSON.stringify(j.payload)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    await enqueue({ userId, agent: j.agent, task: j.task, payload: (j.payload as Record<string, unknown>) ?? {} });
    n++;
  }
  return n;
}
