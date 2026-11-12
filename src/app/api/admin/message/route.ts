import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { notify } from "@/lib/notify";

const Body = z.object({
  userId: z.uuid(),
  title: z.string().trim().min(1).max(140),
  body: z.string().trim().min(1).max(2000),
  href: z.string().trim().max(300).regex(/^\/[\w\-/?=&#.%]*$|^$/, "a page in the app, like /dashboard").optional(),
  actionLabel: z.string().trim().max(40).optional(),
  email: z.boolean().default(true),
});

// staff: message one applicant. it lands in their bell (marked important) and, if asked, as an email from Ivyward.
// every message is its own notice, and the account's history keeps who sent what.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = admin();
  const { data: me } = await db.from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad request" }, { status: 400 });
  const m = parsed.data;
  const { data: target } = await db.from("profiles").select("id").eq("id", m.userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "No account with that id." }, { status: 404 });
  const key = `staff:${Date.now().toString(36)}`;
  await notify({ userId: m.userId, key, kind: "info", title: m.title, body: m.body, href: m.href || "/dashboard", actionLabel: m.actionLabel || "Open Ivyward", urgent: true, email: m.email });
  const { data: sent } = await db.from("notifications").select("id, emailed_at").eq("user_id", m.userId).eq("dedupe_key", key).maybeSingle();
  if (!sent) return NextResponse.json({ error: "The message couldn't be saved. Try again." }, { status: 500 });
  await logEvent({ userId: m.userId, actor: "staff", action: "staff.messaged", context: { by: auth.user.id, title: m.title, body: m.body.slice(0, 500), email: m.email, emailed: !!sent.emailed_at } }).catch(() => {});
  return NextResponse.json({ ok: true, emailed: !!sent.emailed_at });
}
