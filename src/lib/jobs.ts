import "server-only";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { HANDLERS } from "@/agents";

export interface Job {
  id: string;
  user_id: string;
  agent: string;
  task: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

export async function enqueue(j: {
  userId: string;
  agent: string;
  task: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  idempotencyKey?: string;
  parentJobId?: string;
}) {
  const { data, error } = await admin()
    .from("jobs")
    .upsert(
      {
        user_id: j.userId,
        agent: j.agent,
        task: j.task,
        payload: j.payload ?? {},
        run_at: (j.runAt ?? new Date()).toISOString(),
        idempotency_key: j.idempotencyKey ?? null,
        parent_job_id: j.parentJobId ?? null,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`enqueue failed: ${error.message}`);
  return data?.id as string | undefined;
}

// claim and run due jobs. backoff on failure: 1m, 5m, 25m.
export async function drain(worker: string, max = 5) {
  const db = admin();
  const { data: jobs, error } = await db.rpc("claim_jobs", { worker, max_jobs: max });
  if (error) throw new Error(`claim_jobs failed: ${error.message}`);

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const job of (jobs ?? []) as Job[]) {
    const handler = HANDLERS[`${job.agent}.${job.task}`];
    try {
      if (!handler) throw new Error(`no handler for ${job.agent}.${job.task}`);
      const result = await handler(job);
      await db
        .from("jobs")
        .update({ status: "done", result: result ?? null, finished_at: new Date().toISOString(), last_error: null })
        .eq("id", job.id);
      results.push({ id: job.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
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
      results.push({ id: job.id, ok: false, error: msg });
    }
  }
  return results;
}
