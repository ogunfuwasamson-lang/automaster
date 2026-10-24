import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { newToken, sha256 } from "@/lib/crypto";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

// a personal key for the browser extension. shown once; we store only its hash.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { label?: string };
  const db = admin();
  const { count } = await db.from("runner_tokens").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).is("revoked_at", null);
  if ((count ?? 0) >= 5) return NextResponse.json({ error: "revoke an old key first" }, { status: 400 });
  const token = newToken("amr");
  const { error } = await db.from("runner_tokens").insert({ user_id: auth.user.id, token_hash: sha256(token), label: (body.label ?? "chrome").slice(0, 40) });
  if (error) return NextResponse.json({ error: "couldn't create a key" }, { status: 500 });
  await logEvent({ userId: auth.user.id, actor: "user", action: "runner.connected" });
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
