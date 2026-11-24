import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { applyAsCreator } from "@/lib/creators";

// apply to the creator partnership (lib/creators): the operator reviews it in the console
const Handle = z.string().trim().max(80).optional();
const Body = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(30),
  tiktok: Handle,
  instagram: Handle,
  youtube: Handle,
  x: Handle,
  other: Handle,
  followers: z.string().trim().min(1).max(60),
  audience: z.string().trim().min(10).max(800),
  agree: z.literal(true),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fill in your name, WhatsApp number, at least one handle, your followers and a line about your content, and agree to the guidelines." }, { status: 400 });
  const b = parsed.data;
  const handles = Object.fromEntries((["tiktok", "instagram", "youtube", "x", "other"] as const).filter((k) => b[k]).map((k) => [k, b[k]!]));
  if (!Object.keys(handles).length) return NextResponse.json({ error: "Add at least one handle where you post." }, { status: 400 });
  try {
    await applyAsCreator(auth.user.id, auth.user.email ?? "", { name: b.name, phone: b.phone, handles, audience: b.audience, followers: b.followers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't send it. Try again." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
