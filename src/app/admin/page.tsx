import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { monthStartUTC } from "@/lib/pricing";
import { CostsView, GrowthView, LearningView, OverviewView, PortalsView, SubmissionsView, SystemView } from "./views";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operator", robots: { index: false, follow: false } };

const VIEWS = [
  ["overview", "Overview"],
  ["submissions", "Submissions"],
  ["portals", "Portals"],
  ["costs", "AI costs"],
  ["growth", "Growth"],
  ["learning", "Learning"],
  ["system", "System"],
] as const;
type View = (typeof VIEWS)[number][0];

// the operator console: one view at a time, so each loads only what it shows. regular users get a 404.
export default async function Admin({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const auth = await requireUser();
  if (!auth) notFound();
  const { data: me } = await admin().from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) notFound();
  const want = (await searchParams).view;
  const view: View = VIEWS.some(([v]) => v === want) ? (want as View) : "overview";
  const since = monthStartUTC();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-4 sm:px-8">
          <div className="flex min-w-0 flex-1 items-baseline gap-3">
            <h1 className="font-serif text-[26px] leading-none">Operator</h1>
            <span className="truncate text-[13px] text-muted">Month to date: since {new Date(since).toLocaleDateString(undefined, { day: "numeric", month: "long" })}</span>
          </div>
          <Link href="/dashboard" className="text-[13px] text-muted hover:text-foreground">
            Back to the app
          </Link>
        </div>
        <nav aria-label="Operator sections" className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-8">
          <ul className="flex gap-1 pt-3">
            {VIEWS.map(([v, label]) => (
              <li key={v}>
                <Link
                  href={v === "overview" ? "/admin" : `/admin?view=${v}`}
                  aria-current={v === view ? "page" : undefined}
                  className={`block whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[14px] transition ${v === view ? "border-foreground font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {view === "overview" && <OverviewView since={since} />}
        {view === "submissions" && <SubmissionsView />}
        {view === "portals" && <PortalsView />}
        {view === "costs" && <CostsView since={since} />}
        {view === "growth" && <GrowthView />}
        {view === "learning" && <LearningView />}
        {view === "system" && <SystemView since={since} />}
      </main>
    </div>
  );
}
