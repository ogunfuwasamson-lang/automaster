import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  country: z.string().trim().max(80).optional(),
  institution: z.string().trim().max(160).optional(),
  audience: z.string().trim().max(600).optional(),
  channels: z.string().trim().max(600).optional(),
  website: z.string().max(200).optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add your name and a valid email." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });
  const auth = await requireUser().catch(() => null);
  const { website: _w, ...row } = parsed.data;
  void _w;
  const { error } = await admin().from("ambassador_applications").insert({ ...row, email: row.email.toLowerCase(), user_id: auth?.user.id ?? null });
  if (error) return NextResponse.json({ error: "We couldn't save that. Try again in a minute." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
