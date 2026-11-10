import { resumeAfterProfileChange } from "@/lib/requeue";
import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { NEVER_FILL } from "@/lib/fillsheet";
import { DetailsSchema } from "@/lib/details-schema";
import { kickoff } from "@/lib/kickoff";
import { enqueue } from "@/lib/queue";

export const runtime = "nodejs";

const NAME_KEYS = ["legal_first_name", "legal_middle_name", "legal_last_name", "preferred_name"];

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
  // a digit in a legal name is always a typo ("Sams9lon"), and portals reject it after the account is half made
  const badName = NAME_KEYS.find((k) => typeof details[k] === "string" && /\d/.test(details[k] as string));
  if (badName) return NextResponse.json({ error: `your ${badName.replace(/_/g, " ")} has a number in it: check the spelling (exactly as on your passport)` }, { status: 400 });
  const { data: cur } = await db.from("profiles").select("portal_details").eq("id", uid).single();
  await db.from("profiles").update({ portal_details: { ...((cur?.portal_details as Record<string, unknown>) ?? {}), ...details } }).eq("id", uid);
  await db.from("recommenders").delete().eq("user_id", uid);
  if (parsed.data.recommenders.length) {
    await db.from("recommenders").insert(parsed.data.recommenders.map((r) => ({ user_id: uid, name: r.name, email: r.email || null, title: r.title || null, organization: r.organization || null, relationship: r.relationship || null, phone: r.phone || null })));
  }
  await logEvent({ userId: uid, actor: "user", action: "profile.details_saved", context: { recommenders: parsed.data.recommenders.length } });
  // referees with an email are on file now: applications that were waiting for them get their requests drafted
  // (the closer never asks the same person twice for the same application)
  if (parsed.data.recommenders.some((r) => r.email)) {
    const { data: waiting } = await db.from("applications").select("id").eq("user_id", uid).in("status", ["preparing", "ready_for_review", "packet_approved"]).limit(20);
    for (const a of waiting ?? []) {
      await enqueue({ userId: uid, agent: "closer", task: "reference_requests", payload: { applicationId: a.id }, idempotencyKey: `refs:${a.id}:${new Date().toISOString().slice(0, 10)}` }).catch(() => null);
    }
  }
  const resumed = await resumeAfterProfileChange(uid, "form details");
  const k = await kickoff(uid, "details").catch(() => null);
  return NextResponse.json({ ok: true, resumed, shortlist: k?.shortlist ?? false, missing: k?.missing ?? [] });
}
