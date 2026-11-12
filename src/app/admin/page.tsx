import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { CostsView, CreditView, GrowthView, LearningView, OverviewView, PortalsView, SubmissionsView, SystemView, UserView, UsersView } from "./views";
import { href, parseRange } from "./range";
import { RangeBar } from "./range-bar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operator", robots: { index: false, follow: false } };

const VIEWS = [
  ["overview", "Overview"],
  ["users", "Users"],
  ["submissions", "Submissions"],
  ["portals", "Portals"],
  ["costs", "AI costs"],
  ["credit", "Credit"],
  ["growth", "Growth"],
  ["learning", "Learning"],
  ["system", "System"],
] as const;
type View = (typeof VIEWS)[number][0] | "user";

// the operator console: one view at a time, so each loads only what it shows, and one period (the range bar) that
// every view's numbers follow. regular users get a 404.
export default async function Admin({ searchParams }: { searchParams: Promise<{ view?: string; all?: string; id?: string; range?: string; from?: string; to?: string; q?: string }> }) {
  const auth = await requireUser();
  if (!auth) notFound();
  const { data: me } = await admin().from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) notFound();
  const sp = await searchParams;
  const want = sp.view;
  // real users only, unless the operator asks to include team and test accounts
  const everyone = sp.all === "1";
  const view: View = want === "user" && sp.id ? "user" : VIEWS.some(([v]) => v === want) ? (want as View) : "overview";
  const range = parseRange(sp);
  const tab = view === "user" ? "users" : view;
  const scopeHref = (() => {
    const h = href(view, range, !everyone, view === "user" && sp.id ? { id: sp.id } : {});
    return h;
  })();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-3 sm:px-6">
          <h1 className="font-serif text-[22px] leading-none">Operator</h1>
          <nav aria-label="Operator sections" className="-mb-px order-3 w-full overflow-x-auto lg:order-none lg:w-auto lg:flex-1">
            <ul className="flex gap-0.5">
              {VIEWS.map(([v, label]) => (
                <li key={v}>
                  <Link
                    href={href(v, range, everyone)}
                    aria-current={v === tab ? "page" : undefined}
                    className={`block whitespace-nowrap border-b-2 px-2.5 pb-2.5 pt-1.5 text-[13.5px] transition ${v === tab ? "border-foreground font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-4 text-[13px]">
            <Link href={scopeHref} className="text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground" title="Team and test accounts are left out of the numbers unless you include them">
              {everyone ? "Every account" : "Real users"}: {everyone ? "show real only" : "include team"}
            </Link>
            <Link href="/dashboard" className="text-muted hover:text-foreground">
              Back to the app
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-[90rem] px-4 pb-2.5 pt-2 sm:px-6">
          <RangeBar range={range} view={view} everyone={everyone} id={view === "user" ? sp.id : undefined} />
        </div>
      </header>
      <main className="mx-auto max-w-[90rem] px-4 py-5 sm:px-6">
        {view === "overview" && <OverviewView range={range} everyone={everyone} />}
        {view === "users" && <UsersView range={range} everyone={everyone} q={sp.q ?? ""} />}
        {view === "submissions" && <SubmissionsView range={range} everyone={everyone} />}
        {view === "portals" && <PortalsView range={range} everyone={everyone} />}
        {view === "credit" && <CreditView range={range} everyone={everyone} />}
        {view === "user" && <UserView id={sp.id!} range={range} everyone={everyone} />}
        {view === "costs" && <CostsView range={range} everyone={everyone} />}
        {view === "growth" && <GrowthView range={range} everyone={everyone} />}
        {view === "learning" && <LearningView />}
        {view === "system" && <SystemView range={range} />}
      </main>
    </div>
  );
}
