import "server-only";
import { admin } from "@/lib/supabase/admin";

// every agent_runs row since a date. supabase returns at most 1,000 rows a request whatever .limit() says,
// so anything that adds up spend pages through: a busy month has thousands of calls.
export async function runsSince<T = Record<string, unknown>>(cols: string, since: string, userId?: string): Promise<T[]> {
  const db = admin();
  const out: T[] = [];
  for (let from = 0; from < 500_000; from += 1000) {
    let q = db.from("agent_runs").select(cols).gte("started_at", since).order("id").range(from, from + 999);
    if (userId) q = q.eq("user_id", userId);
    const { data, error } = await q;
    if (error) throw new Error(`agent_runs: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}
