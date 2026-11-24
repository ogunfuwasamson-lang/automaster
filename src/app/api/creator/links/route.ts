import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { activeCreator } from "@/lib/creator-auth";
import { createLink, linkUrl, renameLink } from "@/lib/creators";

const Create = z.object({ label: z.string().trim().max(40).optional(), code: z.string().trim().max(40).optional() });
const Rename = z.object({ id: z.uuid(), label: z.string().trim().max(40) });

// a new tracked link (tryivyward.com/c/<code>)
export async function POST(req: NextRequest) {
  const me = await activeCreator();
  if (!me) return NextResponse.json({ error: "Your creator account isn't active." }, { status: 403 });
  const b = Create.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Give the link a short name." }, { status: 400 });
  const out = await createLink(me.creator, b.data.label || null, b.data.code || null);
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  return NextResponse.json({ ...out, url: linkUrl(out.code) });
}

// rename a link (its address stays the same, so videos already posted keep working)
export async function PATCH(req: NextRequest) {
  const me = await activeCreator();
  if (!me) return NextResponse.json({ error: "Your creator account isn't active." }, { status: 403 });
  const b = Rename.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Give the link a short name." }, { status: 400 });
  await renameLink(me.creator.id, b.data.id, b.data.label || null);
  return NextResponse.json({ ok: true });
}
