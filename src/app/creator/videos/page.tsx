import { ExternalLink } from "lucide-react";
import { postsOf } from "@/lib/creators";
import { TERMS, dayKey, monthKey, monthLabel } from "@/lib/creator-terms";
import { Box, Stat, StatusPill, WeekDots, shortDay } from "../parts";
import { RemoveVideo, VideoForm } from "../ui";
import { liveCreator } from "../live";

export const dynamic = "force-dynamic";
export const metadata = { title: "Videos" };

// the videos a creator posted: add each one's link, see the month's count against the guide, and the team's review
export default async function Videos() {
  const { creator } = await liveCreator();
  const posts = await postsOf(creator.id);
  const now = new Date();
  const today = dayKey(now);
  const month = monthKey(now);
  const mine = posts.filter((p) => p.posted_on.startsWith(month));
  const byMonth = new Map<string, typeof posts>();
  for (const p of posts) byMonth.set(p.posted_on.slice(0, 7), [...(byMonth.get(p.posted_on.slice(0, 7)) ?? []), p]);
  const platforms = [...new Set(posts.map((p) => p.platform))];
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[34px] leading-tight">Videos</h1>
        <p className="mt-1 text-[14.5px] text-muted">
          Add the link to every video you post about Ivyward. The guide asks for at least {TERMS.videosPerMonth} original videos a month, one a week, vertical and 30 to 90 seconds.
        </p>
      </header>

      <Box title="Add a video" note="Copy the link from the app's Share button.">
        <VideoForm today={today} />
      </Box>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Box title={monthLabel(month)} note={`${mine.length} of ${TERMS.videosPerMonth} videos`}>
          <WeekDots month={month} days={mine.map((p) => p.posted_on)} today={today} />
        </Box>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="All videos" value={posts.length.toLocaleString()} sub={platforms.length ? platforms.join(", ") : "None yet"} />
          <Stat label="Approved by the team" value={posts.filter((p) => p.status === "approved").length.toLocaleString()} tone="go" sub={`${posts.filter((p) => p.status === "submitted").length} waiting for review`} />
        </div>
      </div>

      {[...byMonth.entries()].map(([m, list]) => (
        <Box key={m} title={monthLabel(m)} note={`${list.length} video${list.length === 1 ? "" : "s"}`}>
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <span className="w-16 shrink-0 text-[13px] text-muted">{shortDay(p.posted_on)}</span>
                <div className="min-w-0 flex-1">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-[14.5px] font-medium hover:underline">
                    <span className="truncate">{p.title ?? `${p.platform} video`}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted" aria-hidden />
                  </a>
                  <p className="truncate text-[12.5px] text-muted">
                    {p.platform} · {p.url.replace(/^https?:\/\/(www\.)?/, "")}
                  </p>
                  {p.note ? <p className="mt-1 text-[13px] text-signal">{p.note}</p> : null}
                </div>
                <StatusPill status={p.status === "rejected" ? "changes" : p.status} />
                {p.status === "submitted" ? <RemoveVideo id={p.id} /> : <span className="size-8" aria-hidden />}
              </li>
            ))}
          </ul>
        </Box>
      ))}
      {!posts.length ? <p className="text-[14px] text-muted">No videos yet. Your first one can be as simple as finding Ivyward and saying you&apos;re about to try it.</p> : null}
    </div>
  );
}
