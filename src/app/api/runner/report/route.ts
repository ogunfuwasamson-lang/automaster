import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { loadApp, runnerUser } from "@/lib/runner";
import { logEvent, recordOutcome } from "@/lib/events";

export const runtime = "nodejs";

const Body = z.object({
  application: z.string().uuid(),
  status: z.enum(["running", "needs_you", "submitted", "failed"]),
  note: z.string().max(300).optional(),
  url: z.string().max(1000).optional(),
  filled: z.number().int().min(0).max(1000).optional(),
});

// progress from the extension. "submitted" is only accepted when the portal showed a confirmation.
export async function POST(req: NextRequest) {
  const uid = await runnerUser(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const b = parsed.data;
  const app = await loadApp(uid, b.application);
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = admin();
  const now = new Date().toISOString();

  if (b.status === "submitted") {
    if (app.status === "submitted") return NextResponse.json({ ok: true });
    // the db refuses this unless the packet was approved by the applicant
    const { error } = await db.from("applications").update({ status: "submitted", runner_status: "submitted", runner_note: b.note ?? "submitted through the portal", runner_updated_at: now }).eq("id", b.application);
    if (error) return NextResponse.json({ error: "can't mark submitted: " + error.message }, { status: 400 });
    const eventId = await logEvent({ userId: uid, actor: "agent:runner", action: "runner.submitted", applicationId: b.application, programId: app.program_id, channel: "portal", context: { url: b.url ?? null } });
    await logEvent({ userId: uid, actor: "agent:runner", action: "application.submitted", applicationId: b.application, programId: app.program_id, channel: "portal" });
    await recordOutcome({ userId: uid, eventId, applicationId: b.application, kind: "proxy", label: "submitted", source: "runner" });
    return NextResponse.json({ ok: true });
  }

  await db.from("applications").update({ runner_status: b.status, runner_note: b.note ?? null, runner_updated_at: now, ...(b.url && b.status === "running" && !app.portal_url ? { portal_url: b.url.split("#")[0] } : {}) }).eq("id", b.application);
  // only state changes go in the log, not every page
  if (app.runner_status !== b.status) {
    await logEvent({ userId: uid, actor: "agent:runner", action: b.status === "running" ? "runner.started" : `runner.${b.status}`, applicationId: b.application, channel: "portal", context: { note: b.note ?? null, filled: b.filled ?? null } });
  }
  return NextResponse.json({ ok: true });
}
