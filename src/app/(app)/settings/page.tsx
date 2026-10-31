import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { composioMail, gmailConfigured } from "@/lib/gmail";
import { PageHeader } from "@/components/ui/page";
import { Dial, FeeEnvelope, DigestToggle, MailCard, RunnerCard, DeleteAccount } from "./controls";
import type { GrantMode } from "@/lib/policy";
import { PlanCard } from "@/components/billing/pay";
import { billingState, confirmReturn } from "@/lib/billing";
import { bachsReady } from "@/lib/bachs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="min-w-0 rounded-3xl border border-line bg-surface shadow-card px-5 py-4">{children}</div>
    </section>
  );
}

export default async function Settings({ searchParams }: { searchParams: Promise<{ mail?: string; paid?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const uid = auth.user.id;
  const db = admin();
  const { mail, paid } = await searchParams;
  // back from a Bachs checkout: confirm it now rather than waiting for the webhook
  if (paid) await confirmReturn(uid, paid).catch(() => null);
  const bill = await billingState(uid);
  const SENT = "(submitted,under_review,interview,waitlisted,admitted,accepted,declined,rejected)";
  const [{ count: used }, { count: paidThisMonth }] = await Promise.all([
    db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", uid).or(`status.in.${SENT},paid_at.not.is.null`),
    db.from("billing_events").select("reference", { count: "exact", head: true }).eq("user_id", uid).eq("kind", "submission").gte("created_at", new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()),
  ]);
  const [{ data: grants }, { data: prof }, { data: acct }, { data: tokens }] = await Promise.all([
    auth.sb.from("grants").select("capability, mode, undo_seconds"),
    db.from("profiles").select("fee_envelope_cents, digest_enabled, plan").eq("id", uid).single(),
    db.from("mail_accounts").select("email, status, last_error").eq("user_id", uid).maybeSingle(),
    db.from("runner_tokens").select("id, label, created_at, last_used_at").eq("user_id", uid).is("revoked_at", null).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Settings" description="What the agents do on their own, and where they act for you." />

      <Group title="Gmail" description="Lets the agents email as you and read what schools send back.">
        <MailCard available={gmailConfigured()} email={acct?.email ?? null} status={acct?.status ?? null} error={acct?.last_error ?? null} notice={mail ?? null} via={composioMail() ? "composio" : "google"} />
      </Group>

      <Group title="Autonomy" description="Choose what happens without asking. Signing and new claims about you always come to you.">
        <Dial grants={(grants ?? []) as { capability: string; mode: GrantMode; undo_seconds: number }[]} />
      </Group>

      <Group title="Application fees">
        <FeeEnvelope usd={Math.round((prof?.fee_envelope_cents ?? 0) / 100)} />
      </Group>

      <Group title="Digest">
        <DigestToggle enabled={prof?.digest_enabled ?? true} />
      </Group>

      <section className="border-t border-line pt-8">
        <RunnerCard tokens={tokens ?? []} />
      </section>

      <Group title="Plan" description={bill.pricing.model === "per_submission" ? "Pay only for what you submit." : "Free to start; Pro when you need more."}>
        <div id="plan" className="scroll-mt-24">
          <PlanCard model={bill.pricing.model} label={bill.pricing.label} free={bill.pricing.model === "subscription" ? bill.pricing.free : 0} used={used ?? 0} paidThisMonth={paidThisMonth ?? 0} pro={bill.pro} until={bill.planUntil} cancelled={bill.cancelled} ready={bachsReady()} />
        </div>
      </Group>

      <Group title="Account">
        <DeleteAccount email={auth.user.email ?? "your account"} />
      </Group>
    </div>
  );
}
