import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { queueRunner } from "@/agents/runner";
import { enqueue } from "@/lib/queue";
import { after } from "next/server";

export const runtime = "nodejs";

const Body = z.object({ action: z.enum(["queue", "stop", "chrome", "cloud", "pause", "resume", "cancel"]), portal_url: z.string().url().max(1000).optional(), find_portal_again: z.boolean().optional() });

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
  // pause keeps every bit of progress (portal page, cookies, account); cancel throws the submission progress away.
  // either way the agents stop within seconds: running engines check for it between steps.
  if (parsed.data.action === "pause" || parsed.data.action === "cancel" || parsed.data.action === "stop") {
    const pause = parsed.data.action === "pause";
    const { data: cur } = await db.from("applications").select("runner_state, runner_status").eq("id", id).single();
    if (cur?.runner_status === "submitted") return NextResponse.json({ error: "already submitted" }, { status: 400 });
    const st = (cur?.runner_state ?? {}) as Record<string, unknown>;
    await db
      .from("applications")
      .update({
        runner_status: "idle",
        runner_note: pause ? "paused by you" : "cancelled by you",
        runner_state: pause ? { ...st, paused: true, resume_at: null } : {},
        ...(pause ? {} : { runner_mode: "cloud" }),
        runner_live_url: null,
        runner_session_id: null,
        runner_updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    await db.from("jobs").update({ status: "cancelled", last_error: pause ? "paused by you" : "cancelled by you" }).eq("user_id", auth.user.id).eq("agent", "runner").eq("status", "queued").contains("payload", { applicationId: id });
    // close any live browser on it
    const { data: live } = await db.from("live_sessions").select("id").eq("application_id", id).neq("status", "ended");
    if (live?.length) await db.from("live_inputs").insert(live.map((l) => ({ session_id: l.id, kind: "control", data: { action: "end" } })));
    await logEvent({ userId: auth.user.id, actor: "user", action: pause ? "runner.paused" : "runner.cancelled", applicationId: id });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "resume") {
    if (app.status !== "packet_approved") return NextResponse.json({ error: "approve the packet first" }, { status: 400 });
    const { data: cur } = await db.from("applications").select("runner_state, runner_mode").eq("id", id).single();
    const st = (cur?.runner_state ?? {}) as Record<string, unknown>;
    await db
      .from("applications")
      .update({ runner_status: "ready", runner_note: "resuming where it stopped", runner_state: { ...st, paused: false, samePageCount: 0, rechecks: 0 }, runner_updated_at: new Date().toISOString() })
      .eq("id", id);
    if (cur?.runner_mode !== "extension") {
      await enqueue({ userId: auth.user.id, agent: "runner", task: "run", payload: { applicationId: id } });
      after(() => fetch(`${req.nextUrl.origin}/api/runner/work`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(8000) }).then(() => undefined, () => undefined));
    }
    await logEvent({ userId: auth.user.id, actor: "user", action: "runner.resumed", applicationId: id });
    return NextResponse.json({ ok: true, mode: cur?.runner_mode ?? "cloud" });
  }
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
    const { data: cur } = await db.from("applications").select("portal_url").eq("id", id).single();
    const changed = (!!parsed.data.portal_url && parsed.data.portal_url !== cur?.portal_url) || !!parsed.data.find_portal_again;
    if (parsed.data.portal_url) await db.from("applications").update({ portal_url: parsed.data.portal_url }).eq("id", id);
    else if (parsed.data.find_portal_again) await db.from("applications").update({ portal_url: null }).eq("id", id);
    // same portal: carry on from where it stopped, signed in. a new portal link: start from that link
    await queueRunner(auth.user.id, id, { fresh: changed });
    after(() => fetch(`${req.nextUrl.origin}/api/runner/work`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(8000) }).then(() => undefined, () => undefined));
  }
  await logEvent({ userId: auth.user.id, actor: "user", action: "runner.queued", applicationId: id });
  return NextResponse.json({ ok: true });
}
