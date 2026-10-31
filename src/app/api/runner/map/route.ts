import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { loadApp, loadSheet, mapFields, runnerUser, type MapMemory } from "@/lib/runner";
import { admin } from "@/lib/supabase/admin";
import { fieldHints } from "@/lib/school-memory";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  application: z.string().uuid(),
  host: z.string().max(253).optional(),
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
  // labels other applicants' submissions on this portal confirmed; the model's picks are kept for the same
  const app = await loadApp(uid, parsed.data.application);
  const schoolId = (app?.programs as unknown as { school_id: string } | null)?.school_id;
  const host = (parsed.data.host ?? "").replace(/^www\./, "");
  const mem: MapMemory = { hints: host ? await fieldHints(schoolId, host).catch(() => new Map()) : new Map(), picks: {} };
  const fills = await mapFields(uid, sheet, parsed.data.fields, mem);
  if (Object.keys(mem.picks ?? {}).length) {
    const db = admin();
    const { data } = await db.from("applications").select("runner_state").eq("id", parsed.data.application).maybeSingle();
    const st = (data?.runner_state ?? {}) as { picks?: Record<string, string> };
    await db.from("applications").update({ runner_state: { ...st, picks: { ...(st.picks ?? {}), ...mem.picks } } }).eq("id", parsed.data.application);
  }
  return NextResponse.json({ fills });
}
