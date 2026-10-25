import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { autoStartScholarships } from "@/lib/scholarships";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

// switch on or off: agents start applications for strong-fit scholarships on their own
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = z.object({ auto: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { error } = await admin().from("profiles").update({ auto_scholarships: parsed.data.auto }).eq("id", auth.user.id);
  if (error) return NextResponse.json({ error: "this setting needs a database update first" }, { status: 503 });
  await logEvent({ userId: auth.user.id, actor: "user", action: "scholarships.auto", context: { on: parsed.data.auto } });
  const started = parsed.data.auto ? await autoStartScholarships(auth.user.id) : 0;
  return NextResponse.json({ ok: true, started });
}
