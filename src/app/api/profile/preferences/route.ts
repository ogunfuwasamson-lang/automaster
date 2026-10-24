import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/profile-store";
import { REGIONS } from "@/lib/profile";
import { logEvent } from "@/lib/events";

// the user's own choices of where and what to study. set directly, no agent in between.
const Body = z.object({
  regions: z.array(z.string()).max(9).optional(),
  degree_types: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { regions, degree_types } = parsed.data;
  const cleanRegions = regions?.filter((r) => REGIONS[r]);
  await updateProfile(auth.user.id, (p) => ({
    ...p,
    preferences: cleanRegions ? { ...p.preferences, regions: cleanRegions } : p.preferences,
    goals: degree_types ? { ...p.goals, degree_types } : p.goals,
  }));
  await logEvent({ userId: auth.user.id, actor: "user", action: "preferences.updated", context: { regions: cleanRegions, degree_types } });
  return NextResponse.json({ ok: true });
}
