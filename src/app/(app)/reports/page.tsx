import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/ui/page";
import { ReportButton } from "@/components/home/weekly-report";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly reports" };

export default async function Reports() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await auth.sb.from("digests").select("id, content, created_at").eq("content->>kind", "weekly").order("created_at", { ascending: false }).limit(52);
  const list = (data ?? []).filter((d) => (d.content as { kind?: string }).kind === "weekly");
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Weekly reports" description="Every Monday, Ivyward AI writes up the week: what's working, what's holding you back, and what to do about it." />
      {list.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {list.map((d) => {
            const c = d.content as { headline: string; week_of: string; items?: { title: string }[] };
            return (
              <li key={d.id}>
                <Link href={`/reports/${d.id}`} className="block px-5 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <span className="block text-[12.5px] text-muted">Week of {new Date(`${c.week_of}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</span>
                  <span className="mt-1 block font-serif text-[19px] leading-snug">{c.headline}</span>
                  {c.items?.length ? <span className="mt-1 block truncate text-[13px] text-muted">{c.items.map((i) => i.title).join(" · ")}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title="No reports yet" body="Your first one arrives on Monday morning. You can also get this week's now." action={<ReportButton hasReport={false} />} />
      )}
    </div>
  );
}
