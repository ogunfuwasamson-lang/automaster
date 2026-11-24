import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { composioMail, gmailConfigured } from "@/lib/gmail";
import { PageHeader } from "@/components/ui/page";
import { Dial, FeeEnvelope, DigestToggle, NewsToggle, MailCard, RunnerCard, DeleteAccount, CalendarCard } from "./controls";
import { isOptedOut } from "@/lib/broadcast";
import type { GrantMode } from "@/lib/policy";
import { PlanCard } from "@/components/billing/pay";
import { billingState, confirmReturn } from "@/lib/billing";
import { bachsReady } from "@/lib/bachs";
import { calendarAccount, gcalReady } from "@/lib/gcal";
import { MyLessons } from "@/components/learning/lessons-admin";
import { InviteCard } from "@/components/growth/invite-card";
import { GROUP_SIZE, inviteUrl, referralCode, referralStats } from "@/lib/referrals";
import { isLocked } from "@/lib/free-tier";
import { CREDITS } from "@/lib/credit-prices";

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

export default async function Settings({ searchParams }: { searchParams: Promise<{ mail?: string; paid?: string; calendar?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const uid = auth.user.id;
  const db = admin();
  const { mail, paid, calendar } = await searchParams;
  // back from a Bachs checkout: confirm it now rather than waiting for the webhook
  if (paid) await confirmReturn(uid, paid).catch(() => null);
  const bill = await billingState(uid);
  const [{ data: grants }, { data: prof }, { data: acct }, { data: tokens }] = await Promise.all([
    auth.sb.from("grants").select("capability, mode, undo_seconds"),
    db.from("profiles").select("fee_envelope_cents, digest_enabled, plan").eq("id", uid).single(),
    db.from("mail_accounts").select("email, status, last_error").eq("user_id", uid).maybeSingle(),
    db.from("runner_tokens").select("id, label, created_at, last_used_at").eq("user_id", uid).is("revoked_at", null).order("created_at", { ascending: false }),
  ]);
  // the inbox the portals write to: the agents can only read codes and reset links if this is the Gmail connected
  const { data: logins } = await db.from("portal_accounts").select("login_email").eq("user_id", uid).limit(200);
  const portalEmails = [...new Set((logins ?? []).map((l) => (l.login_email as string).toLowerCase()))];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Settings" description="What the agents do on their own, and where they act for you." />

      <Group title="Gmail" description="Lets the agents email as you and read what schools send back.">
        <MailCard available={gmailConfigured()} email={acct?.email ?? null} status={acct?.status ?? null} error={acct?.last_error ?? null} notice={mail ?? null} via={composioMail() ? "composio" : "google"} signedInAs={auth.user.email ?? null} portalEmails={portalEmails} />
      </Group>

      <Group title="Calendar" description="Where webinars, deadlines and interviews land.">
        <CalendarCard available={gcalReady()} connected={!!(await calendarAccount(uid).catch(() => null))} notice={calendar ?? null} />
      </Group>

      <Group title="Autonomy" description="Choose what happens without asking. Signing and new claims about you always come to you.">
        <Dial grants={(grants ?? []) as { capability: string; mode: GrantMode; undo_seconds: number }[]} />
      </Group>

      <Group title="Application fees">
        <FeeEnvelope usd={Math.round((prof?.fee_envelope_cents ?? 0) / 100)} />
      </Group>

      <Group title="Emails">
        <div className="space-y-5">
          <DigestToggle enabled={prof?.digest_enabled ?? true} />
          <NewsToggle enabled={!(await isOptedOut(uid))} />
        </div>
      </Group>

      <section className="border-t border-line pt-8">
        <RunnerCard tokens={tokens ?? []} />
      </section>

      <Group title="Invite friends" description={`When a friend finishes setup, you both get ${CREDITS.invite} credits, enough for one application.`}>
        <div id="invite" className="scroll-mt-24">
          <InviteSection uid={uid} />
        </div>
      </Group>

      <Group title="Credits" description="What the agents do is paid in credits: an application, a programme or scholarship check, a funding request.">
        <div id="plan" className="scroll-mt-24">
          <PlanCard model={bill.pricing.model} label={bill.pricing.label} credits={bill.credits} held={bill.held} expiring={bill.expiring} bonus={bill.bonus} pro={bill.pro} until={bill.planUntil} cancelled={bill.cancelled} ready={bachsReady()} back="settings" />
          <Link href="/credits" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
            See what your credits were used on
          </Link>
        </div>
      </Group>

      <Group title="What Ivyward has learned about you" description="From your essay edits, revision notes and shortlist choices. Used only for you.">
        <MyLessons lessons={(((await db.from("lessons").select("id, agent, text").eq("scope", "user").eq("user_id", uid).eq("status", "active").order("created_at", { ascending: false }).limit(40)).data) ?? []) as { id: string; agent: string; text: string }[]} />
      </Group>

      <Group title="Account">
        <DeleteAccount email={auth.user.email ?? "your account"} />
      </Group>
    </div>
  );
}

async function InviteSection({ uid }: { uid: string }) {
  const [code, stats, locked] = await Promise.all([referralCode(uid).catch(() => null), referralStats(uid).catch(() => ({ bonus: 0, joined: 0, finished: 0, requests: 0 })), isLocked(uid).catch(() => false)]);
  return <InviteCard url={code ? inviteUrl(code) : null} joined={stats.joined} finished={stats.finished} bonus={stats.bonus} requests={stats.requests} locked={locked} groupAt={GROUP_SIZE - 1} />;
}
