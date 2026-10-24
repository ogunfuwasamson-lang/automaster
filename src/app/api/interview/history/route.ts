import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile, completeness } from "@/lib/profile";

// the latest interview conversation, for the chat panel that opens from any page
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [{ data: last }, { data: prof }] = await Promise.all([
    auth.sb.from("interview_turns").select("session_id").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    auth.sb.from("profiles").select("profile").single(),
  ]);
  let turns: { role: "agent" | "user"; content: string }[] = [];
  if (last?.session_id) {
    const { data } = await auth.sb.from("interview_turns").select("role, content").eq("session_id", last.session_id).order("created_at");
    turns = (data ?? []) as typeof turns;
  }
  return NextResponse.json({ sessionId: last?.session_id ?? null, turns, completeness: completeness(loadProfile(prof?.profile)) });
}
