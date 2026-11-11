import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { addInstruction, instructions, removeInstruction } from "@/lib/instructions";

// the applicant tells the agents something about this application in their own words, or takes it back
const Add = z.object({ text: z.string().min(3).max(300) });
const Remove = z.object({ id: z.string().uuid() });

async function own(id: string) {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await auth.sb.from("applications").select("id").eq("id", id).maybeSingle();
  return data ? auth : null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await own(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ instructions: await instructions(id) });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await own(id);
  if (!auth) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = Add.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Write between 3 and 300 characters." }, { status: 400 });
  try {
    await addInstruction(auth.user.id, id, b.data.text, "web");
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 400 });
  }
  return NextResponse.json({ instructions: await instructions(id) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await own(id);
  if (!auth) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = Remove.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await removeInstruction(auth.user.id, id, b.data.id);
  return NextResponse.json({ instructions: await instructions(id) });
}
