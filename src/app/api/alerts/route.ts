import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { subscribe } from "@/lib/deadline-alerts";

const Body = z.object({ email: z.email().max(200), source: z.string().max(120).optional(), website: z.string().max(200).optional() });

// sign up for scholarship deadline alerts (double opt-in). "website" is a honeypot: people never fill it, bots do.
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true, status: "sent" });
  const status = await subscribe(parsed.data.email, parsed.data.source ?? null).catch(() => "error" as const);
  if (status === "error") return NextResponse.json({ error: "We couldn't sign you up just now. Try again in a minute." }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
