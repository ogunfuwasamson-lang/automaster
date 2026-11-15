import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";
import { admin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CHANNELS = new Set(["whatsapp", "copy", "image", "native"]);

// counts a share of a programme (which programme, which way). the friend's visit and signup are counted by the
// link's utm tags and invite code.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { programId?: string; channel?: string };
  if (!b.programId || !/^[0-9a-f-]{36}$/i.test(b.programId) || !CHANNELS.has(b.channel ?? "")) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { data: p } = await admin().from("programs").select("id, school_id, schools(name)").eq("id", b.programId).maybeSingle();
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  await logEvent({ userId: auth.user.id, actor: "user", action: "share.sent", programId: p.id as string, schoolId: (p.school_id as string) ?? undefined, channel: b.channel, context: { title: (p.schools as unknown as { name?: string } | null)?.name ?? null, channel: b.channel } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
