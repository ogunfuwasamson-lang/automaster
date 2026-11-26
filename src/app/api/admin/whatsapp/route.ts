import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { PHONE_ID, WABA_ID, registerNumber, status, subscribeApp, whatsappReady } from "@/lib/whatsapp";

// staff: where WhatsApp stands, and the two setup steps that go through the API. the PIN is typed by the founder in
// the admin page and passed straight to Meta; it isn't stored or logged.
const Body = z.discriminatedUnion("action", [z.object({ action: z.literal("register"), pin: z.string().regex(/^\d{6}$/) }), z.object({ action: z.literal("subscribe") })]);

async function staff() {
  const auth = await requireUser();
  if (!auth) return false;
  const { data } = await admin().from("profiles").select("is_admin").eq("id", auth.user.id).single();
  return !!data?.is_admin;
}

export async function GET() {
  if (!(await staff())) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = admin();
  const [{ count: active }, { count: pending }, { count: sent }] = await Promise.all([
    db.from("whatsapp_contacts").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    db.from("whatsapp_contacts").select("user_id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("events").select("id", { count: "exact", head: true }).eq("action", "whatsapp.sent").gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);
  const env = { token: whatsappReady(), appSecret: !!process.env.WHATSAPP_APP_SECRET, verifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN };
  return NextResponse.json({ phoneId: PHONE_ID(), wabaId: WABA_ID(), env, contacts: { active: active ?? 0, pending: pending ?? 0 }, sentThisWeek: sent ?? 0, funnel: await funnel(), meta: env.token ? await status() : null });
}

// starting on WhatsApp, last 30 days: said hi, confirmed an email, finished setup, started an application there.
// counted from the numbers themselves (whatsapp_flows, leaving out numbers linked from Settings) and from events
async function funnel() {
  const db = admin();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ count: hello }, { count: confirmed }, { count: done }, { data: started }, { count: voice }] = await Promise.all([
    db.from("whatsapp_flows").select("phone", { count: "exact", head: true }).gte("started_at", since).is("state->>linked", null),
    db.from("whatsapp_flows").select("phone", { count: "exact", head: true }).gte("started_at", since).is("state->>linked", null).not("user_id", "is", null),
    db.from("whatsapp_flows").select("phone", { count: "exact", head: true }).gte("started_at", since).is("state->>linked", null).not("finished_at", "is", null),
    db.from("events").select("user_id").eq("action", "application.prepare_requested").eq("channel", "whatsapp").gte("created_at", since).limit(2000),
    db.from("events").select("id", { count: "exact", head: true }).eq("action", "whatsapp.voice_note").gte("created_at", since),
  ]);
  return { hello: hello ?? 0, confirmed: confirmed ?? 0, done: done ?? 0, started: new Set((started ?? []).map((e) => e.user_id)).size, voice: voice ?? 0 };
}

export async function POST(req: NextRequest) {
  if (!(await staff())) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The PIN is 6 digits." }, { status: 400 });
  try {
    if (parsed.data.action === "register") await registerNumber(parsed.data.pin);
    else await subscribeApp();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e).replace(/^Error: /, "").slice(0, 300) }, { status: 502 });
  }
}
