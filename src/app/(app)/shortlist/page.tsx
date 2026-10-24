import { requireUser } from "@/lib/supabase/server";
import { daysUntil, upcomingDeadlines, type DeadlineRow } from "@/lib/fit";
import { ReconButton, MoveButton, AutoRefresh, ScholarshipButton, Preferences } from "./controls";
import { REGIONS, loadProfile } from "@/lib/profile";
import Link from "next/link";
import { PrepareButton } from "../applications/[id]/prepare-button";

export const dynamic = "force-dynamic";

interface Funding {
  name: string;
  kind: string;
  amount_note: string | null;
  intl_eligible: boolean | null;
  url: string | null;
}
interface Row {
  id: string;
  status: string;
  tier: string | null;
  fit_score: number | null;
  fit_reasoning: string | null;
  angle: string | null;
  target_deadline: string | null;
  portal_url: string | null;
  programs: {
    id: string;
    name: string;
    degree: string;
    url: string | null;
    stem_designated: boolean | null;
    test_policy: string | null;
    app_fee_usd: number | null;
    fee_waiver: string | null;
    tuition_usd: number | null;
    deadlines: DeadlineRow[];
    funding_signals: { full_funding_realistic?: string; summary?: string; english_moi_waiver?: string; test_notes?: string; english_notes?: string; post_study_work?: string };
    source_urls: string[];
    schools: { name: string; city: string | null; state: string | null; country: string | null; region: string | null; ranking_note: string | null };
    funding_opportunities: Funding[];
  };
}

interface Matched {
  id: string;
  fit: string | null;
  why: string | null;
  status: string;
  funding_opportunities: { name: string; sponsor: string | null; url: string | null; amount_note: string | null; deadline: string | null; eligibility: string | null; intl_eligible: boolean | null };
}

const FIT: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  possible: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  long_shot: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

const TIER: Record<string, string> = {
  reach: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  target: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  safety: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};
const FUND: Record<string, string> = { likely: "full funding likely", possible: "full funding possible", rare: "full funding rare", unknown: "funding unclear" };
const TEST: Record<string, string> = { required: "GRE/GMAT required", optional: "test optional", waivable: "test waivable", not_required: "no test", unknown: "test policy ?" };
const ENG: Record<string, string> = { accepted: "MOI waiver ok", not_accepted: "needs english test", case_by_case: "MOI case by case", unknown: "english ?" };

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${className || "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}>{children}</span>;
}

