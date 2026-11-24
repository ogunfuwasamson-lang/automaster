import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/ui/page";
import { Tag } from "@/components/ui/chip";
import { PlanCard } from "@/components/billing/pay";
import { InviteCard } from "@/components/growth/invite-card";
import { billingState, confirmReturn } from "@/lib/billing";
import { bachsReady } from "@/lib/bachs";
import { creditHistory, type HistoryItem } from "@/lib/wallet";
import { CREDITS } from "@/lib/credit-prices";
import { GROUP_SIZE, inviteUrl, referralCode, referralStats } from "@/lib/referrals";

export const dynamic = "force-dynamic";
export const metadata = { title: "Credits" };

// the credit wallet (lib/wallet): what's left, what each thing costs, every credit in and out, and how to get more.
// the balance in the top bar links here; so do the low-credit notices.

const USES: [string, number, string][] = [
  ["An application", CREDITS.application, "Set aside when the agents start preparing it, spent when it's submitted, and returned if you drop it first."],
  ["Checking a programme or a scholarship", CREDITS.check, "The agents read its official pages and check your fit. Free for programmes from Ivyward's checked library."],
  ["A funding request", CREDITS.request, "A fee waiver, scholarship or aid request the agents send for you."],
];

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// a search checks several programmes at once: one row per day for those, with the programmes listed under it
type Row = HistoryItem & { count?: number; names?: string[] };
function group(items: HistoryItem[]): Row[] {
  const out: Row[] = [];
  for (const it of items) {
    const last = out[out.length - 1];
    const isCheck = it.dir === "out" && it.title.startsWith("Checked");
    if (isCheck && last?.count && last.at.slice(0, 10) === it.at.slice(0, 10) && last.status === it.status) {
      last.count++;
      last.amount += it.amount;
      last.names!.push(it.title.replace(/^Checked /, "") + (it.detail ? `, ${it.detail}` : ""));
      continue;
    }
    out.push(isCheck ? { ...it, count: 1, names: [it.title.replace(/^Checked /, "") + (it.detail ? `, ${it.detail}` : "")] } : { ...it });
  }
  return out.map((r) => (r.count && r.count > 1 ? { ...r, title: `Checked ${r.count} programmes`, detail: null } : r));
}

function Status({ r }: { r: Row }) {
  if (r.dir === "in") {
    const now = new Date().toISOString();
    if (!r.expires) return <span className="text-xs text-muted">No expiry</span>;
    return <span className="text-xs text-muted">{r.expires < now ? `Expired ${day(r.expires)}` : `Until ${day(r.expires)}`}</span>;
  }
  if (r.status === "held") return <Tag tone="accent">Set aside</Tag>;
  if (r.status === "returned") return <Tag>Returned</Tag>;
  return null;
}

export default async function Credits({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const uid = auth.user.id;
  const { paid } = await searchParams;
  // back from a checkout: confirm it now rather than waiting for the webhook
  if (paid) await confirmReturn(uid, paid).catch(() => null);
  const [bill, history, code, stats] = await Promise.all([
    billingState(uid),
    creditHistory(uid).catch(() => [] as HistoryItem[]),
    referralCode(uid).catch(() => null),
    referralStats(uid).catch(() => ({ bonus: 0, joined: 0, finished: 0, requests: 0 })),
  ]);
  const rows = group(history);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader title="Credits" description="What you have, what the agents used it on, and how to get more." />

      <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section id="plan" className="scroll-mt-24 rounded-3xl border border-line bg-surface px-5 py-5 shadow-card" aria-label="Your credits">
          <PlanCard model={bill.pricing.model} label={bill.pricing.label} credits={bill.credits} held={bill.held} expiring={bill.expiring} bonus={bill.bonus} pro={bill.pro} until={bill.planUntil} cancelled={bill.cancelled} ready={bachsReady()} explain={false} back="credits" />
        </section>
        <section className="rounded-3xl border border-line bg-surface px-5 py-5 shadow-card">
          <h2 className="font-semibold">What uses credits</h2>
          <dl className="mt-3 divide-y divide-line">
            {USES.map(([what, n, how]) => (
              <div key={what} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-3 first:pt-0 last:pb-0">
                <dt className="text-sm font-medium">{what}</dt>
                <dd className="font-serif text-[20px] leading-none tabular">{n}</dd>
                <dd className="col-span-2 mt-1 text-[13px] leading-relaxed text-muted">{how}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <Section title="Invite a friend">
        <div className="rounded-3xl border border-line bg-surface px-5 py-4 shadow-card">
          <InviteCard url={code ? inviteUrl(code) : null} joined={stats.joined} finished={stats.finished} bonus={stats.bonus} requests={stats.requests} groupAt={GROUP_SIZE - 1} />
        </div>
      </Section>

      <Section title="History" description="Every credit in and out, newest first.">
        {rows.length ? (
          <ol className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
            {rows.map((r, i) => (
              <li key={`${r.at}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 px-5 py-3.5 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto]">
                <time dateTime={r.at} className="text-xs text-muted sm:pt-0.5">{day(r.at)}</time>
                <div className="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1">
                  <p className="text-sm font-medium">
                    {r.href ? (
                      <Link href={r.href} className="underline-offset-4 hover:underline">
                        {r.title}
                      </Link>
                    ) : (
                      r.title
                    )}
                  </p>
                  {r.detail ? <p className="truncate text-[13px] text-muted">{r.detail}</p> : null}
                  {r.names && r.names.length > 1 ? (
                    <details className="mt-1 text-[13px] text-muted">
                      <summary className="cursor-pointer select-none hover:text-foreground">Which ones</summary>
                      <ul className="mt-1 space-y-0.5">
                        {r.names.map((n, j) => (
                          <li key={j} className="truncate">{n}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {r.dir === "in" && r.left !== undefined && r.left < r.amount && r.left > 0 ? <p className="text-[13px] text-muted">{r.left} of these left</p> : null}
                </div>
                <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-end gap-1 sm:col-start-3 sm:row-span-1">
                  <span className={`font-serif text-[19px] leading-none tabular ${r.dir === "in" ? "text-go" : r.status === "returned" ? "text-muted line-through decoration-1" : ""}`}>
                    {r.dir === "in" ? "+" : "−"}
                    {r.amount}
                  </span>
                  <Status r={r} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-3xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
            Nothing yet. Credits you buy or earn appear here, and so does everything the agents spend them on.
          </p>
        )}
      </Section>
    </div>
  );
}
