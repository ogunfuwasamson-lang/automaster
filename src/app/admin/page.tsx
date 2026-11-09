import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { monthStartUTC } from "@/lib/pricing";
import { CostsView, GrowthView, LearningView, OverviewView, PortalsView, SubmissionsView, SystemView, UserView, UsersView } from "./views";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operator", robots: { index: false, follow: false } };

const VIEWS = [
  ["overview", "Overview"],
  ["users", "Users"],
  ["submissions", "Submissions"],
  ["portals", "Portals"],
  ["costs", "AI costs"],
  ["growth", "Growth"],
  ["learning", "Learning"],
  ["system", "System"],
] as const;
type View = (typeof VIEWS)[number][0] | "user";

// the operator console: one view at a time, so each loads only what it shows. regular users get a 404.
export default async function Admin({ searchParams }: { searchParams: Promise<{ view?: string; all?: string; id?: string }> }) {
  const auth = await requireUser();
  if (!auth) notFound();
  const { data: me } = await admin().from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) notFound();
  const sp = await searchParams;
  const want = sp.view;
  // real users only, unless the operator asks to include team and test accounts
  const everyone = sp.all === "1";
  const view: View = want === "user" && sp.id ? "user" : VIEWS.some(([v]) => v === want) ? (want as View) : "overview";
  const since = monthStartUTC();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-4 sm:px-8">
          <div className="flex min-w-0 flex-1 items-baseline gap-3">
            <h1 className="font-serif text-[26px] leading-none">Operator</h1>
            <span className="truncate text-[13px] text-muted">{everyone ? "Every account" : "Real users"}. Costs and revenue are for {new Date(since).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })} so far</span>
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
                  href={v === "overview" ? `/admin${everyone ? "?all=1" : ""}` : `/admin?view=${v}${everyone ? "&all=1" : ""}`}
                  aria-current={v === view || (v === "users" && view === "user") ? "page" : undefined}
                  className={`block whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[14px] transition ${v === view || (v === "users" && view === "user") ? "border-foreground font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {view === "overview" && <OverviewView since={since} everyone={everyone} />}
        {view === "users" && <UsersView since={since} everyone={everyone} />}
        {view === "submissions" && <SubmissionsView everyone={everyone} />}
        {view === "portals" && <PortalsView everyone={everyone} />}
        {view === "user" && <UserView id={sp.id!} since={since} everyone={everyone} />}
        {view === "costs" && <CostsView since={since} everyone={everyone} />}
        {view === "growth" && <GrowthView everyone={everyone} />}
        {view === "learning" && <LearningView />}
        {view === "system" && <SystemView since={since} />}
      </main>
    </div>
  );
}
