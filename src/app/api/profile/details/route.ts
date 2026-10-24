import { resumeAfterProfileChange } from "@/lib/requeue";
import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { NEVER_FILL } from "@/lib/fillsheet";

export const runtime = "nodejs";

const str = (max = 200) => z.string().trim().max(max).nullable().optional();
const Body = z.object({
  details: z.object({
    preferred_name: str(80),
    email: str(200),
    phone: str(40),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("")),
    gender: str(60),
    address_line1: str(),
    address_line2: str(),
    city: str(100),
    state: str(100),
    postal_code: str(20),
    country: str(100),
    linkedin: str(300),
    website: str(300),
  }),
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
  await db.from("profiles").update({ portal_details: details }).eq("id", uid);
  await db.from("recommenders").delete().eq("user_id", uid);
  if (parsed.data.recommenders.length) {
    await db.from("recommenders").insert(parsed.data.recommenders.map((r) => ({ user_id: uid, name: r.name, email: r.email || null, title: r.title || null, organization: r.organization || null, relationship: r.relationship || null, phone: r.phone || null })));
  }
  await logEvent({ userId: uid, actor: "user", action: "profile.details_saved", context: { recommenders: parsed.data.recommenders.length } });
  const resumed = await resumeAfterProfileChange(uid, "form details");
  return NextResponse.json({ ok: true, resumed });
}
