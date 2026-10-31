import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

// the bell: open notices, newest first; and marking them read or dismissing one
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await admin()
    .from("notifications")
    .select("id, kind, title, body, href, action_label, urgent, created_at, read_at")
    .eq("user_id", auth.user.id)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(30);
  return NextResponse.json({ items: data ?? [] });
}

const Body = z.object({ action: z.enum(["read_all", "dismiss"]), id: z.uuid().optional() });

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const db = admin();
  const now = new Date().toISOString();
  if (parsed.data.action === "read_all") await db.from("notifications").update({ read_at: now }).eq("user_id", auth.user.id).is("read_at", null);
  else if (parsed.data.id) await db.from("notifications").update({ resolved_at: now, read_at: now }).eq("user_id", auth.user.id).eq("id", parsed.data.id);
  return NextResponse.json({ ok: true });
}
