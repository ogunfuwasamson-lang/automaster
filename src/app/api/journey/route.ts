import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { tickKey, type StageId } from "@/lib/journey-map";

// the applicant ticks a step on their journey after an admission (visa, fees, travel, first day). kept as events,
// so the journey reads the latest tick for each step (lib/today-data)
const Body = z.object({
  applicationId: z.uuid(),
  stage: z.enum(["funding", "visa", "fees", "travel", "arrival"]),
  step: z.string().regex(/^[a-z]{2,20}$/),
  done: z.boolean(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { data: app } = await admin().from("applications").select("id, program_id").eq("id", b.data.applicationId).eq("user_id", auth.user.id).maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  await logEvent({
    userId: auth.user.id,
    actor: "user",
    action: "journey.step",
    applicationId: app.id,
    programId: app.program_id,
    context: { key: tickKey(app.id, b.data.stage as StageId, b.data.step), done: b.data.done },
  });
  return NextResponse.json({ ok: true });
}
