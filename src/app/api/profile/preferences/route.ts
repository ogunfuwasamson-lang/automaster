import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/profile-store";
import { REGIONS } from "@/lib/profile";
import { logEvent } from "@/lib/events";
import { userPlan } from "@/lib/budget";

// the user's own choices of where and what to study. set directly, no agent in between.
const Body = z.object({
  study_level: z.enum(["undergraduate", "masters", "phd"]).optional(),
  regions: z.array(z.string()).max(9).optional(),
  degree_types: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  fields: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  target_term: z.string().trim().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { regions, degree_types, study_level, fields, target_term } = parsed.data;
  const cleanRegions = regions?.filter((r) => REGIONS[r]);
  const { plan } = await userPlan(auth.user.id);
  if (cleanRegions && cleanRegions.length > plan.maxRegions) {
    return NextResponse.json({ error: `your ${plan.name} plan covers ${plan.maxRegions} region${plan.maxRegions > 1 ? "s" : ""}. upgrade to pro for all of them.` }, { status: 402 });
  }
  await updateProfile(auth.user.id, (p) => ({
    ...p,
    preferences: cleanRegions ? { ...p.preferences, regions: cleanRegions } : p.preferences,
    goals: { ...p.goals, ...(degree_types ? { degree_types } : {}), ...(study_level ? { study_level } : {}), ...(fields ? { fields } : {}), ...(target_term ? { target_term } : {}) },
  }));
  await logEvent({ userId: auth.user.id, actor: "user", action: "preferences.updated", context: { regions: cleanRegions, degree_types, study_level } });
  return NextResponse.json({ ok: true });
}
