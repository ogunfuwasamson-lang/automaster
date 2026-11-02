import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { newToken, sha256 } from "@/lib/crypto";
import { logEvent } from "@/lib/events";
import { resolve } from "@/lib/notify";

export const runtime = "nodejs";
const MAX_KEYS = 5;

// a personal key for the browser extension. shown once; we store only its hash.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { label?: string };
  const db = admin();
  // at most 5 live keys. reinstalling or switching from the downloaded extension to the store one leaves old keys
  // behind, so a new connection retires the least recently used ones instead of refusing.
  const { data: live } = await db.from("runner_tokens").select("id, created_at, last_used_at").eq("user_id", auth.user.id).is("revoked_at", null);
  const stale = (live ?? [])
    .sort((a, b) => Date.parse(a.last_used_at ?? a.created_at) - Date.parse(b.last_used_at ?? b.created_at))
    .slice(0, Math.max(0, (live?.length ?? 0) - (MAX_KEYS - 1)));
  if (stale.length) {
    await db.from("runner_tokens").update({ revoked_at: new Date().toISOString() }).in("id", stale.map((t) => t.id)).eq("user_id", auth.user.id);
    await logEvent({ userId: auth.user.id, actor: "system", action: "runner.keys_retired", context: { count: stale.length } }).catch(() => {});
  }
  const token = newToken("amr");
  const { error } = await db.from("runner_tokens").insert({ user_id: auth.user.id, token_hash: sha256(token), label: (body.label ?? "chrome").slice(0, 40) });
  if (error) return NextResponse.json({ error: "couldn't create a key" }, { status: 500 });
  await logEvent({ userId: auth.user.id, actor: "user", action: "runner.connected" });
  await resolve(auth.user.id, "connect-chrome").catch(() => {});
  return NextResponse.json({ token });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await admin().from("runner_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", auth.user.id);
  return NextResponse.json({ ok: true });
}
