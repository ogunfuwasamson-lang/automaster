import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { openQuestions } from "@/lib/portal-questions";

export const runtime = "nodejs";

// portal questions the agents are waiting on (the interviewer pops up for these)
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const qs = await openQuestions(auth.user.id);
  return NextResponse.json({ questions: qs.map((q) => ({ id: q.id, question: q.question, school: q.school, applicationId: q.application_id })) }, { headers: { "cache-control": "no-store" } });
}
