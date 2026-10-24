import { requireUser } from "@/lib/supabase/server";
import { daysUntil, upcomingDeadlines, type DeadlineRow } from "@/lib/fit";
import { ReconButton, MoveButton, AutoRefresh, ScholarshipButton, Preferences } from "./controls";
import { REGIONS, loadProfile } from "@/lib/profile";
import { userPlan } from "@/lib/budget";
import Link from "next/link";
import { Award, CalendarDays, ChevronDown, ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react";
import { PageHeader, Section, Notice, Empty } from "@/components/ui/page";
import { Clamp } from "@/components/ui/clamp";
import { StrategyNotes } from "./notes";
import { ButtonLink } from "@/components/ui/button";
import { Tag, chipClass } from "@/components/ui/chip";
import { PrepareButton } from "../applications/[id]/prepare-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shortlist" };

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

const FIT: Record<string, [string, "go" | "plain" | "signal"]> = { strong: ["Strong fit", "go"], possible: ["Possible fit", "plain"], long_shot: ["Long shot", "plain"] };
const TIER: Record<string, string> = { reach: "Reach", target: "Target", safety: "Safety" };
const FUND: Record<string, [string, "go" | "plain" | "stop"]> = {
  likely: ["Full funding likely", "go"],
  possible: ["Full funding possible", "plain"],
  rare: ["Full funding rare", "stop"],
  unknown: ["Funding unclear", "plain"],
};
const TEST: Record<string, string> = { required: "GRE/GMAT required", optional: "Test optional", waivable: "Test waivable", not_required: "No test", unknown: "Test policy unclear" };
const ENG: Record<string, string> = { accepted: "English waiver accepted", not_accepted: "Needs English test", case_by_case: "English waiver case by case", unknown: "English rules unclear" };

