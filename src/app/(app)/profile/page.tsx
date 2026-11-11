import Link from "next/link";
import { SceneInk } from "@/components/landing/page-ink";
import { BadgeCheck, Briefcase, CircleDashed, GraduationCap, Languages, MapPin, MessagesSquare, SlidersHorizontal, Target, Wallet } from "lucide-react";
import { Clamp } from "@/components/ui/clamp";
import { ButtonLink } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile, profileGaps, completeness, sortWork, LEVEL_LABEL } from "@/lib/profile";
import { Decisions, type Decision } from "@/components/decisions";
import { CleanupButton } from "@/components/cleanup-button";
import { PortalDetailsForm } from "./portal-details";
import type { PortalDetails, RecommenderRow } from "@/lib/portal-fields";
import { ChapterGrid } from "@/components/profile/chapter-grid";
import { chapterStates, formReadiness, type Level } from "@/lib/profile-chapters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-16 shrink-0 place-items-center" role="img" aria-label={`${pct}% complete`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--grad-a)" />
            <stop offset="0.5" stopColor="var(--grad-b)" />
            <stop offset="1" stopColor="var(--grad-c)" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="url(#ring)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <span className="text-lg font-bold tracking-[-0.03em] tabular">{pct}</span>
    </span>
  );
}

const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const money = (n: number | null) => (n == null ? null : `$${n.toLocaleString()}`);

const TABS: [string, string][] = [
  ["overview", "Overview"],
  ["chapters", "Application profile"],
  ["details", "All form details"],
  ["experience", "Experience"],
  ["stories", "Stories and skills"],
];

