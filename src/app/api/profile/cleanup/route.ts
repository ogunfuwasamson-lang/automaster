import { NextResponse, after } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { drain } from "@/lib/jobs";
import { scheduleConsolidate } from "@/agents/curator";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await scheduleConsolidate(auth.user.id, 0);
  after(() => drain("inline-cleanup", 1).catch(() => {}));
  return NextResponse.json({ ok: true });
}
