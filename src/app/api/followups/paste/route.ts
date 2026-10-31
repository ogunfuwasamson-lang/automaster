import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { findFollowups } from "@/lib/followups";

export const runtime = "nodejs";
export const maxDuration = 60;

// for applicants without Gmail connected (or an email that came to another address): paste a school's email and
// the follow-up engine does the same as for one it read itself: registers, claims the waiver, adds the calendar event
const Body = z.object({ text: z.string().trim().min(20).max(30000), applicationId: z.uuid().nullable().optional() });

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "paste the whole email, including its links" }, { status: 400 });
  const { text, applicationId } = parsed.data;
  let school: string | null = null;
  if (applicationId) {
    const { data } = await admin().from("applications").select("programs(schools(name))").eq("id", applicationId).eq("user_id", auth.user.id).maybeSingle();
    school = (data?.programs as unknown as { schools: { name: string } } | null)?.schools.name ?? null;
  }
  const subject = text.split("\n").find((l) => l.trim())?.slice(0, 160) ?? "Pasted email";
  try {
    const n = await findFollowups(auth.user.id, { from: school ?? "a school (pasted)", subject, text, html: "", at: Date.now() }, { applicationId: applicationId ?? null, school, messageId: null });
    return NextResponse.json({ found: n });
  } catch (e) {
    return NextResponse.json({ error: /budget:/.test(String(e)) ? "you've used this month's agent allowance" : "couldn't read that email just now" }, { status: 500 });
  }
}
