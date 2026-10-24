import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { interviewTurn } from "@/agents/interviewer";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  sessionId: z.uuid().nullable().optional(),
  text: z.string().max(4000).nullable().optional(),
  viaVoice: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const sessionId = parsed.data.sessionId ?? randomUUID();
  const text = parsed.data.text?.trim() || null;
  try {
    const out = await interviewTurn(auth.user.id, sessionId, text, !!parsed.data.viaVoice);
    return NextResponse.json({ sessionId, ...out });
  } catch (e) {
    console.error("interview turn failed", e);
    const billing = /credit balance is too low/i.test(String(e));
    return NextResponse.json(
      { error: billing ? "the Anthropic API account is out of credit. top up at console.anthropic.com, then try again." : "the interviewer hit an error. try again." },
      { status: billing ? 402 : 500 },
    );
  }
}
