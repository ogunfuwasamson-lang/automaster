import { Check, Minus } from "lucide-react";
import { linksOf, referralsOf } from "@/lib/creators";
import { naira } from "@/lib/creator-terms";
import { Box, Stat, StatusPill, shortDay } from "../parts";
import { liveCreator } from "../live";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign-ups" };

const Step = ({ done, label }: { done: boolean; label: string }) => (
  <span className={`inline-flex items-center gap-1 text-[12.5px] ${done ? "text-foreground" : "text-muted"}`}>
    {done ? <Check className="size-3.5 text-go" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
    <span>{label}</span>
    <span className="sr-only">{done ? "done" : "not yet"}</span>
  </span>
);

// every account made through the creator's links, newest first, with how far each got. the creator sees an
// initial, never who it is.
export default async function Signups() {
  const { creator } = await liveCreator();
  const [rows, links] = await Promise.all([referralsOf(creator.id), linksOf(creator.id)]);
  const label = new Map(links.map((l) => [l.id, l.label ?? `/c/${l.code}`]));
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const waiting = rows.filter((r) => r.status === "pending");
  const noCv = waiting.filter((r) => !r.has_cv).length;
  const noProfile = waiting.filter((r) => !r.has_profile).length;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[34px] leading-tight">Sign-ups</h1>
        <p className="mt-1 text-[14.5px] text-muted">Everyone who made an account through your links, and how far they got. You see an initial, never who they are.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Accounts made" value={(rows.length - count("duplicate")).toLocaleString()} sub="All time" />
        <Stat label="Qualified" value={count("qualified").toLocaleString()} tone="go" sub={naira(rows.reduce((a, r) => a + (r.status === "qualified" ? r.earn_ngn : 0), 0)) + " earned"} />
        <Stat label="Still in progress" value={waiting.length.toLocaleString()} sub={waiting.length ? `${noCv} need a CV, ${noProfile} their profile` : "Nobody waiting"} />
        <Stat label="Not counted" value={(count("duplicate") + count("rejected")).toLocaleString()} tone={count("duplicate") + count("rejected") ? "signal" : undefined} sub="Duplicates and accounts the team removed" />
      </div>
      {waiting.length ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-[14px] text-muted">
          {waiting.length.toLocaleString()} {waiting.length === 1 ? "person has" : "people have"} started but not finished. In your next video, remind viewers to upload their CV and finish setup: it takes about 90 seconds, and it&apos;s when they start seeing programmes that fit them.
        </p>
      ) : null}
      <Box title="Everyone" note={rows.length >= 300 ? "The latest 300." : undefined}>
        {rows.length ? (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[44rem] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-5 pb-2 font-medium sm:px-6">Joined</th>
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Link</th>
                  <th className="pb-2 font-medium">Steps</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="px-5 pb-2 text-right font-medium sm:px-6">Earned</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-muted sm:px-6">{shortDay(r.created_at)}</td>
                    <td className="py-3 font-medium">{r.initial === "?" ? "Student" : `${r.initial}.`}</td>
                    <td className="py-3 text-muted">{r.link_id ? (label.get(r.link_id) ?? "A link") : "·"}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <Step done label="Account" />
                        <Step done={r.has_cv} label="CV" />
                        <Step done={r.has_profile} label="Profile" />
                      </div>
                    </td>
                    <td className="py-3">
                      <StatusPill status={r.status} />
                      {r.reason ? <p className="mt-1 max-w-[14rem] text-[12px] text-muted">{r.reason}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums sm:px-6">{r.status === "qualified" ? naira(r.earn_ngn) : "·"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[14px] text-muted">No sign-ups yet. Share your link from the Overview: everyone who signs up through it shows here within a minute.</p>
        )}
      </Box>
    </div>
  );
}
