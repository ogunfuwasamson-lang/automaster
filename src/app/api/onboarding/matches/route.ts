import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { instantMatches } from "@/lib/matches";
import { cleanSchool } from "@/lib/match-rules";

export const runtime = "nodejs";

// the matches screen in setup: programmes already on file that fit what the applicant just told us. no model call.
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const matches = (await instantMatches(auth.user.id).catch(() => [])).map((m) => ({ ...m, school: cleanSchool(m.school) }));
  return NextResponse.json({ matches });
}
