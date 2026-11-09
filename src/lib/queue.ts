import "server-only";
import { admin } from "@/lib/supabase/admin";

// enqueue lives apart from the worker so agents can queue follow-up work
// without importing the handler registry (which imports the agents: a cycle).
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


// another portal run is working on this application right now (a fresh lock): two browsers on one portal account
// would fight over it, so a second run steps aside
export async function otherRunActive(applicationId: string, exceptJobId: string): Promise<boolean> {
  const { data } = await admin()
    .from("jobs")
    .select("id")
    .eq("agent", "runner")
    .eq("task", "run")
    .eq("status", "running")
    .neq("id", exceptJobId)
    .gt("locked_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .contains("payload", { applicationId })
    .limit(1);
  return !!data?.length;
}
