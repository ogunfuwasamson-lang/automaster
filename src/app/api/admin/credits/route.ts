import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { notify } from "@/lib/notify";
import { grant } from "@/lib/wallet";

// staff: give an account credits (a refund, a goodwill top-up, a partner or ambassador reward, or your own testing).
// each grant is its own row in the wallet, with who gave it and why in the event log.
const Body = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(1).max(500),
  days: z.number().int().min(0).max(365), // 0 = never expires
  note: z.string().trim().min(3).max(200),
  tell: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = admin();
  const { data: me } = await db.from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give an amount (1 to 500), how long they last, and a short reason." }, { status: 400 });
  const b = parsed.data;
  const { data: who } = await db.from("profiles").select("id").eq("id", b.userId).maybeSingle();
  if (!who) return NextResponse.json({ error: "No account with that id." }, { status: 404 });
  const expires = b.days ? new Date(Date.now() + b.days * 86_400_000) : null;
  const balance = await grant(b.userId, b.amount, "grant", expires, `admin:${auth.user.id}:${Date.now()}`);
  await logEvent({ userId: b.userId, actor: "user", action: "staff.credits_granted", context: { by: auth.user.id, amount: b.amount, days: b.days || null, note: b.note, balance } }).catch(() => {});
  if (b.tell)
    await notify({
      userId: b.userId,
      key: `credits:granted:${Date.now()}`,
      kind: "info",
      title: `You've got ${b.amount} credits from the Ivyward team`,
      body: `${expires ? `They last until ${expires.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. ` : ""}An application uses 10 credits; checking a programme or sending a funding request uses 1.`,
      href: "/credits",
      actionLabel: "See your credits",
    }).catch(() => {});
  return NextResponse.json({ ok: true, balance });
}
