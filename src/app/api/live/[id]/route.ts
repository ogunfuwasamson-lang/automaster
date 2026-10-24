import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function own(id: string) {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await admin().from("live_sessions").select("id, status, prompt, url, frame_seq, ends_at, updated_at").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  return data;
}

// the latest screenshot (only when it changed since `seq`) and who's driving
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await own(id);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  const since = Number(req.nextUrl.searchParams.get("seq") ?? "-1");
  let frame: string | null = null;
  if (s.frame_seq > since) {
    const { data } = await admin().from("live_sessions").select("frame").eq("id", id).single();
    frame = data?.frame ?? null;
  }
  // a session whose function died stops updating: call it ended
  const stale = s.status !== "ended" && Date.now() - new Date(s.updated_at).getTime() > 45_000;
  return NextResponse.json(
    { status: stale ? "ended" : s.status, prompt: stale ? "The live browser stopped. Open it again to carry on." : s.prompt, url: s.url, seq: s.frame_seq, frame, endsAt: s.ends_at },
    { headers: { "cache-control": "no-store" } },
  );
}

const Input = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("click"), data: z.object({ x: z.number(), y: z.number() }) }),
  z.object({ kind: z.literal("type"), data: z.object({ text: z.string().max(500) }) }),
  z.object({ kind: z.literal("key"), data: z.object({ key: z.string().max(20) }) }),
  z.object({ kind: z.literal("scroll"), data: z.object({ dy: z.number() }) }),
  z.object({ kind: z.literal("control"), data: z.object({ action: z.enum(["take", "continue", "end"]) }) }),
]);

// clicks, keys and the control buttons from the applicant
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await own(id);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (s.status === "ended") return NextResponse.json({ error: "this live browser has closed" }, { status: 409 });
  const parsed = z.object({ inputs: z.array(Input).min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await admin().from("live_inputs").insert(parsed.data.inputs.map((i) => ({ session_id: id, kind: i.kind, data: i.data })));
  return NextResponse.json({ ok: true });
}
