import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { clearLessonCache } from "@/lib/lessons";
import { logEvent } from "@/lib/events";

const Body = z.object({ id: z.uuid(), action: z.enum(["approve", "reject", "retire", "edit"]), text: z.string().trim().min(8).max(400).optional() });

// staff decide on lessons proposed for every applicant
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = admin();
  const { data: me } = await db.from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id, action, text } = parsed.data;
  const { data: l } = await db.from("lessons").select("id, agent, status").eq("id", id).maybeSingle();
  if (!l) return NextResponse.json({ error: "not found" }, { status: 404 });
  const now = new Date().toISOString();
  const patch =
    action === "approve"
      ? { status: "active", decided_at: now, source: "admin", ...(text ? { text } : {}) }
      : action === "reject"
        ? { status: "rejected", decided_at: now }
        : action === "retire"
          ? { status: "retired", retired_reason: "retired by staff" }
          : { text: text ?? "" };
  if (action === "edit" && !text) return NextResponse.json({ error: "text needed" }, { status: 400 });
  await db.from("lessons").update(patch).eq("id", id);
  clearLessonCache();
  await logEvent({ userId: auth.user.id, actor: "user", action: `lesson.${action}`, context: { lesson: id, agent: l.agent } });
  return NextResponse.json({ ok: true });
}
