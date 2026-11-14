import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { loadProfile, REGIONS } from "@/lib/profile";
import { composioMail, gmailConfigured } from "@/lib/gmail";
import { userPlan } from "@/lib/budget";
import { Onboarding } from "./wizard";
import { billingState, confirmReturn } from "@/lib/billing";
import { bachsReady } from "@/lib/bachs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get started", robots: { index: false, follow: false } };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; mail?: string; paid?: string }> }) {
  const auth = await requireUser();
  if (!auth) redirect("/login?mode=signup");
  const uid = auth.user.id;
  const db = admin();
  const [{ data: prof }, { count: docs }, { data: mail }, { plan }] = await Promise.all([
    db.from("profiles").select("profile, target_term, portal_details").eq("id", uid).single(),
    db.from("documents").select("id", { count: "exact", head: true }).eq("user_id", uid),
    db.from("mail_accounts").select("email, status").eq("user_id", uid).maybeSingle(),
    userPlan(uid),
  ]);
  const p = loadProfile(prof?.profile);
  const sp = await searchParams;
  // back from paying for a pack: confirm it now rather than waiting for the webhook
  const paid = sp.paid ? await confirmReturn(uid, sp.paid).catch(() => null) : null;
  const bill = await billingState(uid);
  // the first submission is free, so setup doesn't ask for money: the pack is offered when that one is used
  const freeFirst = bill.bonus > 0 && bill.credits === 0 && !sp.paid;
  const pack = bill.pricing.model === "pack" && !bill.exempt && !freeFirst ? { label: bill.pricing.label, each: bill.pricing.each, size: bill.pricing.size, credits: bill.credits, bonus: bill.bonus, justPaid: !!paid?.applied || (!!sp.paid && bill.credits > 0), ready: bachsReady() } : null;
  return (
    <Onboarding
      userId={uid}
      initialStep={sp.step ? Number(sp.step) : sp.mail ? 5 : 1}
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
      pack={pack}
      details={(prof?.portal_details as Record<string, string | null>) ?? {}}
    />
  );
}
