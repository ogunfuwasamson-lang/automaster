import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { enqueue } from "@/lib/queue";
import { canTransition, type AppStatus } from "@/lib/app-state";

// user moves on the shortlist. only the moves a person makes from this screen;
// packet approval and submission have their own flows.
const Body = z.object({ status: z.enum(["shortlisted", "researching", "dropped"]) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id } = await ctx.params;
  const db = admin();
  const { data: app } = await db.from("applications").select("id, status, program_id").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  const to = parsed.data.status as AppStatus;
  if (!canTransition(app.status as AppStatus, to)) return NextResponse.json({ error: `can't move from ${app.status} to ${to}` }, { status: 400 });
  const { error } = await db.from("applications").update({ status: to }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logEvent({ userId: auth.user.id, actor: "user", action: `application.${to}`, applicationId: id, programId: app.program_id });
  // what they keep and drop shapes their next search (once a day, after they've finished sorting)
  await enqueue({ userId: auth.user.id, agent: "learning", task: "shortlist", idempotencyKey: `shortlist:${auth.user.id}:${new Date().toISOString().slice(0, 10)}`, runAt: new Date(Date.now() + 30 * 60_000) }).catch(() => {});
  return NextResponse.json({ ok: true });
}

// delete an application for good: its essays, briefs, plan, portal progress and questions go with it (the database
// cascades them). portal logins and emails stay, unlinked, because the person may still need them. anything an agent
// had queued for it is cancelled first so nothing runs against a deleted application.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = admin();
  const { data: app } = await db.from("applications").select("id, status, program_id, programs(name, schools(name))").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.from("jobs").update({ status: "cancelled", last_error: "application deleted" }).eq("user_id", auth.user.id).in("status", ["queued", "running"]).eq("payload->>applicationId", id);
  const { error } = await db.from("applications").delete().eq("id", id).eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const p = app.programs as unknown as { name: string; schools: { name: string } } | null;
  await logEvent({ userId: auth.user.id, actor: "user", action: "application.deleted", programId: app.program_id, context: { school: p?.schools.name, program: p?.name, status: app.status } });
  return NextResponse.json({ ok: true });
}
