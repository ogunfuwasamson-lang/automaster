import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { openQuestions } from "@/lib/portal-questions";
import { toAsk } from "@/lib/ask";
import { answerCard } from "@/lib/card-answer";

export const runtime = "nodejs";

// portal questions the agents are waiting on, each with the control that fits it
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const qs = await openQuestions(auth.user.id);
  return NextResponse.json(
    { questions: qs.map((q) => ({ ...toAsk(q), applicationId: q.application_id })) },
    { headers: { "cache-control": "no-store" } },
  );
}

// ids: a portal question (uuid), a form question ("d:<key>"), or a match fact ("s:<key>", lib/cards)
const Body = z.object({ id: z.union([z.uuid(), z.string().regex(/^d:[a-z0-9_]{2,40}$/), z.string().regex(/^s:[a-z]{3,20}$/)]), answer: z.string().max(2000).nullable(), sessionId: z.uuid().nullable().optional() });

// a tapped (or typed) answer: straight into the profile, no AI needed. answers the next question too, in the chat.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id, answer, sessionId } = parsed.data;
  const out = await answerCard(auth.user.id, id, answer, { sessionId });
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, next: out.next, reply: out.reply, left: out.left });
}
