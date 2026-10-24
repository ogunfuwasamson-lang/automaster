import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { logEvent } from "@/lib/events";
import { normalizeUrl } from "@/lib/portal-url";
import { resumeAfterProfileChange } from "@/lib/requeue";
import { enqueue } from "@/lib/queue";

export const runtime = "nodejs";

const Body = z.object({
  application_id: z.string().uuid().nullable().optional(),
  portal: z.string().min(3).max(300),
  login: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

// the applicant saves a portal login they made themselves; agents sign in with it from then on
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Add the portal, your email or user ID, and the password" }, { status: 400 });
  let host: string;
  try {
    host = new URL(normalizeUrl(b.data.portal) ?? b.data.portal).hostname;
  } catch {
    return NextResponse.json({ error: "That portal link doesn't look right" }, { status: 400 });
  }
  const db = admin();
  const appId = b.data.application_id ?? null;
  if (appId) {
    const { data: own } = await db.from("applications").select("id").eq("id", appId).eq("user_id", auth.user.id).maybeSingle();
    if (!own) return NextResponse.json({ error: "application not found" }, { status: 404 });
  }
  const { error } = await db
    .from("portal_accounts")
    .upsert({ user_id: auth.user.id, application_id: appId, portal_host: host, login_email: b.data.login.trim(), password_enc: encrypt(b.data.password), status: "created" }, { onConflict: "user_id,portal_host" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logEvent({ userId: auth.user.id, actor: "user", action: "runner.login_added", applicationId: appId, context: { host } });
  // an application waiting on this login picks up again straight away
  if (appId) {
    const { data: app } = await db.from("applications").select("runner_status, status").eq("id", appId).single();
    if (app?.status === "packet_approved" && ["needs_you", "failed"].includes(app.runner_status)) {
      await db.from("applications").update({ runner_status: "ready", runner_note: "signing in with the login you added", runner_updated_at: new Date().toISOString() }).eq("id", appId);
      await enqueue({ userId: auth.user.id, agent: "runner", task: "run", payload: { applicationId: appId } });
    }
  } else await resumeAfterProfileChange(auth.user.id, "login added").catch(() => 0);
  return NextResponse.json({ ok: true, host });
}
