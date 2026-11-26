import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { turnOff, turnOn, whatsappState } from "@/lib/whatsapp-server";

// the applicant's WhatsApp updates switch in settings. "on" needs the consent box ticked in the page.
const Body = z.object({ action: z.enum(["on", "off"]), consent: z.boolean().optional() });

export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await whatsappState(auth.user.id));
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (parsed.data.action === "on" && !parsed.data.consent) return NextResponse.json({ error: "Tick the box to agree to messages on WhatsApp first." }, { status: 400 });
  return NextResponse.json(parsed.data.action === "on" ? await turnOn(auth.user.id) : await turnOff(auth.user.id));
}
