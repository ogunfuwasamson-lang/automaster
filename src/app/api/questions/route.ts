import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { answerQuestion, openQuestions } from "@/lib/portal-questions";
import { toAsk, type Ask } from "@/lib/ask";

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

const Body = z.object({ id: z.uuid(), answer: z.string().max(2000).nullable(), sessionId: z.uuid().nullable().optional() });

const nextLine = (q: Ask, first: boolean) => `${first ? "" : "Next, "}${q.school ?? "A school"} asks: ${q.question}`;

// a tapped (or typed) answer: straight into the profile, no AI needed. answers the next question too, in the chat.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id, answer, sessionId } = parsed.data;
  const uid = auth.user.id;
  const ok = await answerQuestion(uid, id, answer?.trim() ? answer : null);
  if (!ok) return NextResponse.json({ error: "that question was already answered" }, { status: 409 });
  const left = await openQuestions(uid);
  const next = left[0] ? toAsk(left[0]) : null;
  const reply = next ? nextLine(next, false) : "That's everything. The agents are carrying on with your applications now.";
  // from the chat: keep the conversation in Ivyward AI's history so it knows what was answered
  if (sessionId) {
    const db = admin();
    const turns = [
      { user_id: uid, session_id: sessionId, role: "user", content: answer?.trim() ? answer.trim() : "Skip: doesn't apply to me" },
      { user_id: uid, session_id: sessionId, role: "agent", content: reply, meta: next ? { ask: next } : null },
    ];
    const { error } = await db.from("interview_turns").insert(turns);
    if (error) await db.from("interview_turns").insert(turns.map(({ meta: _m, ...t }) => (void _m, t)));
  }
  return NextResponse.json({ ok: true, next, reply, left: left.length });
}
