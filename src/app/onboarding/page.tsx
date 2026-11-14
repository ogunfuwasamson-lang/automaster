import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { loadProfile, REGIONS } from "@/lib/profile";
import { userPlan } from "@/lib/budget";
import { Onboarding } from "./wizard";
import { confirmReturn } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get started", robots: { index: false, follow: false } };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; mail?: string; paid?: string }> }) {
  const auth = await requireUser();
  if (!auth) redirect("/login?mode=signup");
  const uid = auth.user.id;
  const sp = await searchParams;
  // setup no longer has a payment or a gmail screen: anyone sent back here from either lands on the dashboard
  if (sp.paid) {
    await confirmReturn(uid, sp.paid).catch(() => null);
    redirect("/settings#plan");
  }
  if (sp.mail) redirect(`/settings?mail=${encodeURIComponent(sp.mail)}`);
  const db = admin();
  const [{ data: prof }, { data: docs }, { plan }] = await Promise.all([
    db.from("profiles").select("profile, target_term").eq("id", uid).single(),
    db.from("documents").select("kind").eq("user_id", uid),
    userPlan(uid),
  ]);
  const p = loadProfile(prof?.profile);
  return (
    <Onboarding
      userId={uid}
      initialStep={sp.step ? Number(sp.step) || 1 : 1}
      level={p.goals.study_level}
      fields={p.goals.fields ?? []}
      term={p.goals.target_term ?? prof?.target_term ?? null}
      regions={p.preferences.regions ?? []}
      allRegions={REGIONS}
      maxRegions={plan.maxRegions}
      docCount={docs?.length ?? 0}
      hasCv={(docs ?? []).some((d) => d.kind === "cv")}
    />
  );
}
