import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { runModelEvals } from "@/lib/model-evals";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({ tier: z.enum(["chat", "expert"]) });

// staff run the eval questions through the models (metered on their own account) and the score is kept
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await admin().from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    const r = await runModelEvals(auth.user.id, parsed.data.tier);
    await logEvent({ userId: auth.user.id, actor: "user", action: "eval.model", context: r as unknown as Record<string, unknown> });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
}
