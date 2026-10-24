import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
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
  return NextResponse.json({ ok: true });
}
