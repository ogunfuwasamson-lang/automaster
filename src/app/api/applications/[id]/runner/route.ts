import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { queueRunner } from "@/agents/runner";
import { after } from "next/server";

export const runtime = "nodejs";

const Body = z.object({ action: z.enum(["queue", "stop", "chrome", "cloud"]), portal_url: z.string().url().max(1000).optional(), find_portal_again: z.boolean().optional() });

// the applicant queues (or stops) the runner for one approved application
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "check the portal link" }, { status: 400 });
  const { id } = await ctx.params;
  const db = admin();
  const { data: app } = await db.from("applications").select("status, attested_at").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (parsed.data.action === "chrome") {
    // run it in the applicant's own chrome: the extension picks it up (straight away if the page asks it to)
    if (app.status !== "packet_approved") return NextResponse.json({ error: "approve the packet first" }, { status: 400 });
    const { data: cur } = await db.from("applications").select("runner_state").eq("id", id).single();
    const st = (cur?.runner_state ?? {}) as Record<string, unknown>;
    await db
      .from("applications")
      .update({ runner_mode: "extension", runner_status: "ready", runner_note: "queued for your Chrome", runner_state: { ...st, reason: null, rechecks: 0, samePageCount: 0, resume_at: null }, runner_live_url: null, runner_session_id: null, runner_updated_at: new Date().toISOString() })
      .eq("id", id);
    await db.from("jobs").update({ status: "cancelled", last_error: "moved to the applicant's chrome" }).eq("user_id", auth.user.id).eq("agent", "runner").eq("status", "queued").contains("payload", { applicationId: id });
    await logEvent({ userId: auth.user.id, actor: "user", action: "runner.moved_to_chrome", applicationId: id });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "cloud") {
    if (app.status !== "packet_approved") return NextResponse.json({ error: "approve the packet first" }, { status: 400 });
    await db.from("applications").update({ runner_mode: "cloud" }).eq("id", id);
    await queueRunner(auth.user.id, id);
    after(() => fetch(`${req.nextUrl.origin}/api/runner/work`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(8000) }).then(() => undefined, () => undefined));
    await logEvent({ userId: auth.user.id, actor: "user", action: "runner.queued", applicationId: id });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "queue") {
    if (app.status !== "packet_approved") return NextResponse.json({ error: "approve the packet first" }, { status: 400 });
    if (parsed.data.portal_url && !/^https:\/\//.test(parsed.data.portal_url)) return NextResponse.json({ error: "portal link must start with https://" }, { status: 400 });
    if (parsed.data.portal_url) await db.from("applications").update({ portal_url: parsed.data.portal_url }).eq("id", id);
    else if (parsed.data.find_portal_again) await db.from("applications").update({ portal_url: null }).eq("id", id);
    await queueRunner(auth.user.id, id);
    after(() => fetch(`${req.nextUrl.origin}/api/runner/work`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(8000) }).then(() => undefined, () => undefined));
  } else {
    await db.from("applications").update({ runner_status: "idle", runner_note: "stopped by you", runner_live_url: null, runner_updated_at: new Date().toISOString() }).eq("id", id);
    await db.from("jobs").update({ status: "cancelled", last_error: "stopped by you" }).eq("user_id", auth.user.id).eq("agent", "runner").eq("status", "queued").contains("payload", { applicationId: id });
  }
  await logEvent({ userId: auth.user.id, actor: "user", action: parsed.data.action === "queue" ? "runner.queued" : "runner.stopped", applicationId: id });
  return NextResponse.json({ ok: true });
}
