import { NextResponse, after } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { kickoff } from "@/lib/kickoff";
import { drain } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

// the applicant finished (or left) setup: start the agents and list what's still missing
export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out = await kickoff(auth.user.id, "setup");
  if (out.shortlist) after(() => drain("inline-kickoff", 1).catch(() => {}));
  return NextResponse.json(out);
}
