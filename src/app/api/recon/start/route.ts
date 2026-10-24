import { NextResponse, after } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { drain } from "@/lib/jobs";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 300;

// kicks off a recon run: discover candidates, then one research job per program
export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = auth.user.id;

  const { count } = await admin()
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("agent", "recon")
    .neq("task", "scholarships")
    .in("status", ["queued", "running"]);
  if (count) return NextResponse.json({ error: "a recon run is already going" }, { status: 409 });

  await enqueue({ userId: uid, agent: "recon", task: "discover" });
  await logEvent({ userId: uid, actor: "user", action: "recon.requested" });
  after(() => drain("inline-recon", 1).catch(() => {}));
  return NextResponse.json({ ok: true });
}
