import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { loadProfile, REGIONS } from "@/lib/profile";
import { composioMail, gmailConfigured } from "@/lib/gmail";
import { userPlan } from "@/lib/budget";
import { Onboarding } from "./wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get started" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; mail?: string }> }) {
  const auth = await requireUser();
  if (!auth) redirect("/login?mode=signup");
  const uid = auth.user.id;
  const db = admin();
  const [{ data: prof }, { count: docs }, { data: mail }, { plan }] = await Promise.all([
    db.from("profiles").select("profile, target_term").eq("id", uid).single(),
    db.from("documents").select("id", { count: "exact", head: true }).eq("user_id", uid),
    db.from("mail_accounts").select("email, status").eq("user_id", uid).maybeSingle(),
    userPlan(uid),
  ]);
  const p = loadProfile(prof?.profile);
  const sp = await searchParams;
  return (
    <Onboarding
      userId={uid}
      initialStep={sp.step ? Number(sp.step) : sp.mail ? 4 : 1}
      level={p.goals.study_level}
      fields={p.goals.fields ?? []}
      term={p.goals.target_term ?? prof?.target_term ?? null}
      regions={p.preferences.regions ?? []}
      allRegions={REGIONS}
      maxRegions={plan.maxRegions}
      docCount={docs ?? 0}
      mailEmail={mail?.status === "active" ? mail.email : null}
      mailAvailable={gmailConfigured()}
      mailVia={composioMail() ? "composio" : "google"}
      mailNotice={sp.mail ?? null}
    />
  );
}
