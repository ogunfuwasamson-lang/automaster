import { NextResponse, after, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { signatureOk } from "@/lib/whatsapp";
import { handleInbound, type Inbound } from "@/lib/whatsapp-server";
import { drain } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

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

type File = { id: string; mime_type?: string; filename?: string; caption?: string };
type Message = {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: { type?: string; button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
  document?: File;
  image?: File;
  audio?: File;
};
type Payload = { entry?: { changes?: { field?: string; value?: { contacts?: { wa_id?: string; profile?: { name?: string } }[]; messages?: Message[] } }[] }[] };

// one message as lib/whatsapp-onboard reads it: what they typed (or the title of what they tapped), the id of the
// button or list row they tapped, a file they sent, and their WhatsApp name
function inbound(m: Message, name: string | null): Inbound {
  const tap = m.interactive?.button_reply ?? m.interactive?.list_reply ?? null;
  const file = m.document ?? m.image ?? m.audio ?? null;
  return {
    id: m.id,
    from: m.from,
    type: m.type,
    text: (m.text?.body ?? tap?.title ?? m.button?.text ?? file?.caption ?? "").slice(0, 4000),
    reply: tap?.id ?? null,
    media: file?.id ? { id: file.id, mime: file.mime_type ?? "", filename: file.filename ?? null, caption: file.caption ?? null } : null,
    name: name?.slice(0, 80) ?? null,
  };
}

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
    for (const c of e.changes ?? []) {
      const names = new Map((c.value?.contacts ?? []).map((x) => [x.wa_id ?? "", x.profile?.name ?? null]));
      for (const m of c.value?.messages ?? []) messages.push(inbound(m, names.get(m.from) ?? null));
    }
  // delivery receipts and statuses carry no messages: nothing to do. errors are logged, never returned, so Meta
  // doesn't retry a message we already handled
  for (const m of messages) await handleInbound(m).catch((e) => console.error("whatsapp inbound failed", e));
  // Ivyward AI's answer, a file, or the end of setup was queued: run those now (only WhatsApp's own jobs), not at
  // the worker's next tick
  if (messages.length) after(() => drain("inline-whatsapp", 3, "whatsapp").catch(() => {}));
  return NextResponse.json({ ok: true });
}
