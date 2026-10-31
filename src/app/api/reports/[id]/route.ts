import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

// "not relevant" on one item of a weekly report: it stays hidden, and Ivyward AI learns what to leave out
const Body = z.object({ dismiss: z.number().int().min(0).max(5) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id } = await ctx.params;
  const db = admin();
  const { data } = await db.from("digests").select("content").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const c = data.content as { dismissed?: number[] };
  await db.from("digests").update({ content: { ...c, dismissed: [...new Set([...(c.dismissed ?? []), parsed.data.dismiss])] } }).eq("id", id);
  return NextResponse.json({ ok: true });
}
