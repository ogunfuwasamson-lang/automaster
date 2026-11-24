import { bankOf, moneyOf, withdrawalsOf } from "@/lib/creators";
import { TERMS, monthLabel, naira } from "@/lib/creator-terms";
import { Box, Stat, StatusPill, shortDay } from "../parts";
import { BankForm, WithdrawForm } from "../ui";
import { liveCreator } from "../live";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts" };

// what the creator has earned, what's been paid, the bank account payouts go to, and each payout request
export default async function Payouts() {
  const { creator } = await liveCreator();
  const [money, bank, ws] = await Promise.all([moneyOf(creator.id), bankOf(creator.id), withdrawalsOf(creator.id)]);
  const waiting = ws.some((w) => w.status === "pending");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[34px] leading-tight">Payouts</h1>
        <p className="mt-1 text-[14.5px] text-muted">Ask for a payout whenever you have {naira(TERMS.minWithdrawal)} or more. The team sends it to your bank or mobile money, in your currency, within {TERMS.payoutHours} hours.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ready to withdraw" value={naira(money.available)} tone={money.available >= TERMS.minWithdrawal ? "go" : undefined} />
        <Stat label="On its way" value={naira(money.pending)} tone={money.pending ? "signal" : undefined} sub={money.pending ? `Within ${TERMS.payoutHours} hours of your request` : "Nothing waiting"} />
        <Stat label="Paid to you" value={naira(money.paid)} sub="All time" />
        <Stat
          label="This month so far"
          value={naira(money.thisMonth.base)}
          tone={money.thisMonth.unlocked ? undefined : "signal"}
          sub={money.thisMonth.unlocked ? (money.pendingBonus ? `Plus ${naira(money.pendingBonus)} bonus when the month closes` : "Already in your balance") : `Pays once you reach ${TERMS.payFrom}: ${(TERMS.payFrom - money.thisMonth.qualified).toLocaleString()} to go`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Box title="Request a payout">
          <WithdrawForm available={money.available} hasBank={!!bank} waiting={waiting} active={creator.status === "active"} />
          {bank ? (
            <p className="mt-3 text-[13px] text-muted">
              Goes to {bank.label}, {bank.account_name}
              {bank.currency !== "NGN" ? `, paid in ${bank.currency} at the day's rate` : ""}.
            </p>
          ) : null}
        </Box>
        <Box title="Payout details" note={bank ? `Updated ${shortDay(bank.updated_at)}.` : "Where your payouts go, in your currency."}>
          <BankForm bank={bank} />
        </Box>
      </div>

      <Box title="Payout requests">
        {ws.length ? (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[40rem] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-5 pb-2 font-medium sm:px-6">Requested</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 pl-6 font-medium">To</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="px-5 pb-2 font-medium sm:px-6">Reference</th>
                </tr>
              </thead>
              <tbody>
                {ws.map((w) => (
                  <tr key={w.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-muted sm:px-6">{shortDay(w.requested_at)}</td>
                    <td className="py-3 text-right font-medium tabular-nums">{naira(w.amount_ngn)}</td>
                    <td className="py-3 pl-6 text-muted">
                      {w.bank.label ?? "Bank"}
                      {w.bank.currency && w.bank.currency !== "NGN" ? ` · ${w.bank.currency}` : ""}
                    </td>
                    <td className="py-3">
                      <StatusPill status={w.status === "pending" ? "waiting" : w.status === "rejected" ? "declined" : "paid"} />
                      {w.status === "paid" && w.processed_at ? <p className="mt-1 text-[12px] text-muted">{shortDay(w.processed_at)}</p> : null}
                      {w.note ? <p className="mt-1 max-w-[16rem] text-[12px] text-muted">{w.note}</p> : null}
                    </td>
                    <td className="px-5 py-3 text-muted sm:px-6">{w.reference ?? "·"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[14px] text-muted">No payout requests yet.</p>
        )}
      </Box>

      <Box title="Earnings by month" note={`A month pays once it reaches ${TERMS.payFrom} qualified sign-ups: then your rate for every one, plus ${naira(TERMS.bonusPerStep)} for every ${TERMS.bonusStep} above ${TERMS.target.toLocaleString()}.`}>
        {money.months.length ? (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[34rem] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-5 pb-2 font-medium sm:px-6">Month</th>
                  <th className="pb-2 text-right font-medium">Qualified</th>
                  <th className="pb-2 text-right font-medium">Base</th>
                  <th className="pb-2 text-right font-medium">Bonus</th>
                  <th className="px-5 pb-2 text-right font-medium sm:px-6">Total</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {money.months.map((m) => (
                  <tr key={m.key} className="border-t border-line">
                    <td className="px-5 py-3 sm:px-6">
                      {monthLabel(m.key)}
                      {!m.closed ? <span className="ml-2 text-[12px] text-muted">so far</span> : null}
                      {!m.unlocked ? <span className="ml-2 text-[12px] text-signal">{m.closed ? `ended under ${TERMS.payFrom}` : `pays from ${TERMS.payFrom}`}</span> : null}
                    </td>
                    <td className="py-3 text-right">{m.qualified.toLocaleString()}</td>
                    <td className={`py-3 text-right ${m.unlocked ? "" : "text-muted line-through decoration-1"}`}>{naira(m.base)}</td>
                    <td className="py-3 text-right text-muted">{m.bonus ? `${naira(m.bonus)}${m.closed ? "" : " at month end"}` : "·"}</td>
                    <td className="px-5 py-3 text-right font-medium sm:px-6">{naira(m.unlocked ? m.base + (m.closed ? m.bonus : 0) : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[14px] text-muted">Your earnings show here month by month once your first sign-up qualifies.</p>
        )}
      </Box>
    </div>
  );
}