function Due({ date, today }: { date: string | null; today: string }) {
  if (!date) return <span className="text-sm text-muted">No date yet</span>;
  const d = daysUntil(date, today);
  const tone = d < 0 ? "text-muted line-through" : d <= 14 ? "font-medium text-stop" : "";
  return (
    <span className={`text-sm tabular ${tone}`}>
      {new Date(date + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}
      <span className="ml-1.5 text-xs font-normal text-muted">{d < 0 ? "passed" : d === 0 ? "today" : `${d} days`}</span>
    </span>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-3.5 dark:bg-neutral-900/60">
      <dt className="text-[11.5px] font-bold text-muted">{label}</dt>
      <dd className="mt-1 leading-relaxed">
        <Clamp lines={3}>{children}</Clamp>
      </dd>
    </div>
  );
}

function ProgramCard({ r, today }: { r: Row; today: string }) {
  const p = r.programs;
  const fs = p.funding_signals ?? {};
  const flags = (r.fit_reasoning ?? "").split("\n").filter((l) => l.startsWith("⚑")).map((l) => l.slice(2));
  const reasoning = (r.fit_reasoning ?? "").split("\n").filter((l) => !l.startsWith("⚑")).join(" ");
  const [fund, fundTone] = FUND[fs.full_funding_realistic ?? "unknown"] ?? FUND.unknown;
  return (
    <details className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-card open:shadow-[0_1px_0_var(--color-line)]">
      <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 sm:px-5">
        {r.fit_score != null ? (
          <span
            className="grid size-12 shrink-0 place-items-center rounded-full p-[3px]"
            style={{ background: `conic-gradient(var(--accent) 0deg, var(--accent-2) ${r.fit_score * 36}deg, var(--line) ${r.fit_score * 36}deg)` }}
            title={`Fit ${r.fit_score} out of 10`}
          >
            <span className="grid size-full place-items-center rounded-full bg-surface text-[15px] font-bold tracking-[-0.03em] tabular">{r.fit_score}</span>
          </span>
        ) : (
          <span className="size-12 shrink-0 rounded-full border-2 border-dashed border-line" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-bold tracking-[-0.01em]">{p.schools.name}</span>
            {r.tier && <span className="shrink-0 text-xs text-muted">{TIER[r.tier] ?? r.tier}</span>}
          </span>
          <span className="block truncate text-sm text-muted">
            {p.name}
            {[p.schools.city, p.schools.country].filter(Boolean).length ? `, ${[p.schools.city, p.schools.country].filter(Boolean).join(", ")}` : ""}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">
            <Tag tone={fundTone}>{fund}</Tag>
          </span>
        </span>
        <span className="hidden sm:block">
          <Tag tone={fundTone}>{fund}</Tag>
        </span>
        <span className="w-24 shrink-0 text-right">
          <Due date={r.target_deadline} today={today} />
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-5 border-t border-line px-4 py-5 text-sm sm:px-5">
        <div className="flex flex-wrap gap-1.5">
          <Tag>{TEST[p.test_policy ?? "unknown"]}</Tag>
          <Tag>{ENG[fs.english_moi_waiver ?? "unknown"]}</Tag>
          {fs.post_study_work ? <Tag>{fs.post_study_work}</Tag> : p.stem_designated != null && <Tag>{p.stem_designated ? "STEM, 36 months OPT" : "Not STEM"}</Tag>}
          {p.app_fee_usd != null && <Tag>{p.app_fee_usd ? `Fee $${p.app_fee_usd}` : "No fee"}</Tag>}
          {p.tuition_usd != null && <Tag>Tuition ${p.tuition_usd.toLocaleString()}</Tag>}
          {p.schools.ranking_note && <Tag>{p.schools.ranking_note}</Tag>}
        </div>
        {flags.length > 0 && (
          <ul className="space-y-1 rounded-2xl border border-signal/25 bg-signal/[0.06] px-4 py-3">
            {flags.map((f) => (
              <li key={f} className="flex gap-2">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        )}
        <dl className="grid gap-4 sm:grid-cols-2">
          {reasoning && <Fact label="Why it fits">{reasoning}</Fact>}
          {r.angle && <Fact label="Your angle">{r.angle}</Fact>}
          {fs.summary && <Fact label="Funding">{fs.summary}</Fact>}
          {p.fee_waiver && <Fact label="Fee waiver">{p.fee_waiver}</Fact>}
        </dl>
        {p.funding_opportunities?.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted">Funding at this school</p>
            <ul className="space-y-1">
              {p.funding_opportunities.map((f) => (
                <li key={f.name}>
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
                      {f.name}
                    </a>
                  ) : (
                    <span className="font-medium">{f.name}</span>
                  )}
                  <span className="text-muted">
                    , {f.kind.replace(/_/g, " ")}
                    {f.amount_note ? `, ${f.amount_note}` : ""}
                    {f.intl_eligible === false ? ", not open to international students" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.deadlines?.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted">Rounds</p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {p.deadlines.map((d) => (
                <li key={d.round + d.date} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>
                    {d.round}
                    {d.funding_priority === "yes" && <span className="ml-2 text-xs text-go">Funding priority</span>}
                  </span>
                  {d.date ? <Due date={d.date} today={today} /> : <span className="text-sm text-muted">Date not found</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {r.status === "shortlisted" && <PrepareButton id={r.id} replan={false} busy={false} label="Prepare application" size="sm" />}
          {!["researching", "shortlisted", "dropped"].includes(r.status) && (
            <ButtonLink href={`/applications/${r.id}`} size="sm">
              Open application
            </ButtonLink>
          )}
          {r.status === "researching" && <MoveButton id={r.id} to="shortlisted" label="Add to shortlist" />}
          {(p.url || r.portal_url) && (
            <ButtonLink href={p.url ?? r.portal_url!} external size="sm" variant="secondary">
              Program page <ExternalLink className="size-3.5" aria-hidden />
            </ButtonLink>
          )}
          {(r.status === "researching" || r.status === "shortlisted") && <MoveButton id={r.id} to="dropped" label="Drop" />}
          {p.source_urls?.length > 0 && <span className="ml-auto text-xs text-muted">Checked against {p.source_urls.length} official pages</span>}
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
  const { plan } = await userPlan(auth.user.id);
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

  const counts = [
    shortlisted.length && `${shortlisted.length} shortlisted`,
    checking.length && `${checking.length} to check`,
    later.length && `${later.length} in progress`,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {active.length > 0 && <AutoRefresh every={20000} />}
      <PageHeader
        title="Shortlist"
        description={
          rows.length ? `${counts.join(", ")}.` : "Programs checked against their official pages for funding, tests and deadlines."
        }
        actions={
          <>
            <ScholarshipButton running={active.some((j) => j.task === "scholarships")} />
            <ReconButton running={active.some((j) => j.task !== "scholarships")} hasRows={rows.length > 0} />
          </>
        }
      />

      <Preferences regions={prof.preferences.regions ?? []} degreeTypes={prof.goals.degree_types ?? []} allRegions={REGIONS} level={prof.goals.study_level} maxRegions={plan.maxRegions} />

      {active.length > 0 && (
        <Notice tone="plain">
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden />
            {active.filter((j) => j.task === "discover").length ? "Recon is finding programs." : `Recon is researching ${active.length} program${active.length === 1 ? "" : "s"}.`} This page updates on its own.
          </span>
        </Notice>
      )}
      {failed.length > 0 && !active.length && (
        <Notice tone="stop">
          {failed.length} search{failed.length === 1 ? "" : "es"} didn&apos;t finish. Choose Find more programs to run it again.
        </Notice>
      )}

      {presentRegions.length > 1 && (
        <nav className="flex flex-wrap gap-1.5" aria-label="Filter by region">
          <Link href="/shortlist" className={chipClass(!regionFilter)} aria-current={!regionFilter ? "page" : undefined}>
            All regions
          </Link>
          {presentRegions.map((r) => (
            <Link key={r} href={`/shortlist?region=${r}`} className={chipClass(regionFilter === r)} aria-current={regionFilter === r ? "page" : undefined}>
              {REGIONS[r] ?? r}
            </Link>
          ))}
        </nav>
      )}

      {!rows.length && !active.length && (
        <Empty title="No programs yet" body="Set what to search for above, then build your shortlist. It takes a few minutes per region." action={<ReconButton running={false} hasRows={false} />} />
      )}

      {(notes.length > 0 || timeline.length > 0) && (
        <div className={`grid gap-6 ${notes.length && timeline.length ? "lg:grid-cols-2" : ""}`}>
          {timeline.length > 0 && (
            <Section title="Next deadlines">
              <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
                {timeline.map(({ r, d }) => (
                  <li key={r.id + d.round} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate">
                      {r.programs.schools.name}
                      <span className="text-muted">
                        , {d.round}
                        {d.funding_priority === "yes" ? " (funding round)" : ""}
                      </span>
                    </span>
                    <Due date={d.date} today={today} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {notes.length > 0 && (
            <StrategyNotes notes={notes} regions={REGIONS} />
          )}
        </div>
      )}

      {shortlisted.length > 0 && (
        <Section title="Shortlisted" description="Open one for details, then prepare it.">
          <div className="space-y-2">{shortlisted.map((r) => <ProgramCard key={r.id} r={r} today={today} />)}</div>
        </Section>
      )}
      {checking.length > 0 && (
        <Section title="Worth a check" description="Something is unconfirmed or weak; the flags inside say what.">
          <div className="space-y-2">{checking.map((r) => <ProgramCard key={r.id} r={r} today={today} />)}</div>
        </Section>
      )}
      {later.length > 0 && (
        <Section title="In progress" action={<Link href="/applications" className="text-sm text-muted underline-offset-4 hover:underline">All applications</Link>}>
          <div className="space-y-2">{later.map((r) => <ProgramCard key={r.id} r={r} today={today} />)}</div>
        </Section>
      )}
      {scholarships.length > 0 && (
        <Section title={`Scholarships for you (${scholarships.length})`} description="Matched on what makes you stand out, not only nationality.">
          <ul className="grid gap-4 md:grid-cols-2">
            {scholarships.map((x) => {
              const o = x.funding_opportunities;
              const fit = x.fit ? FIT[x.fit] : null;
              const left = o.deadline ? daysUntil(o.deadline, today) : null;
              return (
                <li key={x.id} className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-start gap-3">
                    <span className="bg-hero-gradient grid size-11 shrink-0 place-items-center rounded-2xl text-white">
                      <Award className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-snug tracking-[-0.01em]">{o.name}</span>
                      {o.sponsor && <span className="block truncate text-[12.5px] text-muted">{o.sponsor}</span>}
                    </span>
                    {fit && <Tag tone={fit[1]}>{fit[0]}</Tag>}
                  </div>
                  {o.amount_note && <p className="text-gradient mt-4 text-xl font-bold leading-tight tracking-[-0.03em]">{o.amount_note}</p>}
                  {x.why && (
                    <div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-[13px] leading-relaxed dark:bg-neutral-900/60">
                      <p className="mb-0.5 text-[11px] font-bold text-muted">Why you</p>
                      <Clamp lines={3}>{x.why}</Clamp>
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    {o.deadline && (
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${left !== null && left >= 0 && left <= 14 ? "bg-stop/10 text-stop" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}>
                        <CalendarDays className="size-3.5" aria-hidden />
                        {new Date(o.deadline + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}
                        {left !== null && left >= 0 ? `, ${left} days` : ", passed"}
                      </span>
                    )}
                    {o.intl_eligible === false && <Tag tone="stop">Not for international students</Tag>}
                    {o.eligibility && <span className="min-w-0 truncate text-xs text-muted" title={o.eligibility}>{o.eligibility}</span>}
                    {o.url && (
                      <a href={o.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-bold text-accent hover:underline">
                        Details <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
      {dropped.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer select-none items-center gap-1 text-sm text-muted hover:text-foreground">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            Dropped ({dropped.length})
          </summary>
          <div className="mt-3 space-y-2">{dropped.map((r) => <ProgramCard key={r.id} r={r} today={today} />)}</div>
        </details>
      )}
    </div>
  );
}
