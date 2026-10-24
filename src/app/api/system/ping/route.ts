import { NextResponse, after } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { enqueue, drain } from "@/lib/jobs";

export const runtime = "nodejs";

// queues a ping job for the signed-in user and kicks the worker right away.
export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = await enqueue({ userId: auth.user.id, agent: "system", task: "ping" });
  after(() => drain("inline", 1).catch(() => {}));
  return NextResponse.json({ queued: id });
}
