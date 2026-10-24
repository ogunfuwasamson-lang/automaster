import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { runnerUser, submitDecision } from "@/lib/runner";

export const runtime = "nodejs";

// asked by the extension right before it presses a portal's final submit button
export async function POST(req: NextRequest) {
  const uid = await runnerUser(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = z.object({ application: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  return NextResponse.json(await submitDecision(uid, parsed.data.application));
}
