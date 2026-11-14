import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// the browser's time zone, so the morning email and the morning's new matches (lib/drop) arrive in their morning
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tz = String(((await req.json().catch(() => ({}))) as { timezone?: unknown }).timezone ?? "").slice(0, 64);
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (!/^[A-Za-z_]+\/[A-Za-z_\-/]+$/.test(tz)) return NextResponse.json({ ok: false });
  await admin().from("profiles").update({ timezone: tz }).eq("id", auth.user.id);
  return NextResponse.json({ ok: true });
}
