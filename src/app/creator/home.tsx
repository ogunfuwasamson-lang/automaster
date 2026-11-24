import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TERMS, monthLabel, naira } from "@/lib/creator-terms";
import type { Creator, overviewOf } from "@/lib/creators";
import { ApplyForm, CopyButton, DailyBars, MainLink, NewLink } from "./ui";
import { Box, Funnel, PayLadder, Stat, StatusPill, TargetMeter, WeekDots, shortDay } from "./parts";

// the creator studio's home screens (app/creator/page): the application, waiting for review, turned down, and the
// overview, each drawn from data passed in

function Terms() {
  const rows: [string, string][] = [
    ["Pay", `${naira(TERMS.rate)} for every qualified sign-up, once you reach ${TERMS.payFrom} in a month`],
    ["Monthly target", `${TERMS.target.toLocaleString()} qualified sign-ups`],
    ["Bonus", `${naira(TERMS.bonusPerStep)} for every extra ${TERMS.bonusStep} above ${TERMS.target.toLocaleString()}, each month`],
    ["Videos", `At least ${TERMS.videosPerMonth} a month, one a week, 30 to 90 seconds, vertical`],
    ["Payouts", `To your bank or mobile money, in your currency, within ${TERMS.payoutHours} hours of asking`],
  ];
  return (
    <dl className="divide-y divide-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5 text-[14px]">
          <dt className="text-muted">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const QUALIFIES = ["Opens Ivyward through your link", "Creates an account", "Uploads their CV", "Finishes their basic profile in setup"];

export function Apply({ name }: { name: string }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-[36px] leading-[1.08] sm:text-[44px]">Get paid to bring students to Ivyward</h1>
          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-muted">
            Post short, honest videos about your study-abroad journey with Ivyward, share your own link, and earn for every student who signs up through it and finishes their profile.
          </p>
        </div>
        <Box title="The terms">
          <Terms />
        </Box>
        <Box title="What counts as a sign-up" note="All four, and each person only once.">
          <ol className="space-y-2.5">
            {QUALIFIES.map((q, i) => (
              <li key={q} className="flex items-center gap-3 text-[14px]">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-[12.5px] font-semibold tabular-nums">{i + 1}</span>
                {q}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] text-muted">It takes a student about 90 seconds. A second account from the same phone doesn&apos;t count.</p>
        </Box>
      </div>
      <Box title="Apply" note="The team reviews applications within two working days. You'll get an email either way.">
        <ApplyForm name={name} />
      </Box>
    </div>
  );
}

export function Waiting({ c }: { c: Creator }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <StatusPill status="waiting" />
        <h1 className="mt-3 font-serif text-[36px] leading-tight">Your application is with the team</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Sent on {shortDay(c.created_at)}. You&apos;ll get an email when it&apos;s reviewed, usually within two working days. Once you&apos;re approved, this page becomes your dashboard: your link, your sign-ups and your payouts.
        </p>
      </div>
      <Box title="What you sent">
        <dl className="divide-y divide-line text-[14px]">
          {(
            [
              ["Name", c.name],
              ["WhatsApp", c.phone ?? ""],
              ...Object.entries(c.handles).map(([k, v]) => [k === "x" ? "X" : k[0].toUpperCase() + k.slice(1), v] as [string, string]),
              ["Followers", c.followers ?? ""],
              ["Your content", c.audience ?? ""],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </Box>
      <Box title="While you wait">
        <p className="text-[14px] leading-relaxed text-muted">
          Try Ivyward yourself, so your first video can show what it&apos;s really like: upload your CV, finish setup and look at the programmes it finds for you.
        </p>
        <Link href="/dashboard" className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium underline underline-offset-4">
          Open Ivyward <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </Box>
    </div>
  );
}

export function Declined({ c }: { c: Creator }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-serif text-[34px] leading-tight">We can&apos;t take your application forward right now</h1>
      <p className="text-[15px] leading-relaxed text-muted">{c.note ?? "Thank you for applying. You can still use Ivyward for your own applications."}</p>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-[14px] font-medium underline underline-offset-4">
        Open Ivyward <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

const hello = () => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export type OverviewData = Awaited<ReturnType<typeof overviewOf>>;

export function Overview({ c, o, today }: { c: Creator; o: OverviewData; today: string }) {
  const [y, m] = o.month.split("-").map(Number);
  const daysLeft = new Date(Date.UTC(y, m, 0)).getUTCDate() - Number(today.slice(8));
  const main = o.links[0];
  const mo = o.money.thisMonth;
  const posts = o.posts.length;
  return (
    <div className="space-y-6">
      {c.status === "paused" ? (
        <p role="status" className="rounded-2xl border border-signal/30 bg-signal/[0.06] px-4 py-3 text-[14px]">
          Your creator account is paused, so new visits and sign-ups aren&apos;t counted and payouts are on hold.{c.note ? ` ${c.note}` : ""} Message the Ivyward team on WhatsApp to sort it out.
        </p>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[34px] leading-tight sm:text-[40px]">
            {hello()}, {c.name.split(/\s+/)[0]}
          </h1>
          <p className="mt-1 text-[14.5px] text-muted">
            {monthLabel(o.month)}: {daysLeft === 0 ? "the last day of the month" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}. {naira(c.rate_ngn)} a qualified sign-up once the month reaches {TERMS.payFrom}.
          </p>
        </div>
      </header>

      <Box>
        <TargetMeter qualified={mo.qualified} />
      </Box>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Earned this month"
          value={naira(mo.base)}
          tone={mo.unlocked ? undefined : "signal"}
          sub={!mo.unlocked ? `Pays once you reach ${TERMS.payFrom}: ${(TERMS.payFrom - mo.qualified).toLocaleString()} to go` : mo.bonus ? `Plus a ${naira(mo.bonus)} bonus when the month closes` : `${mo.qualified.toLocaleString()} × ${naira(c.rate_ngn)}`}
        />
        <Stat label="Ready to withdraw" value={naira(o.money.available)} tone={o.money.available >= TERMS.minWithdrawal ? "go" : undefined} sub={<Link href="/creator/payouts" className="underline underline-offset-4 hover:text-foreground">{o.money.pending ? `${naira(o.money.pending)} on its way` : "Request a payout"}</Link>} />
        <Stat label="Visits this month" value={o.funnel.visits.toLocaleString()} sub={`${o.funnel.signups.toLocaleString()} made an account`} />
        <Stat label="Videos this month" value={`${posts} of ${TERMS.videosPerMonth}`} tone={posts >= TERMS.videosPerMonth ? "go" : undefined} sub={<Link href="/creator/videos" className="underline underline-offset-4 hover:text-foreground">Add a video</Link>} />
      </div>

      <Box
        title="Your links"
        note={main ? "Put one in your bio and your captions. Every visit, sign-up and payout is tracked to it." : "Make your link to start: it's what tracks your sign-ups."}
        action={<NewLink count={o.links.length} />}
      >
        {main ? (
          <div className="space-y-5">
            <MainLink url={main.url} />
            <ul className="divide-y divide-line border-t border-line sm:hidden">
              {o.links.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium">{l.label ?? "Your link"}</p>
                    <p className="truncate text-[12.5px] text-muted">/c/{l.code}</p>
                    <p className="mt-1 text-[12.5px] tabular-nums text-muted">
                      {l.stats.visits_since.toLocaleString()} visits this month · {l.stats.signups.toLocaleString()} sign-ups · {l.stats.qualified.toLocaleString()} qualified
                    </p>
                  </div>
                  <CopyButton text={l.url} label="Copy" size="sm" />
                </li>
              ))}
            </ul>
            <div className="hidden sm:block">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="pb-2 font-medium">Link</th>
                    <th className="pb-2 text-right font-medium">Visits this month</th>
                    <th className="pb-2 text-right font-medium">Sign-ups</th>
                    <th className="pb-2 text-right font-medium">Qualified</th>
                    <th className="pb-2 text-right font-medium" aria-label="Copy" />
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {o.links.map((l) => (
                    <tr key={l.id} className="border-t border-line">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{l.label ?? "Your link"}</p>
                        <p className="text-[12.5px] text-muted">/c/{l.code}</p>
                      </td>
                      <td className="py-2.5 text-right">{l.stats.visits_since.toLocaleString()}</td>
                      <td className="py-2.5 text-right">{l.stats.signups.toLocaleString()}</td>
                      <td className="py-2.5 text-right">{l.stats.qualified.toLocaleString()}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <CopyButton text={l.url} label="Copy" size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Box>

      <div className="grid gap-6 lg:grid-cols-2">
        <Box title="Where sign-ups drop off" note={`${monthLabel(o.month)}, from a visit to a sign-up that pays.`}>
          <Funnel
            steps={[
              ["Visited through your links", o.funnel.visits, "One per person per day. Link previews aren't counted."],
              ["Made an account", o.funnel.signups, o.funnel.duplicates ? `${o.funnel.duplicates} more were second accounts from the same phone and don't count.` : "Signed up with email or Google."],
              ["Uploaded a CV", o.funnel.with_cv, "Tell viewers to have their CV ready: it's the step most people skip."],
              ["Finished their profile", o.funnel.with_profile, "Degree level and where they want to study."],
              ["Qualified", o.funnel.qualified, "All of the above: these are the ones you're paid for."],
            ]}
          />
        </Box>
        <Box title="The last 30 days" note="Hover or tab through the bars for each day.">
          <div className="space-y-6">
            <DailyBars title="Visits" days={o.days.map((d) => ({ day: d.day, n: d.visits }))} tone="ink" unit={["visit", "visits"]} />
            <DailyBars title="Qualified sign-ups" days={o.days.map((d) => ({ day: d.day, n: d.qualified }))} tone="brand" unit={["qualified sign-up", "qualified sign-ups"]} />
          </div>
        </Box>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Box title="Videos this month" note={`At least ${TERMS.videosPerMonth} a month, one every week.`} action={<Link href="/creator/videos" className="text-[13.5px] font-medium underline underline-offset-4">Add a video</Link>}>
          <WeekDots month={o.month} days={o.posts.map((p) => p.posted_on)} today={today} />
          {o.posts.length ? (
            <ul className="mt-5 divide-y divide-line">
              {o.posts.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:underline">
                    <span className="font-medium">{p.platform}</span>
                    <span className="text-muted"> · {p.title ?? "Video"}</span>
                  </a>
                  <span className="shrink-0 text-[12.5px] text-muted">{shortDay(p.posted_on)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[13.5px] text-muted">No videos added for {monthLabel(o.month)} yet. Post one, then paste its link on the Videos page.</p>
          )}
        </Box>
        <Box title="What a month pays" note={`At ${naira(c.rate_ngn)} a qualified sign-up. Nothing until the month reaches ${TERMS.payFrom}; from then every qualified sign-up is yours to withdraw, and the bonus once the month closes.`}>
          <PayLadder qualified={mo.qualified} rate={c.rate_ngn} />
        </Box>
      </div>

      <Box title="Keep it honest" note="From the campaign guide. Videos that break these aren't paid for.">
        <ul className="grid gap-x-8 gap-y-2 text-[14px] sm:grid-cols-2">
          {[
            "Say clearly that it's a paid partnership.",
            "Share only what really happened: if you're still exploring, say so.",
            "Never promise admission, scholarships or visas.",
            "Don't copy another creator's video word for word.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/50" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
}
