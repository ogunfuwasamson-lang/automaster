import { NextResponse, after } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { drain } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { count } = await admin()
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("agent", "recon")
    .eq("task", "scholarships")
    .in("status", ["queued", "running"]);
  if (count) return NextResponse.json({ error: "already hunting" }, { status: 409 });
  await enqueue({ userId: auth.user.id, agent: "recon", task: "scholarships" });
  after(() => drain("inline-scholarships", 1).catch(() => {}));
  return NextResponse.json({ ok: true });
}
