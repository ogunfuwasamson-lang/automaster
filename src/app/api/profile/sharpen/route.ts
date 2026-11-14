import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { getProfile, updateProfile } from "@/lib/profile-store";
import { logEvent } from "@/lib/events";
import { applySharpen, sharpenState, type SharpenKey } from "@/lib/sharpen";
import { openScholarships } from "@/lib/open-scholarships";
import type { Profile } from "@/lib/profile";

export const runtime = "nodejs";

const Body = z.object({
  key: z.enum(["citizenship", "funding", "budget", "english", "tests", "grades", "applying"]),
  value: z.string().trim().min(1).max(60),
});

async function state(userId: string, p: Profile) {
  const { data } = await admin().from("profiles").select("portal_details").eq("id", userId).single();
  const passport = ((data?.portal_details ?? {}) as Record<string, string | undefined>).passport_country ?? null;
  const s = sharpenState(p, passport);
  return {
    next: s.open[0] ?? null,
    done: s.done,
    total: s.total,
    scholarships: openScholarships(p.identity.citizenship ?? passport, p.preferences.regions ?? []).slice(0, 6),
  };
}

// "sharpen your matches" (lib/sharpen): the next question, and saving an answer
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await state(auth.user.id, await getProfile(auth.user.id)));
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick one of the answers" }, { status: 400 });
  const { key, value } = parsed.data;
  const p = await updateProfile(auth.user.id, (x) => applySharpen(x, key as SharpenKey, value));
  await logEvent({ userId: auth.user.id, actor: "user", action: "profile.sharpened", context: { key, value: key === "citizenship" ? "set" : value } }).catch(() => {});
  return NextResponse.json(await state(auth.user.id, p));
}
