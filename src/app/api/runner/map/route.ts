import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { loadSheet, mapFields, runnerUser } from "@/lib/runner";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  application: z.string().uuid(),
  fields: z
    .array(
      z.object({
        id: z.string().max(80),
        label: z.string().max(400),
        type: z.string().max(20),
        name: z.string().max(200).optional(),
        options: z.array(z.string().max(200)).max(300).optional(),
        required: z.boolean().optional(),
      }),
    )
    .max(150),
});

// page fields in, fills out. values come only from the applicant's approved fill sheet.
export async function POST(req: NextRequest) {
  const uid = await runnerUser(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const sheet = await loadSheet(uid, parsed.data.application);
  if (!sheet) return NextResponse.json({ error: "no approved packet for that application" }, { status: 404 });
  const fills = await mapFields(uid, sheet, parsed.data.fields);
  return NextResponse.json({ fills });
}
