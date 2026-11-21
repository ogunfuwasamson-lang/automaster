import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { AUDIENCES, recipients, render, sendBroadcast, sendTest, type Audience } from "@/lib/broadcast";
import { problems } from "@/lib/broadcast-format";

export const runtime = "nodejs";
export const maxDuration = 300;

const Msg = z.object({ subject: z.string().max(140), preheader: z.string().max(200).optional(), headline: z.string().max(160), body: z.string().max(20000) });
const Body = z.object({
  action: z.enum(["count", "preview", "test", "send"]),
  audience: z.enum(AUDIENCES.map((a) => a.key) as [Audience, ...Audience[]]),
  country: z.string().max(60).optional(),
  msg: Msg,
  bell: z.boolean().default(false),
  // the count the operator confirmed: a send only goes if the group is still that size
  confirm: z.number().int().optional(),
});

// staff: preview, test and send an email to a group of applicants
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = admin();
  const { data: me } = await db.from("profiles").select("is_admin, email, full_name").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad request" }, { status: 400 });
  const { action, audience, country, msg, bell, confirm } = parsed.data;
  const rs = await recipients(audience, country);
  if (action === "count") return NextResponse.json({ count: rs.length });
  const sample = rs[0] ?? { id: auth.user.id, first: (me.full_name as string | null)?.split(/\s+/)[0] ?? null };
  if (action === "preview") {
    const m = render(msg, sample);
    return NextResponse.json({ count: rs.length, subject: m.subject, html: m.html, text: m.text, problems: problems(msg) });
  }
  const issues = problems(msg);
  if (issues.length) return NextResponse.json({ error: issues[0] }, { status: 400 });
  if (action === "test") {
    if (!me.email) return NextResponse.json({ error: "Your account has no email." }, { status: 400 });
    const ok = await sendTest(msg, { id: auth.user.id, email: me.email as string, first: (me.full_name as string | null)?.split(/\s+/)[0] ?? null });
    return ok ? NextResponse.json({ ok: true, to: me.email }) : NextResponse.json({ error: "The test didn't send. Check the Resend key." }, { status: 502 });
  }
  if (confirm !== rs.length) return NextResponse.json({ error: `The group is now ${rs.length} people, not ${confirm ?? 0}. Check it and confirm again.`, count: rs.length }, { status: 409 });
  if (!rs.length) return NextResponse.json({ error: "Nobody is in that group." }, { status: 400 });
  const r = await sendBroadcast(msg, rs, { by: auth.user.id, audience: audience === "country" ? `country:${country}` : audience, bell });
  return NextResponse.json({ ok: true, ...r });
}
