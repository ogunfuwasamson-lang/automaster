import "server-only";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { HANDLERS } from "@/agents";
import { nextMonthStartUTC } from "@/lib/pricing";

export { enqueue } from "@/lib/queue";
export type { Job } from "@/lib/queue";
import type { Job } from "@/lib/queue";


// claim and run due jobs. backoff on failure: 1m, 5m, 25m.
export async function drain(worker: string, max = 5) {
  const db = admin();
  const { data: jobs, error } = await db.rpc("claim_jobs", { worker, max_jobs: max });
  if (error) throw new Error(`claim_jobs failed: ${error.message}`);

  // run claimed jobs in parallel so one slow agent call doesn't push the rest past the function timeout
  return Promise.all(((jobs ?? []) as Job[]).map((job) => runOne(job)));
}

async function runOne(job: Job): Promise<{ id: string; ok: boolean; error?: string }> {
  const db = admin();
  const handler = HANDLERS[`${job.agent}.${job.task}`];
  try {
    if (!handler) throw new Error(`no handler for ${job.agent}.${job.task}`);
    // the stop button: a pulled "all" or per-agent ripcord holds agent work (the digest still runs)
    if (job.agent !== "system") {
      const { data: cords } = await db.from("ripcords").select("scope_kind, scope_value").eq("user_id", job.user_id).eq("active", true);
      if ((cords ?? []).some((c) => c.scope_kind === "all" || (c.scope_kind === "agent" && c.scope_value === job.agent))) {
        await db.from("jobs").update({ status: "cancelled", last_error: "paused by you", finished_at: new Date().toISOString() }).eq("id", job.id);
        return { id: job.id, ok: false, error: "paused" };
      }
    }
    const result = await handler(job);
    await db
      .from("jobs")
      .update({ status: "done", result: result ?? null, finished_at: new Date().toISOString(), last_error: null })
      .eq("id", job.id);
    return { id: job.id, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // the user's monthly ai budget is used up: park until the month resets (or their plan changes)
    if (msg.startsWith("budget:")) {
      await db
        .from("jobs")
        .update({
          status: "queued",
          attempts: Math.max(0, job.attempts - 1),
          last_error: msg,
          run_at: nextMonthStartUTC(),
          locked_at: null,
          locked_by: null,
        })
        .eq("id", job.id);
      return { id: job.id, ok: false, error: msg };
    }
    // out of api credit: not the job's fault. park it for 30 minutes without spending an attempt.
    if (isBillingError(msg)) {
      await db
        .from("jobs")
        .update({
          status: "queued",
          attempts: Math.max(0, job.attempts - 1),
          last_error: msg,
          run_at: new Date(Date.now() + 30 * 60_000).toISOString(),
          locked_at: null,
          locked_by: null,
        })
        .eq("id", job.id);
      return { id: job.id, ok: false, error: "billing: waiting for api credit" };
    }
    const dead = job.attempts >= job.max_attempts;
    await db
      .from("jobs")
      .update({
        status: dead ? "failed" : "queued",
        last_error: msg,
        run_at: new Date(Date.now() + 60_000 * 5 ** (job.attempts - 1)).toISOString(),
        locked_at: null,
        locked_by: null,
        finished_at: dead ? new Date().toISOString() : null,
      })
      .eq("id", job.id);
    if (dead) {
      await logEvent({
        userId: job.user_id,
        actor: "system",
        action: "job.failed",
        context: { jobId: job.id, agent: job.agent, task: job.task, error: msg },
      });
    }
    return { id: job.id, ok: false, error: msg };
  }
}

export function isBillingError(msg: string): boolean {
  return /credit balance is too low|billing|insufficient.?credit|payment required/i.test(msg);
}
