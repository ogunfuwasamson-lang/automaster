import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { signatureOk } from "@/lib/whatsapp";
import { handleInbound, type Inbound } from "@/lib/whatsapp-server";

export const runtime = "nodejs";

// Meta's WhatsApp webhook. GET: the one-time check when the callback URL is saved in the app dashboard (the verify
// token the founder set there and in Agent37). POST: messages to Ivyward's number, signed with the app secret.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const want = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  const got = q.get("hub.verify_token") ?? "";
  const same = want.length > 0 && want.length === got.length && timingSafeEqual(Buffer.from(want), Buffer.from(got));
  if (q.get("hub.mode") === "subscribe" && same) return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

type Payload = { entry?: { changes?: { field?: string; value?: { messages?: { id: string; from: string; type: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string } } }[] } }[] }[] };

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!signatureOk(raw, req.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return NextResponse.json({ ok: true });
  }
  const messages: Inbound[] = [];
  for (const e of body.entry ?? [])
    for (const c of e.changes ?? [])
      for (const m of c.value?.messages ?? [])
        messages.push({ id: m.id, from: m.from, type: m.type, text: m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? null });
  // delivery receipts and statuses carry no messages: nothing to do. errors are logged, never returned, so Meta
  // doesn't retry a message we already handled
  for (const m of messages) await handleInbound(m).catch((e) => console.error("whatsapp inbound failed", e));
  return NextResponse.json({ ok: true });
}