function Due({ date, today }: { date: string | null; today: string }) {
  if (!date) return <span className="text-neutral-400">no date</span>;
  const d = daysUntil(date, today);
  const tone = d < 0 ? "text-neutral-400 line-through" : d <= 14 ? "text-red-600 font-medium" : d <= 45 ? "text-amber-600" : "";
  return (
    <span className={tone}>
      {new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
      <span className="ml-1 text-xs text-neutral-500">{d < 0 ? "passed" : `${d}d`}</span>
    </span>
  );
}

function ProgramCard({ r, today }: { r: Row; today: string }) {
  const p = r.programs;
  const fs = p.funding_signals ?? {};
  const flags = (r.fit_reasoning ?? "").split("\n").filter((l) => l.startsWith("⚑")).map((l) => l.slice(2));
  const reasoning = (r.fit_reasoning ?? "").split("\n").filter((l) => !l.startsWith("⚑")).join(" ");
  return (
    <details className="group rounded-md border border-neutral-200 dark:border-neutral-800">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{p.schools.name}</p>
          <p className="truncate text-sm text-neutral-500">
            {p.name} · {p.degree} · {[p.schools.city, p.schools.country].filter(Boolean).join(", ")}
            {p.schools.ranking_note ? <span className="text-neutral-400"> · {p.schools.ranking_note}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {r.tier && <Badge className={TIER[r.tier]}>{r.tier}</Badge>}
          {r.fit_score != null && <Badge>fit {r.fit_score}/10</Badge>}
          <Badge>{FUND[fs.full_funding_realistic ?? "unknown"]}</Badge>
        </div>
        <div className="w-28 text-right text-sm"><Due date={r.target_deadline} today={today} /></div>
      </summary>
      <div className="space-y-3 border-t border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{TEST[p.test_policy ?? "unknown"]}</Badge>
          <Badge>{ENG[fs.english_moi_waiver ?? "unknown"]}</Badge>
          {fs.post_study_work ? <Badge>{fs.post_study_work}</Badge> : p.stem_designated != null && <Badge>{p.stem_designated ? "STEM (36mo OPT)" : "not STEM"}</Badge>}
          {p.app_fee_usd != null && <Badge>fee ${p.app_fee_usd}</Badge>}
          {p.tuition_usd != null && <Badge>tuition ${p.tuition_usd.toLocaleString()}</Badge>}
        </div>
        {reasoning && <p className="text-neutral-700 dark:text-neutral-300">{reasoning}</p>}
        {r.angle && <p><span className="text-neutral-500">your angle: </span>{r.angle}</p>}
        {flags.length > 0 && (
          <ul className="list-disc pl-5 text-amber-700 dark:text-amber-400">{flags.map((f) => <li key={f}>{f}</li>)}</ul>
        )}
        {fs.summary && <p><span className="text-neutral-500">funding: </span>{fs.summary}</p>}
        {p.funding_opportunities?.length > 0 && (
          <ul className="space-y-1">
            {p.funding_opportunities.map((f) => (
              <li key={f.name}>
                {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="underline">{f.name}</a> : f.name}
                <span className="text-neutral-500"> · {f.kind.replace("_", " ")}{f.amount_note ? ` · ${f.amount_note}` : ""}{f.intl_eligible === false ? " · not for internationals" : ""}</span>
              </li>
            ))}
          </ul>
        )}
        {p.fee_waiver && <p><span className="text-neutral-500">fee waiver: </span>{p.fee_waiver}</p>}
        {p.deadlines?.length > 0 && (
          <div>
            <p className="text-neutral-500">rounds</p>
            <ul>
              {p.deadlines.map((d) => (
                <li key={d.round + d.date}>
                  {d.round}: {d.date ? <Due date={d.date} today={today} /> : "date not found"}
                  {d.funding_priority === "yes" && <span className="ml-1 text-xs text-emerald-700 dark:text-emerald-400">priority/funding round</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(p.url || r.portal_url) && <a href={p.url ?? r.portal_url!} target="_blank" rel="noreferrer" className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-700">program page</a>}
          {r.status === "shortlisted" && <PrepareButton id={r.id} replan={false} busy={false} label="prepare application" />}
          {!["researching", "shortlisted", "dropped"].includes(r.status) && <Link href={`/applications/${r.id}`} className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900">open application</Link>}
          {r.status === "researching" && <MoveButton id={r.id} to="shortlisted" label="add to shortlist" />}
          {(r.status === "researching" || r.status === "shortlisted") && <MoveButton id={r.id} to="dropped" label="drop" />}
          {p.source_urls?.length > 0 && <span className="text-xs text-neutral-500">{p.source_urls.length} sources checked</span>}
        </div>
      </div>
    </details>
  );
}

export default async function Shortlist({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { region: regionFilter } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: apps }, { data: jobs }, { data: strat }, { data: external }, { data: profRow }] = await Promise.all([
    auth.sb
      .from("applications")
      .select("id, status, tier, fit_score, fit_reasoning, angle, target_deadline, portal_url, programs(id, name, degree, url, stem_designated, test_policy, app_fee_usd, fee_waiver, tuition_usd, deadlines, funding_signals, source_urls, schools(name, city, state, country, region, ranking_note), funding_opportunities(name, kind, amount_note, intl_eligible, url))")
      .order("target_deadline", { ascending: true, nullsFirst: false }),
    auth.sb.from("jobs").select("task, status, last_error").eq("agent", "recon").order("created_at", { ascending: false }).limit(60),
    auth.sb.from("events").select("context, created_at").eq("action", "recon.discovered").order("created_at", { ascending: false }).limit(6),
    auth.sb
      .from("user_funding")
      .select("id, fit, why, status, funding_opportunities(name, sponsor, url, amount_note, deadline, eligibility, intl_eligible)")
      .limit(60),
    auth.sb.from("profiles").select("profile").single(),
  ]);

  const allRows = (apps ?? []) as unknown as Row[];
  const presentRegions = [...new Set(allRows.map((r) => r.programs.schools.region).filter(Boolean))] as string[];
  const rows = regionFilter ? allRows.filter((r) => r.programs.schools.region === regionFilter) : allRows;
  const prof = loadProfile(profRow?.profile);
  const FIT_ORDER: Record<string, number> = { strong: 0, possible: 1, long_shot: 2 };
  const scholarships = ((external ?? []) as unknown as Matched[])
    .filter((x) => x.funding_opportunities)
    .sort((a, b) => (FIT_ORDER[a.fit ?? ""] ?? 3) - (FIT_ORDER[b.fit ?? ""] ?? 3));
  const by = (s: string) => rows.filter((r) => r.status === s);
  const shortlisted = by("shortlisted");
  const checking = by("researching");
  const dropped = by("dropped");
  const later = rows.filter((r) => !["shortlisted", "researching", "dropped"].includes(r.status));

  const active = (jobs ?? []).filter((j) => j.status === "queued" || j.status === "running");
  const failed = (jobs ?? []).filter((j) => j.status === "failed");
  // latest strategy notes per region
  const seenRegion = new Set<string>();
  const notes: { region: string; text: string }[] = [];
  for (const e of strat ?? []) {
    const c = (e.context ?? {}) as { region?: string; strategy_notes?: string[] };
    const r = c.region ?? "us";
    if (seenRegion.has(r)) continue;
    seenRegion.add(r);
    for (const t of c.strategy_notes ?? []) notes.push({ region: r, text: t });
  }

  const timeline = shortlisted
    .flatMap((r) => upcomingDeadlines(r.programs.deadlines ?? [], today).map((d) => ({ r, d })))
    .sort((a, b) => a.d.date.localeCompare(b.d.date))
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      {active.length > 0 && <AutoRefresh every={20000} />}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">shortlist</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length ? `${shortlisted.length} shortlisted · ${checking.length} need a check · ${dropped.length} dropped` : "recon reads official program pages and checks funding, tests, english waivers and deadlines for each one."}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ScholarshipButton running={active.some((j) => j.task === "scholarships")} />
          <ReconButton running={active.some((j) => j.task !== "scholarships")} hasRows={rows.length > 0} />
        </div>
      </header>

      <Preferences
        regions={prof.preferences.regions ?? []}
        degreeTypes={prof.goals.degree_types ?? []}
        allRegions={REGIONS}
      />

      {presentRegions.length > 1 && (
        <nav className="flex flex-wrap gap-1.5 text-sm">
          <Link href="/shortlist" className={`rounded-full border px-3 py-1 ${!regionFilter ? "border-neutral-900 dark:border-neutral-100" : "border-neutral-300 text-neutral-500 dark:border-neutral-700"}`}>
            all regions
          </Link>
          {presentRegions.map((r) => (
            <Link
              key={r}
              href={`/shortlist?region=${r}`}
              className={`rounded-full border px-3 py-1 ${regionFilter === r ? "border-neutral-900 dark:border-neutral-100" : "border-neutral-300 text-neutral-500 dark:border-neutral-700"}`}
            >
              {REGIONS[r] ?? r}
            </Link>
          ))}
        </nav>
      )}

      {active.length > 0 && (
        <p className="rounded-md border border-neutral-200 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          recon is working: {active.filter((j) => j.task === "discover").length ? "finding programs…" : `researching ${active.length} program${active.length === 1 ? "" : "s"}…`} this page updates on its own.
        </p>
      )}
      {failed.length > 0 && (
        <p className="rounded-md border border-red-200 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:text-red-400">
          {failed.length} research job{failed.length === 1 ? "" : "s"} failed. last error: {failed[0].last_error?.slice(0, 200)}
        </p>
      )}

      {notes.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">recon&apos;s read on your strategy</h2>
          <ul className="list-disc space-y-1 rounded-md border border-neutral-200 py-3 pl-9 pr-4 text-sm dark:border-neutral-800">
            {notes.map((n) => (
              <li key={n.region + n.text}>
                <span className="text-neutral-500">{REGIONS[n.region] ?? n.region}: </span>
                {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {timeline.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">next deadlines</h2>
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
            {timeline.map(({ r, d }) => (
              <li key={r.id + d.round} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate">{r.programs.schools.name} · <span className="text-neutral-500">{d.round}{d.funding_priority === "yes" ? " (funding)" : ""}</span></span>
                <Due date={d.date} today={today} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {shortlisted.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">shortlisted</h2>
          {shortlisted.map((r) => <ProgramCard key={r.id} r={r} today={today} />)}
        </section>
      )}
      {checking.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">needs a check</h2>
          <p className="text-sm text-neutral-500">something important is unconfirmed or weak (see the ⚑ flags). add it to the shortlist if you&apos;re ok with that.</p>
          {checking.map((r) => <ProgramCard key={r.id} r={r} today={today} />)}
        </section>
      )}
      {later.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">in progress</h2>
          {later.map((r) => <ProgramCard key={r.id} r={r} today={today} />)}
        </section>
      )}
      {scholarships.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-neutral-500">scholarships matched to you ({scholarships.length})</h2>
          <p className="mb-3 text-sm text-neutral-500">found by your hooks: awards, ventures, employers, industry, leadership, region. not just nationality.</p>
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
            {scholarships.map((x) => {
              const o = x.funding_opportunities;
              return (
                <li key={x.id} className="space-y-1 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {o.url ? <a href={o.url} target="_blank" rel="noreferrer" className="underline">{o.name}</a> : o.name}
                      {o.sponsor && <span className="font-normal text-neutral-500"> · {o.sponsor}</span>}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {x.fit && <Badge className={FIT[x.fit]}>{x.fit.replace("_", " ")}</Badge>}
                      {o.deadline && <Due date={o.deadline} today={today} />}
                    </span>
                  </div>
                  {x.why && <p><span className="text-neutral-500">why you: </span>{x.why}</p>}
                  <p className="text-neutral-500">
                    {[o.amount_note, o.intl_eligible === false ? "not open to internationals" : null, o.eligibility].filter(Boolean).join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {dropped.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-neutral-500">dropped ({dropped.length})</summary>
          <div className="mt-2 space-y-2">{dropped.map((r) => <ProgramCard key={r.id} r={r} today={today} />)}</div>
        </details>
      )}
    </main>
  );
}
