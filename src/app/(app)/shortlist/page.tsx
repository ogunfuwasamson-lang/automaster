import { requireUser } from "@/lib/supabase/server";
import { daysUntil, upcomingDeadlines, type DeadlineRow } from "@/lib/fit";
import { ReconButton, MoveButton, AutoRefresh, ScholarshipButton, Preferences, ApplyScholarship, AutoScholarships } from "./controls";
import { REGIONS, loadProfile } from "@/lib/profile";
import { userPlan } from "@/lib/budget";
import Link from "next/link";
import { Award, CalendarDays, ChevronDown, ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react";
import { PageHeader, Notice, Empty } from "@/components/ui/page";
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
  application_id: string | null;
  applications: { status: string; runner_status: string | null } | null;
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
  if (!date) return <span className="text-[13px] text-muted">No date yet</span>;
  const d = daysUntil(date, today);
  return (
    <span className={`block text-right tabular ${d < 0 ? "text-muted line-through" : ""}`}>
      <span className={`block text-[14px] ${d >= 0 && d <= 14 ? "font-medium text-stop" : ""}`}>{new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
      <span className="label-mono block !text-[10px]">{d < 0 ? "passed" : d === 0 ? "today" : `${d} days`}</span>
    </span>
  );
}

const FUND_DOT: Record<string, string> = { go: "bg-go", plain: "bg-neutral-400", stop: "bg-stop" };

function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2">
      <dt className="label-mono pt-0.5">{label}</dt>
      <dd className="text-[13.5px] leading-snug">{children}</dd>
    </div>
  );
}

function Prose({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <div className="mt-1.5 text-[14px] leading-relaxed">
        <Clamp lines={4}>{children}</Clamp>
      </div>
    </div>
  );
}

const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:grid-cols-[minmax(0,1fr)_4.5rem_10rem_6rem_1rem]";

