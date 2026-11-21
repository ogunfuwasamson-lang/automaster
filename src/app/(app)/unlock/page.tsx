import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page";
import { BuyPack, UpgradeLink } from "@/components/billing/pay";
import { InviteCard } from "@/components/growth/invite-card";
import { billingState } from "@/lib/billing";
import { bachsReady } from "@/lib/bachs";
import { isLocked } from "@/lib/free-tier";
import { GROUP_SIZE, inviteUrl, referralCode, referralStats } from "@/lib/referrals";
import { UNLOCK_FRIENDS } from "@/lib/credit-rules";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unlock your agents" };

// where "Unlock your agents" leads: the two ways to unlock, side by side (lib/free-tier)
export default async function Unlock() {
  const auth = await requireUser();
  if (!auth) return null;
  const uid = auth.user.id;
  const [locked, bill, code, stats] = await Promise.all([
    isLocked(uid).catch(() => true),
    billingState(uid),
    referralCode(uid).catch(() => null),
    referralStats(uid).catch(() => ({ bonus: 0, joined: 0, finished: 0, requests: 0 })),
  ]);
  if (!locked)
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title="Your agents are unlocked" description="They're checking your fit and preparing your applications." />
        <Link href="/shortlist" className="font-semibold underline underline-offset-4">
          Open your shortlist
        </Link>
      </div>
    );
  const pack = bill.pricing.model === "pack";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Unlock your agents" description="Pay, or invite 2 friends who finish setup." />
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface px-5 py-5 shadow-card">
          <h2 className="font-semibold">Pay</h2>
          <p className="mt-1 text-sm text-muted">{pack ? `${bill.pricing.label}. Unlocks the agents straight away.` : "Pro, $20 a month. Unlocks the agents straight away."}</p>
          <div className="mt-4">
            {!bachsReady() ? <p className="text-sm text-muted">Payments open shortly.</p> : pack ? <BuyPack label={bill.pricing.label} back="settings">{`Buy ${bill.pricing.label}`}</BuyPack> : <UpgradeLink kind="pro">Go Pro</UpgradeLink>}
          </div>
        </section>
        <section className="rounded-3xl border border-line bg-surface px-5 py-4 shadow-card">
          <h2 className="font-semibold">Invite 2 friends</h2>
          <InviteCard url={code ? inviteUrl(code) : null} joined={stats.joined} finished={stats.finished} bonus={stats.bonus} requests={stats.requests} locked unlockAt={UNLOCK_FRIENDS} groupAt={GROUP_SIZE - 1} />
        </section>
      </div>
    </div>
  );
}
