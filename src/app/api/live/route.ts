import { NextResponse, after, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { runLiveSession } from "@/lib/live";

export const runtime = "nodejs";
export const maxDuration = 300;

// open a live browser for one application. the session runs after the response, for up to ~4.5 minutes.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = z.object({ applicationId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const db = admin();
  const { data: app } = await db.from("applications").select("id, status").eq("id", parsed.data.applicationId).eq("user_id", auth.user.id).maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (app.status !== "packet_approved") return NextResponse.json({ error: "approve and sign the packet first" }, { status: 400 });

  // one live browser per application: reuse a running one
  const fresh = new Date(Date.now() - 60_000).toISOString();
  const { data: open, error } = await db.from("live_sessions").select("id").eq("application_id", app.id).neq("status", "ended").gte("updated_at", fresh).limit(1);
  if (error) return NextResponse.json({ error: "the live browser isn't set up yet" }, { status: 503 });
  if (open?.length) return NextResponse.json({ id: open[0].id });
  await db.from("live_sessions").update({ status: "ended" }).eq("application_id", app.id).neq("status", "ended");

  const { data: s, error: e2 } = await db.from("live_sessions").insert({ user_id: auth.user.id, application_id: app.id, status: "starting", prompt: "Starting the browser…" }).select("id").single();
  if (e2 || !s) return NextResponse.json({ error: "couldn't start the live browser" }, { status: 500 });
  after(() => runLiveSession(s.id).catch(async (err) => {
    console.error("live session", err);
    await admin().from("live_sessions").update({ status: "ended", frame: null, prompt: "The live browser stopped unexpectedly. Open it again to carry on." }).eq("id", s.id);
  }));
  return NextResponse.json({ id: s.id });
}