function Card({ title, icon: Icon, tone, children, className = "" }: { title: string; icon: typeof Target; tone: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-line bg-surface p-5 shadow-card ${className}`}>
      <h2 className="mb-2 flex items-center gap-2.5 text-[15px] font-bold tracking-[-0.01em]">
        <span className={`grid size-8 place-items-center rounded-xl ${tone}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        {title}
      </h2>
      <dl className="divide-y divide-line">{children}</dl>
    </section>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  const empty = v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  return (
    <div className="flex gap-4 py-2.5 text-[13.5px]">
      <dt className="w-32 shrink-0 text-muted">{k}</dt>
      <dd className={`min-w-0 flex-1 ${empty ? "text-muted" : "font-medium leading-relaxed"}`}>{empty ? "Not yet" : Array.isArray(v) ? v.join(", ") : v}</dd>
    </div>
  );
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string; setup?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { tab: t, setup } = await searchParams;
  const tab = TABS.some(([k]) => k === t) ? t! : "overview";
  const [{ data }, { data: decisions }, { data: recs }] = await Promise.all([
    auth.sb.from("profiles").select("profile, portal_details").single(),
    auth.sb.from("approvals").select("id, kind, title, summary, payload").eq("kind", "fact_confirm").eq("status", "pending").order("created_at"),
    auth.sb.from("recommenders").select("name, email, title, organization, relationship, phone").order("created_at"),
  ]);
  const p = loadProfile(data?.profile);
  const gaps = profileGaps(p);
  const pct = completeness(p);
  const name = p.identity.full_name ?? "Your profile";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const where = [p.identity.city, p.identity.country_of_residence].filter(Boolean).join(", ");
  const target = [p.goals.study_level ? cap(LEVEL_LABEL[p.goals.study_level]) : null, p.goals.target_term].filter(Boolean).join(" for ");
  const current = sortWork(p.work)[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* hero */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="relative h-24 overflow-hidden border-b border-line bg-background sm:h-32">
          <SceneInk name="cloister" className="absolute inset-x-0 bottom-0 h-[260px] w-full" />
        </div>
        <div className="flex flex-wrap items-end gap-4 px-5 pb-4 sm:px-6">
          <span className="-mt-9 grid size-[72px] shrink-0 place-items-center rounded-full border-4 border-surface bg-hero-gradient font-serif text-2xl text-white">{initials || "?"}</span>
          <div className="min-w-0 flex-1 basis-[calc(100%-88px)] pt-3 sm:basis-0">
            <h1 className="break-words text-2xl font-bold leading-tight tracking-[-0.04em]">{name}</h1>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
              {current && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="size-3.5" aria-hidden /> {current.role}, {current.company}
                </span>
              )}
              {where && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden /> {where}
                </span>
              )}
              {target && (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="size-3.5" aria-hidden /> {target}
                </span>
              )}
            </div>
          </div>
          <div className="flex w-full items-center gap-4 sm:w-auto">
            <div className="flex items-center gap-3">
              <Ring pct={pct} />
              <span className="text-[12.5px] leading-snug text-muted">
                <span className="block font-bold text-foreground">Profile strength</span>
                {gaps.length ? `${gaps.length} gap${gaps.length === 1 ? "" : "s"} left` : "Complete"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-2 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Profile sections">
            {TABS.map(([k, label]) => (
              <Link key={k} href={`/profile?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`relative shrink-0 rounded-xl px-3.5 py-2 text-[13.5px] font-bold transition-colors ${tab === k ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"}`}>
                {label}
                {k === "overview" && (decisions?.length ?? 0) > 0 && <span className="ml-1.5 inline-grid size-5 place-items-center rounded-full bg-signal text-[10px] text-white">{decisions!.length}</span>}
              </Link>
            ))}
          </nav>
          <div className="flex gap-2">
            <CleanupButton />
            <ButtonLink href={`/profile?tab=${tab}&chat=open`} variant="accent">
              <MessagesSquare className="size-4" aria-hidden />
              {gaps.length ? `Fill ${gaps.length} gap${gaps.length === 1 ? "" : "s"}` : "Talk to Ivyward AI"}
            </ButtonLink>
          </div>
        </div>
      </section>

      {tab === "overview" && (
        <div className="space-y-5">
          {decisions?.length ? (
            <section className="rounded-3xl border border-signal/25 bg-[color-mix(in_oklab,var(--signal)_5%,var(--surface))] p-5 shadow-card">
              <h2 className="text-[15px] font-bold">Your sources disagree ({decisions.length})</h2>
              <p className="mb-3 text-[13px] text-muted">Pick the right value. Essays and forms only use what you confirm.</p>
              <Decisions items={decisions as Decision[]} />
            </section>
          ) : null}

          {gaps.length > 0 && (
            <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[15px] font-bold">Still missing</h2>
                <Link href={`/profile?tab=overview&chat=open`} className="text-[12.5px] font-bold text-brand hover:underline">
                  Answer these with Ivyward AI
                </Link>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {gaps.map((g) => (
                  <li key={g.key} className="flex gap-2.5 rounded-2xl bg-neutral-50 px-3.5 py-2.5 text-[13px] leading-snug dark:bg-neutral-900/60">
                    <CircleDashed className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
                    {cap(g.ask)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Goals" icon={Target} tone="text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300">
              <Item k="Applying for" v={p.goals.study_level ? cap(LEVEL_LABEL[p.goals.study_level]) : null} />
              <Item k="Fields" v={p.goals.fields} />
              {p.goals.research_interests?.length ? <Item k="Research" v={p.goals.research_interests} /> : null}
              <Item k="Degree types" v={p.goals.degree_types} />
              <Item k="Start" v={p.goals.target_term} />
              <Item k="Right after" v={p.goals.short_term_goal} />
              <Item k="Long term" v={p.goals.long_term_goal} />
              <Item k="Why this degree" v={p.goals.why_masters ? <Clamp lines={3}>{p.goals.why_masters}</Clamp> : null} />
            </Card>
            <div className="space-y-5">
              <Card title="Funding" icon={Wallet} tone="text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300">
                <Item k="Need" v={cap(p.funding.need)} />
                <Item k="Can cover a year" v={money(p.funding.annual_budget_usd)} />
                <Item k="Fee budget" v={money(p.funding.application_fee_budget_usd)} />
                {p.funding.notes ? <Item k="Notes" v={p.funding.notes} /> : null}
              </Card>
              <Card title="Tests and English" icon={Languages} tone="text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300">
                {p.tests.map((x) => (
                  <Item key={x.name} k={x.name} v={[cap(x.status.replace(/_/g, " ")), x.score, x.date].filter(Boolean).join(", ")} />
                ))}
                <Item k="Admissions tests" v={cap(p.goals.gmat_gre_plan?.replace(/_/g, " "))} />
                <Item k="English proof" v={cap(p.english.route)} />
              </Card>
            </div>
            <Card title="Preferences" icon={SlidersHorizontal} tone="text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300">
              <Item k="Citizenship" v={p.identity.citizenship} />
              <Item k="Locations" v={p.preferences.locations === null ? null : p.preferences.locations.length ? p.preferences.locations : "No preference"} />
              <Item k="Avoid" v={p.preferences.avoid} />
              <Item k="STEM preferred" v={p.preferences.stem_preferred == null ? null : p.preferences.stem_preferred ? "Yes" : "No"} />
              <Item k="Applications" v={p.preferences.max_applications} />
              <Item k="Recommenders" v={p.recommenders.count_lined_up} />
            </Card>
            {p.confirmed_facts.length > 0 && (
              <Card title="Confirmed by you" icon={BadgeCheck} tone="text-go bg-go/10">
                {p.confirmed_facts.map((f) => (
                  <Item key={f.topic} k={cap(f.topic) ?? ""} v={f.value} />
                ))}
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "chapters" && (
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
          <ChapterGrid
            states={chapterStates((data?.portal_details ?? {}) as PortalDetails, (loadProfile(data?.profile).goals.study_level as Level | null) ?? null)}
            readiness={formReadiness((data?.portal_details ?? {}) as PortalDetails, (loadProfile(data?.profile).goals.study_level as Level | null) ?? null)}
          />
        </div>
      )}

      {tab === "details" && (
        <section id="details" className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
          {setup ? (
            <div className="mb-6 rounded-2xl border border-brand/25 bg-brand/[0.05] px-4 py-3.5">
              <p className="font-medium">Last step of setup</p>
              <p className="mt-0.5 text-[13.5px] text-muted">Your agents are already building your shortlist. These details go into every application form, so fill them in now and they won&apos;t have to stop and ask later.</p>
            </div>
          ) : null}
          <h2 className="text-lg font-bold tracking-[-0.02em]">Details for application forms</h2>
          <p className="mb-6 mt-1 max-w-2xl text-[13.5px] text-muted">What school forms ask: contact, citizenship, languages, background, family, interests and recommenders. Fill in what you can; the agents use it on every portal so no school asks twice, and anything a school asks later is saved here too.</p>
          <PortalDetailsForm
            setup={!!setup}
            details={{ ...((data?.portal_details ?? {}) as PortalDetails), email: ((data?.portal_details ?? {}) as PortalDetails).email || auth.user.email || null }}
            recommenders={(recs ?? []) as RecommenderRow[]}
          />
        </section>
      )}

      {tab === "experience" && (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="mb-4 flex items-center gap-2.5 text-[15px] font-bold">
              <span className="grid size-8 place-items-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <Briefcase className="size-4" aria-hidden />
              </span>
              Work
            </h2>
            {p.work.length ? (
              <ol className="relative space-y-5 border-l-2 border-line pl-6">
                {sortWork(p.work).map((w, i) => (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[31px] top-1 size-3.5 rounded-full border-[3px] border-surface ${i === 0 && !w.end ? "bg-accent" : "bg-neutral-300 dark:bg-neutral-600"}`} aria-hidden />
                    <p className="font-bold">{w.role}</p>
                    <p className="text-[13px] text-muted">
                      {w.company}, {[w.start, w.end ?? "present"].filter(Boolean).join(" to ")}
                      {w.location ? `, ${w.location}` : ""}
                    </p>
                    {w.highlights.length > 0 && (
                      <ul className="mt-2 space-y-1 text-[13.5px] leading-relaxed">
                        {w.highlights.map((h) => (
                          <li key={h} className="flex gap-2">
                            <span className="mt-[8px] size-1.5 shrink-0 rounded-full bg-accent/60" aria-hidden />
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Upload your CV and your work history appears here.</p>
            )}
          </section>
          <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="mb-4 flex items-center gap-2.5 text-[15px] font-bold">
              <span className="grid size-8 place-items-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <GraduationCap className="size-4" aria-hidden />
              </span>
              Education
            </h2>
            {p.education.length ? (
              <ul className="space-y-3">
                {p.education.map((e, i) => (
                  <li key={i} className="rounded-2xl bg-neutral-50 p-3.5 dark:bg-neutral-900/60">
                    <p className="font-bold">{[e.degree, e.field].filter(Boolean).join(", ") || "Degree"}</p>
                    <p className="text-[13px] text-muted">{e.institution}</p>
                    <p className="mt-1 text-xs text-muted">
                      {[e.start, e.end].filter(Boolean).join(" to ")}
                      {e.grade ? `. ${e.grade}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Upload a transcript and your education appears here.</p>
            )}
          </section>
        </div>
      )}

      {tab === "stories" && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="mb-1 text-[15px] font-bold">Stories for essays</h2>
            <p className="mb-4 text-[13px] text-muted">Moments the writer can draw on. Ivyward AI collects these as you talk.</p>
            {p.stories.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {p.stories.map((st) => (
                  <li key={st.title} className="rounded-2xl border border-line p-4">
                    <p className="font-bold">{st.title}</p>
                    <div className="mt-1 text-[13px] leading-relaxed text-muted">
                      <Clamp lines={3}>{st.summary}</Clamp>
                    </div>
                    {st.metrics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {st.metrics.map((m) => (
                          <Tag key={m} tone="accent">
                            {m}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No stories yet.</p>
            )}
          </section>
          {p.skills.length > 0 && (
            <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <h2 className="mb-3 text-[15px] font-bold">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {p.skills.map((sk) => (
                  <Tag key={sk}>{sk}</Tag>
                ))}
              </div>
            </section>
          )}
          {p.notes.length > 0 && (
            <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <h2 className="mb-3 text-[15px] font-bold">Other notes</h2>
              <ul className="space-y-1.5 text-[13.5px] leading-relaxed">
                {p.notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span className="mt-[8px] size-1.5 shrink-0 rounded-full bg-accent/60" aria-hidden />
                    {n}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