function ProgramRow({ r, today }: { r: Row; today: string }) {
  const p = r.programs;
  const fs = p.funding_signals ?? {};
  const flags = (r.fit_reasoning ?? "").split("\n").filter((l) => l.startsWith("⚑")).map((l) => l.slice(2));
  const reasoning = (r.fit_reasoning ?? "").split("\n").filter((l) => !l.startsWith("⚑")).join(" ");
  const [fund, fundTone] = FUND[fs.full_funding_realistic ?? "unknown"] ?? FUND.unknown;
  const place = [p.schools.city, p.schools.country].filter(Boolean).join(", ");
  return (
    <details className="group">
      <summary className={`${ROW} cursor-pointer list-none px-4 py-4 transition-colors hover:bg-neutral-50 sm:px-5 dark:hover:bg-neutral-900/60`}>
        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-serif text-[18px] leading-tight">{p.schools.name}</span>
            {r.tier && <span className="label-mono shrink-0 !text-[10px]">{TIER[r.tier] ?? r.tier}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">
            {p.name}
            {place ? ` · ${place}` : ""}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[12px] text-muted sm:hidden">
            {r.fit_score != null && <span>Fit {r.fit_score}/10</span>}
            <span className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${FUND_DOT[fundTone]}`} aria-hidden />
              {fund}
            </span>
          </span>
          {flags.length > 0 && (
            <span className="mt-1 flex items-center gap-1.5 text-[12px] text-signal">
              <TriangleAlert className="size-3" aria-hidden />
              {flags.length} thing{flags.length === 1 ? "" : "s"} to check
            </span>
          )}
        </span>
        <span className="hidden sm:block">
          {r.fit_score != null ? (
            <span title={`Fit ${r.fit_score} out of 10`}>
              <span className="font-serif text-[24px] leading-none tabular">{r.fit_score}</span>
              <span className="label-mono !text-[10px]"> /10</span>
              <span className="mt-1.5 block h-[3px] w-12 overflow-hidden rounded-full bg-line">
                <span className="block h-full bg-ink" style={{ width: `${r.fit_score * 10}%` }} />
              </span>
            </span>
          ) : (
            <span className="text-[13px] text-muted">Not scored</span>
          )}
        </span>
        <span className="hidden items-center gap-2 text-[13px] sm:flex">
          <span className={`size-1.5 shrink-0 rounded-full ${FUND_DOT[fundTone]}`} aria-hidden />
          <span className="truncate">{fund}</span>
        </span>
        <Due date={r.target_deadline} today={today} />
        <ChevronDown className="hidden size-4 text-muted transition-transform group-open:rotate-180 sm:block" aria-hidden />
      </summary>

      <div className="border-t border-line bg-background/60 px-4 py-6 sm:px-5">
        {flags.length > 0 && (
          <ul className="mb-6 space-y-1.5 rounded-lg border border-signal/25 bg-[color-mix(in_oklab,var(--signal)_5%,var(--surface))] px-4 py-3 text-[13.5px]">
            {flags.map((f) => (
              <li key={f} className="flex gap-2">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {reasoning && <Prose label="Why it fits">{reasoning}</Prose>}
            {r.angle && <Prose label="Your angle">{r.angle}</Prose>}
            {fs.summary && <Prose label="Funding">{fs.summary}</Prose>}
            {p.fee_waiver && <Prose label="Fee waiver">{p.fee_waiver}</Prose>}
            {p.funding_opportunities?.length > 0 && (
              <div>
                <p className="label-mono">Funding at this school</p>
                <ul className="mt-1.5 space-y-1 text-[14px]">
                  {p.funding_opportunities.map((f) => (
                    <li key={f.name}>
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noreferrer" className="font-medium underline decoration-line underline-offset-4 hover:decoration-current">
                          {f.name}
                        </a>
                      ) : (
                        <span className="font-medium">{f.name}</span>
                      )}
                      <span className="text-muted">
                        {" "}
                        · {f.kind.replace(/_/g, " ")}
                        {f.amount_note ? ` · ${f.amount_note}` : ""}
                        {f.intl_eligible === false ? " · not open to international students" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <dl className="divide-y divide-line border-y border-line">
              {r.fit_score != null && <FactRow label="Fit">{r.fit_score} out of 10{r.tier ? `, ${(TIER[r.tier] ?? r.tier).toLowerCase()}` : ""}</FactRow>}
              <FactRow label="Funding">{fund}</FactRow>
              {p.tuition_usd != null && <FactRow label="Tuition">${p.tuition_usd.toLocaleString("en-US")} a year</FactRow>}
              {p.app_fee_usd != null && <FactRow label="App fee">{p.app_fee_usd ? `$${p.app_fee_usd}` : "None"}</FactRow>}
              <FactRow label="Tests">{TEST[p.test_policy ?? "unknown"]}</FactRow>
              <FactRow label="English">{ENG[fs.english_moi_waiver ?? "unknown"]}</FactRow>
              {fs.post_study_work ? <FactRow label="After">{fs.post_study_work}</FactRow> : p.stem_designated != null && <FactRow label="STEM">{p.stem_designated ? "Yes, 36 months OPT" : "No"}</FactRow>}
              {p.schools.ranking_note && <FactRow label="Ranking">{p.schools.ranking_note}</FactRow>}
            </dl>
            {p.deadlines?.length > 0 && (
              <div className="mt-5">
                <p className="label-mono">Rounds</p>
                <ul className="mt-1.5 divide-y divide-line border-y border-line">
                  {p.deadlines.map((d) => (
                    <li key={d.round + d.date} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
                      <span>
                        {d.round}
                        {d.funding_priority === "yes" && <span className="ml-2 text-[12px] text-go">funding priority</span>}
                      </span>
                      {d.date ? <Due date={d.date} today={today} /> : <span className="text-[13px] text-muted">Date not found</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
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
          {p.source_urls?.length > 0 && <span className="label-mono ml-auto !text-[10px]">Checked against {p.source_urls.length} official pages</span>}
        </div>
      </div>
    </details>
  );
}

function ProgramList({ rows, today }: { rows: Row[]; today: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className={`${ROW} hidden border-b border-line px-5 py-2.5 sm:grid`}>
        <span className="label-mono">Program</span>
        <span className="label-mono">Fit</span>
        <span className="label-mono">Funding</span>
        <span className="label-mono text-right">Deadline</span>
        <span />
      </div>
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <ProgramRow key={r.id} r={r} today={today} />
        ))}
      </div>
    </div>
  );
}

type View = "shortlisted" | "checking" | "progress" | "scholarships" | "dropped";

export default async function Shortlist({ searchParams }: { searchParams: Promise<{ region?: string; view?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { region: regionFilter, view: viewParam } = await searchParams;
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
      .select("id, fit, why, status, application_id, applications(status, runner_status), funding_opportunities(name, sponsor, url, amount_note, deadline, eligibility, intl_eligible)")
      .limit(60),
    auth.sb.from("profiles").select("profile").single(),
  ]);
  // the auto-apply setting arrives with migration 0012
  const autoRow = await auth.sb.from("profiles").select("auto_scholarships").single();
  const autoOn = !autoRow.error && !!(autoRow.data as { auto_scholarships?: boolean } | null)?.auto_scholarships;

  // scholarship applications live under the Scholarships tab, not among the programs
  const allRows = ((apps ?? []) as unknown as Row[]).filter((r) => r.programs.degree !== "Scholarship");
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

  const tabs: [View, string, number][] = [
    ["shortlisted", "Shortlisted", shortlisted.length],
    ["checking", "Worth a check", checking.length],
    ["progress", "In progress", later.length],
    ["scholarships", "Scholarships", scholarships.length],
    ["dropped", "Dropped", dropped.length],
  ];
  const fallback: View = shortlisted.length ? "shortlisted" : checking.length ? "checking" : later.length ? "progress" : scholarships.length ? "scholarships" : "shortlisted";
  const view: View = tabs.some(([k]) => k === viewParam) ? (viewParam as View) : fallback;
  const href = (v: View, reg = regionFilter) => `/shortlist?${new URLSearchParams({ ...(v !== fallback ? { view: v } : {}), ...(reg ? { region: reg } : {}) })}`;
  const list = { shortlisted, checking, progress: later, dropped, scholarships: [] }[view];
  const blurb: Record<View, string> = {
    shortlisted: "Programs that fit. Open one for the details, then prepare it.",
    checking: "Something is unconfirmed or weak; each one says what.",
    progress: "Programs you're already applying to.",
    scholarships: "Matched on what makes you stand out, not only nationality.",
    dropped: "Programs you set aside. Add one back any time.",
  };

  return (
    <div className="mx-auto max-w-6xl">
      {active.length > 0 && <AutoRefresh every={20000} />}
      <PageHeader
        title="Shortlist"
        description={rows.length ? `${allRows.length} program${allRows.length === 1 ? "" : "s"} checked against their official pages` : "Programs checked against their official pages for funding, tests and deadlines"}
        actions={
          <>
            <ScholarshipButton running={active.some((j) => j.task === "scholarships")} />
            <ReconButton running={active.some((j) => j.task !== "scholarships")} hasRows={rows.length > 0} />
          </>
        }
      />

      {active.length > 0 && (
        <p className="mb-5 flex items-center gap-2 text-[13.5px] text-muted">
          <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden />
          {active.filter((j) => j.task === "discover").length ? "Recon is finding programs." : `Recon is researching ${active.length} program${active.length === 1 ? "" : "s"}.`} This page updates on its own.
        </p>
      )}
      {failed.length > 0 && !active.length && (
        <div className="mb-5">
          <Notice tone="stop">
            {failed.length} search{failed.length === 1 ? "" : "es"} didn&apos;t finish. Choose Find more programs to run it again.
          </Notice>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <nav aria-label="Shortlist views" className="flex gap-1 overflow-x-auto border-b border-line">
            {tabs
              .filter(([k, , n]) => n > 0 || k === "shortlisted" || k === view)
              .map(([k, label, n]) => (
                <Link key={k} href={href(k)} aria-current={view === k ? "page" : undefined} className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm transition-colors ${view === k ? "text-foreground" : "text-muted hover:text-foreground"}`}>
                  {label}
                  <span className="label-mono !text-[10px]">{n}</span>
                  {view === k && <span className="absolute inset-x-3 -bottom-px h-[2px] bg-ink" aria-hidden />}
                </Link>
              ))}
          </nav>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-muted">{blurb[view]}</p>
            {presentRegions.length > 1 && view !== "scholarships" && (
              <div className="flex flex-wrap gap-1.5" aria-label="Filter by region">
                <Link href={href(view, undefined)} className={chipClass(!regionFilter)} aria-current={!regionFilter ? "page" : undefined}>
                  All regions
                </Link>
                {presentRegions.map((r) => (
                  <Link key={r} href={href(view, r)} className={chipClass(regionFilter === r)} aria-current={regionFilter === r ? "page" : undefined}>
                    {REGIONS[r] ?? r}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            {!allRows.length && !active.length ? (
              <Empty title="No programs yet" body="Set what to search for, then build your shortlist. It takes a few minutes per region." action={<ReconButton running={false} hasRows={false} />} />
            ) : view === "scholarships" ? (
              scholarships.length ? (
                <>
                <div className="mb-4">
                  <AutoScholarships on={autoOn} />
                </div>
                <ul className="grid gap-4 md:grid-cols-2">
                  {scholarships.map((x) => {
                    const o = x.funding_opportunities;
                    const fit = x.fit ? FIT[x.fit] : null;
                    const left = o.deadline ? daysUntil(o.deadline, today) : null;
                    return (
                      <li key={x.id} className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
                        <div className="flex items-start justify-between gap-3">
                          <span className="label-mono min-w-0 truncate">{o.sponsor ?? "Scholarship"}</span>
                          {fit && <Tag tone={fit[1]}>{fit[0]}</Tag>}
                        </div>
                        <p className="mt-2 font-serif text-[20px] leading-snug">{o.name}</p>
                        {o.amount_note && <p className="mt-2 font-serif text-[17px] text-brand">{o.amount_note}</p>}
                        {x.why && (
                          <div className="mt-3 border-t border-line pt-3 text-[13.5px] leading-relaxed">
                            <p className="label-mono mb-1">Why you</p>
                            <Clamp lines={3}>{x.why}</Clamp>
                          </div>
                        )}
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-[12.5px]">
                          {o.deadline && (
                            <span className={`inline-flex items-center gap-1.5 ${left !== null && left >= 0 && left <= 14 ? "font-medium text-stop" : "text-muted"}`}>
                              <CalendarDays className="size-3.5" aria-hidden />
                              {new Date(o.deadline + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
                              {left !== null && left >= 0 ? ` · ${left} days` : " · passed"}
                            </span>
                          )}
                          {o.intl_eligible === false && <Tag tone="stop">Not for international students</Tag>}
                          {o.url && (
                            <a href={o.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-medium text-brand hover:underline">
                              Details <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          )}
                        </div>
                        {o.eligibility && <p className="mt-2 line-clamp-2 text-[12px] text-muted">{o.eligibility}</p>}
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                          {x.application_id ? (
                            <>
                              <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                                <span className={`size-1.5 rounded-full ${x.applications?.status === "submitted" || x.status === "applied" ? "bg-go" : "bg-signal"}`} aria-hidden />
                                {x.applications?.status === "submitted" || x.status === "applied" ? "Applied" : x.applications?.status === "packet_approved" ? "Signed, submitting" : x.applications?.status === "ready_for_review" ? "Essays ready for you" : "Agents are preparing it"}
                              </span>
                              <ButtonLink href={`/applications/${x.application_id}`} size="sm" variant="secondary">
                                Open
                              </ButtonLink>
                            </>
                          ) : left !== null && left < 0 ? (
                            <span className="text-[12.5px] text-muted">Deadline passed</span>
                          ) : o.intl_eligible === false ? (
                            <span className="text-[12.5px] text-muted">Not open to you</span>
                          ) : (
                            <>
                              <span className="text-[12.5px] text-muted">Agents draft the essays; you sign.</span>
                              <ApplyScholarship id={x.id} />
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                </>
              ) : (
                <Empty icon={<Award className="size-5" />} title="No scholarships matched yet" body="Choose Find scholarships and the agents look for funding that fits your profile." action={<ScholarshipButton running={false} />} />
              )
            ) : list.length ? (
              <ProgramList rows={list} today={today} />
            ) : (
              <Empty
                title={view === "shortlisted" ? "Nothing shortlisted yet" : "Nothing here"}
                body={view === "shortlisted" ? (checking.length ? "Programs that need a closer look are under Worth a check." : "Choose Find more programs to build your shortlist.") : "Nothing in this list right now."}
              />
            )}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Preferences regions={prof.preferences.regions ?? []} degreeTypes={prof.goals.degree_types ?? []} allRegions={REGIONS} level={prof.goals.study_level} maxRegions={plan.maxRegions} />
          {timeline.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <p className="label-mono">Next deadlines</p>
              <ul className="mt-2 divide-y divide-line">
                {timeline.map(({ r, d }) => (
                  <li key={r.id + d.round} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px]">{r.programs.schools.name.split(/[,(]/)[0].trim()}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {d.round}
                        {d.funding_priority === "yes" ? " · funding round" : ""}
                      </span>
                    </span>
                    <Due date={d.date} today={today} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {notes.length > 0 && <StrategyNotes notes={notes} regions={REGIONS} />}
        </aside>
      </div>
    </div>
  );
}
