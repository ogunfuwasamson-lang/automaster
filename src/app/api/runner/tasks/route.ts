import { NextResponse, type NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { runnerUser } from "@/lib/runner";

export const runtime = "nodejs";

// what the extension should work on: approved packets queued for the runner
export async function GET(req: NextRequest) {
  const uid = await runnerUser(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = admin();
  const [{ data }, { data: cords }] = await Promise.all([
    db
      .from("applications")
      .select("id, status, runner_status, runner_note, portal_url, attested_at, target_deadline, programs(name, url, app_fee_usd, schools(name))")
      .eq("user_id", uid)
      .eq("status", "packet_approved")
      .in("runner_status", ["ready", "running", "needs_you", "failed"])
      .order("target_deadline", { ascending: true, nullsFirst: false }),
    db.from("ripcords").select("scope_kind").eq("user_id", uid).eq("active", true),
  ]);
  const paused = (cords ?? []).some((c) => c.scope_kind === "all" || c.scope_kind === "agent");
  return NextResponse.json({
    paused,
    tasks: (data ?? []).map((a) => {
      const p = a.programs as unknown as { name: string; url: string | null; app_fee_usd: number | null; schools: { name: string } };
      return {
        id: a.id,
        school: p.schools.name,
        program: p.name,
        portal_url: a.portal_url ?? p.url,
        runner_status: a.runner_status,
        note: a.runner_note,
        fee_usd: p.app_fee_usd,
        attested: !!a.attested_at,
        deadline: a.target_deadline,
      };
    }),
  });
}
