import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { disconnectCalendar } from "@/lib/gcal";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await disconnectCalendar(auth.user.id);
  await logEvent({ userId: auth.user.id, actor: "user", action: "calendar.disconnected" });
  return NextResponse.json({ ok: true });
}
