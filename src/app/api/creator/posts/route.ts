import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { activeCreator } from "@/lib/creator-auth";
import { addPost, removePost } from "@/lib/creators";
import { dayKey, platformOf } from "@/lib/creator-terms";

const Body = z.object({ url: z.string().trim().max(500), title: z.string().trim().max(140).optional(), posted_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

// a video the creator posted: its link, what it's about and the day it went up
export async function POST(req: NextRequest) {
  const me = await activeCreator();
  if (!me) return NextResponse.json({ error: "Your creator account isn't active." }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Paste the video's link and pick the day you posted it." }, { status: 400 });
  const platform = platformOf(b.data.url);
  if (!platform) return NextResponse.json({ error: "That doesn't look like a link. Copy it from the app's Share button." }, { status: 400 });
  const today = dayKey(new Date());
  if (b.data.posted_on > today) return NextResponse.json({ error: "The posting day can't be in the future." }, { status: 400 });
  if (b.data.posted_on < "2026-01-01") return NextResponse.json({ error: "Pick the day you posted it." }, { status: 400 });
  const err = await addPost(me.creator, { url: b.data.url, platform, title: b.data.title || null, posted_on: b.data.posted_on });
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true, platform });
}

export async function DELETE(req: NextRequest) {
  const me = await activeCreator();
  if (!me) return NextResponse.json({ error: "Your creator account isn't active." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const ok = await removePost(me.creator.id, id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Only videos the team hasn't reviewed yet can be removed." }, { status: 400 });
}
