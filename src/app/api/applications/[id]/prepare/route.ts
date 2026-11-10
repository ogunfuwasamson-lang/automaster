import { NextResponse, after, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { drain } from "@/lib/jobs";
import { logEvent } from "@/lib/events";
import { checkLimit } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 300;

// start (or re-run) the strategist for one application: requirements, positioning, then drafts
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = admin();
  const { data: app } = await db.from("applications").select("id, status, program_id").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!["shortlisted", "preparing", "ready_for_review"].includes(app.status)) {
    return NextResponse.json({ error: `can't prepare an application that is ${app.status}` }, { status: 400 });
  }
  const { count } = await db
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("agent", "strategist")
    .in("status", ["queued", "running"])
    .contains("payload", { applicationId: id });
  if (count) return NextResponse.json({ error: "already preparing" }, { status: 409 });

  if (app.status === "shortlisted") {
    const blocked = await checkLimit(auth.user.id, "application");
    if (blocked) return NextResponse.json({ error: blocked }, { status: 402 });
    const { error } = await db.from("applications").update({ status: "preparing" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await enqueue({ userId: auth.user.id, agent: "strategist", task: "plan", payload: { applicationId: id } });
  await logEvent({ userId: auth.user.id, actor: "user", action: "application.prepare_requested", applicationId: id, programId: app.program_id });
  after(() => drain("inline-prepare", 1).catch(() => {}));
  return NextResponse.json({ ok: true });
}
