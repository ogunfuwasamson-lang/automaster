import { resumeAfterProfileChange } from "@/lib/requeue";
import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { NEVER_FILL } from "@/lib/fillsheet";
import { DetailsSchema } from "@/lib/details-schema";

export const runtime = "nodejs";

const str = (max = 200) => z.string().trim().max(max).nullable().optional();
const Body = z.object({
  details: DetailsSchema,
  recommenders: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        email: str(200),
        title: str(120),
        organization: str(160),
        relationship: str(160),
        phone: str(40),
      }),
    )
    .max(6),
});

// the details portals ask for. no id numbers: the runner leaves those for the applicant.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "check the fields: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") }, { status: 400 });
  const uid = auth.user.id;
  const db = admin();
  const details = Object.fromEntries(Object.entries(parsed.data.details).map(([k, v]) => [k, v || null]));
  if (Object.values(details).some((v) => typeof v === "string" && /\b\d{9,}\b/.test(v) && NEVER_FILL.test(v))) return NextResponse.json({ error: "don't put id numbers here" }, { status: 400 });
  const { data: cur } = await db.from("profiles").select("portal_details").eq("id", uid).single();
  await db.from("profiles").update({ portal_details: { ...((cur?.portal_details as Record<string, unknown>) ?? {}), ...details } }).eq("id", uid);
  await db.from("recommenders").delete().eq("user_id", uid);
  if (parsed.data.recommenders.length) {
    await db.from("recommenders").insert(parsed.data.recommenders.map((r) => ({ user_id: uid, name: r.name, email: r.email || null, title: r.title || null, organization: r.organization || null, relationship: r.relationship || null, phone: r.phone || null })));
  }
  await logEvent({ userId: uid, actor: "user", action: "profile.details_saved", context: { recommenders: parsed.data.recommenders.length } });
  const resumed = await resumeAfterProfileChange(uid, "form details");
  return NextResponse.json({ ok: true, resumed });
}
