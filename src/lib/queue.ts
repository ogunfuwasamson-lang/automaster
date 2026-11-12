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
  created_at?: string; // claimed jobs carry the whole row
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

// another of this applicant's applications is being worked on the same portal right now (two programs at one school,
// an application and a scholarship on one Slate site). one portal account, one browser at a time: signing in
// twice ends the other session
export async function otherRunOnPortal(userId: string, portalUrl: string | null, exceptApplicationId: string, exceptJobId: string): Promise<boolean> {
  const root = (u: string | null | undefined) => {
    try {
      return u ? new URL(u).hostname.replace(/^www\./, "").split(".").slice(-2).join(".") : "";
    } catch {
      return "";
    }
  };
  const mine = root(portalUrl);
  if (!mine) return false;
  const db = admin();
  const { data: jobs } = await db
    .from("jobs")
    .select("payload")
    .eq("user_id", userId)
    .eq("agent", "runner")
    .eq("task", "run")
    .eq("status", "running")
    .neq("id", exceptJobId)
    .gt("locked_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .limit(10);
  const ids = (jobs ?? []).map((j) => (j.payload as { applicationId?: string })?.applicationId).filter((x): x is string => !!x && x !== exceptApplicationId);
  if (!ids.length) return false;
  const { data: apps } = await db.from("applications").select("portal_url, runner_state").in("id", ids);
  return (apps ?? []).some((a) => root(a.portal_url as string | null) === mine || root((a.runner_state as { last_url?: string } | null)?.last_url) === mine);
}
