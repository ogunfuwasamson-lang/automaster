import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { loadProfile, REGIONS, type Profile } from "@/lib/profile";
import { userPlan } from "@/lib/budget";
import { Onboarding } from "./wizard";
import { confirmReturn } from "@/lib/billing";
import { updateProfile } from "@/lib/profile-store";
import { logEvent } from "@/lib/events";
import { startShortlist } from "@/lib/kickoff";
import { applySharpen } from "@/lib/sharpen";
import { composioMail, gmailConfigured } from "@/lib/gmail";
import { calendarAccount, gcalReady } from "@/lib/gcal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get started", robots: { index: false, follow: false } };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; mail?: string; calendar?: string; paid?: string; level?: string; fields?: string; regions?: string; citizenship?: string; funding?: string; budget?: string; english?: string; tests?: string }> }) {
  const auth = await requireUser();
  if (!auth) redirect("/login?mode=signup");
  const uid = auth.user.id;
  const sp = await searchParams;
  // setup no longer has a payment screen: anyone sent back here from one lands on their credits
  if (sp.paid) {
    await confirmReturn(uid, sp.paid).catch(() => null);
    redirect("/credits");
  }
  const db = admin();
  const [{ data: prof }, { data: docs }, { plan }, { data: mail }, cal] = await Promise.all([
    db.from("profiles").select("profile, target_term").eq("id", uid).single(),
    db.from("documents").select("kind").eq("user_id", uid),
    userPlan(uid),
    db.from("mail_accounts").select("email, status").eq("user_id", uid).maybeSingle(),
    calendarAccount(uid).catch(() => null),
  ]);
  let p = loadProfile(prof?.profile);
  // arriving from the public matcher (/match) with choices made before sign-up: keep them (only into an empty
  // profile) and open on the matches screen
  // back from google's screen (gmail or the calendar): the connect step again, with how it went
  let step = sp.mail ? 4 : sp.step ? Number(sp.step) || 1 : 1;
  const level = ["undergraduate", "masters", "phd"].includes(sp.level ?? "") ? (sp.level as "undergraduate" | "masters" | "phd") : null;
  const regions = (sp.regions ?? "").split(",").filter((r) => REGIONS[r]).slice(0, plan.maxRegions);
  const fields = (sp.fields ?? "").split("|").map((f) => f.trim().slice(0, 60)).filter(Boolean).slice(0, 8);
  if (level && regions.length && !p.goals.study_level && !(p.preferences.regions ?? []).length) {
    // and any "sharpen your matches" answers given on the matcher
    const carried = (["citizenship", "funding", "budget", "english", "tests"] as const).filter((k) => sp[k]).map((k) => [k, String(sp[k]).slice(0, 60)] as const);
    p = await updateProfile(uid, (x) => {
      let out: Profile = { ...x, preferences: { ...x.preferences, regions }, goals: { ...x.goals, study_level: level, ...(fields.length ? { fields } : {}) } };
      for (const [k, v] of carried) out = applySharpen(out, k, v);
      return out;
    });
    await logEvent({ userId: uid, actor: "user", action: "preferences.updated", context: { regions, study_level: level, source: "matcher" } }).catch(() => {});
    await startShortlist(uid, "matcher").catch(() => false);
    step = 3;
  }
  return (
    <Onboarding
      userId={uid}
      initialStep={step}
      level={p.goals.study_level}
      fields={p.goals.fields ?? []}
      term={p.goals.target_term ?? prof?.target_term ?? null}
      regions={p.preferences.regions ?? []}
      allRegions={REGIONS}
      maxRegions={plan.maxRegions}
      docCount={docs?.length ?? 0}
      hasCv={(docs ?? []).some((d) => d.kind === "cv")}
      hasTranscript={(docs ?? []).some((d) => d.kind === "transcript")}
      hasCertificate={(docs ?? []).some((d) => d.kind === "degree_certificate" || d.kind === "degree_cert")}
      gmail={{ available: gmailConfigured(), email: mail?.email ?? null, active: mail?.status === "active", composio: composioMail(), notice: sp.mail ?? null }}
      calendar={{ available: gcalReady(), connected: !!cal, notice: sp.calendar ?? null }}
    />
  );
}
