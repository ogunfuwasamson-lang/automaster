import { CircleDashed, MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile, profileGaps, completeness, sortWork, LEVEL_LABEL } from "@/lib/profile";
import { Decisions, type Decision } from "@/components/decisions";
import { CleanupButton } from "@/components/cleanup-button";
import { PortalDetailsForm } from "./portal-details";
import type { PortalDetails, RecommenderRow } from "@/lib/portal-fields";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  const empty = v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  return (
    <div className="grid grid-cols-[11rem_minmax(0,1fr)] gap-4 py-2.5 text-sm max-sm:grid-cols-1 max-sm:gap-0.5">
      <dt className="text-muted">{k}</dt>
      <dd className={empty ? "text-neutral-400" : "leading-relaxed"}>{empty ? "Not yet" : Array.isArray(v) ? v.join(", ") : v}</dd>
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="divide-y divide-line rounded-3xl border border-line bg-surface shadow-card px-5 py-1">{children}</div>
    </section>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-16 shrink-0 place-items-center" role="img" aria-label={`${pct}% complete`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={pct >= 80 ? "var(--color-go)" : "var(--color-signal)"} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <span className="font-display text-xl font-bold tabular">{pct}</span>
    </span>
  );
}

const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const money = (n: number | null) => (n == null ? null : `$${n.toLocaleString()}`);

export default async function ProfilePage() {
  const auth = await requireUser();
  if (!auth) return null;
  const [{ data }, { data: decisions }, { data: recs }] = await Promise.all([
    auth.sb.from("profiles").select("profile, portal_details").single(),
    auth.sb.from("approvals").select("id, kind, title, summary, payload").eq("kind", "fact_confirm").eq("status", "pending").order("created_at"),
    auth.sb.from("recommenders").select("name, email, title, organization, relationship, phone").order("created_at"),
  ]);
  const p = loadProfile(data?.profile);
  const gaps = profileGaps(p);

  const pct = completeness(p);
  const toc: [string, string][] = [
    ...(decisions?.length ? ([["conflicts", "Settle conflicts"]] as [string, string][]) : []),
    ["details", "Form details"],
    ...(gaps.length ? ([["missing", "Still missing"]] as [string, string][]) : []),
    ["goals", "Goals"],
    ["funding", "Funding"],
    ["education", "Education"],
    ["work", "Work"],
    ["tests", "Tests and English"],
    ["preferences", "Preferences"],
    ["stories", "Stories"],
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Profile"
        description="Built from your documents and the interview. Every essay and form uses only what's here. Something wrong? Tell the interviewer and it corrects it."
        actions={
          <>
            <CleanupButton />
            <ButtonLink href="/interview">
              <MessagesSquare className="size-4" aria-hidden />
              {gaps.length ? `Fill ${gaps.length} gap${gaps.length === 1 ? "" : "s"}` : "Talk to the interviewer"}
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-6">
            <div className="flex items-center gap-3">
              <Ring pct={pct} />
              <span className="text-sm leading-snug text-muted">
                <span className="block font-medium text-foreground">{pct}% complete</span>
                {gaps.length ? `${gaps.length} gap${gaps.length === 1 ? "" : "s"} left` : "Nothing missing"}
              </span>
            </div>
            <nav aria-label="Profile sections">
              <ul className="space-y-0.5 border-l border-line text-sm">
                {toc.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`} className="-ml-px block border-l border-transparent py-1 pl-3 text-muted hover:border-foreground hover:text-foreground">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          <div className="flex items-center gap-3 lg:hidden">
            <Ring pct={pct} />
            <span className="text-sm text-muted">{gaps.length ? `${gaps.length} gap${gaps.length === 1 ? "" : "s"} left to fill` : "Nothing missing"}</span>
          </div>

          {decisions?.length ? (
            <section id="conflicts" className="scroll-mt-24 space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">Your sources disagree ({decisions.length})</h2>
              <p className="text-sm text-muted">Pick the right value. Essays and forms only use what you confirm.</p>
              <Decisions items={decisions as Decision[]} />
            </section>
          ) : null}

          <section id="details" className="scroll-mt-24 space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">Details for application forms</h2>
            <p className="text-sm text-muted">Contact, address and recommenders. The agents copy these into every portal so you never type them twice.</p>
            <div className="rounded-3xl border border-line bg-surface shadow-card p-5">
              <PortalDetailsForm details={(data?.portal_details ?? {}) as PortalDetails} recommenders={(recs ?? []) as RecommenderRow[]} />
            </div>
          </section>

          {gaps.length > 0 && (
            <section id="missing" className="scroll-mt-24 space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">Still missing</h2>
              <ul className="space-y-2 rounded-3xl border border-signal/25 bg-[color-mix(in_oklab,var(--signal)_6%,var(--surface))] px-5 py-4 text-sm shadow-card">
                {gaps.map((g) => (
                  <li key={g.key} className="flex gap-2.5">
                    <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                    {cap(g.ask)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.confirmed_facts.length > 0 && (
            <Block id="confirmed" title="Confirmed by you">
              {p.confirmed_facts.map((f) => <Row key={f.topic} k={cap(f.topic) ?? ""} v={f.value} />)}
            </Block>
          )}

          <Block id="goals" title="Goals">
            <Row k="Applying for" v={p.goals.study_level ? LEVEL_LABEL[p.goals.study_level] : null} />
            <Row k="Fields" v={p.goals.fields} />
            {p.goals.research_interests?.length ? <Row k="Research interests" v={p.goals.research_interests} /> : null}
            <Row k="Degree types" v={p.goals.degree_types} />
            <Row k="Start" v={p.goals.target_term} />
            <Row k="Citizenship" v={p.identity.citizenship} />
            <Row k="Admissions tests" v={cap(p.goals.gmat_gre_plan?.replace(/_/g, " "))} />
            <Row k="Right after" v={p.goals.short_term_goal} />
            <Row k="Long term" v={p.goals.long_term_goal} />
            <Row k="Why this degree" v={p.goals.why_masters} />
          </Block>

          <Block id="funding" title="Funding">
            <Row k="Need" v={cap(p.funding.need)} />
            <Row k="Can cover per year" v={money(p.funding.annual_budget_usd)} />
            <Row k="Fee budget" v={money(p.funding.application_fee_budget_usd)} />
            <Row k="Notes" v={p.funding.notes} />
          </Block>

          <Block id="education" title="Education">
            {p.education.length ? (
              p.education.map((e, i) => (
                <div key={i} className="py-3 text-sm">
                  <p className="font-medium">{[e.degree, e.field].filter(Boolean).join(", ") || "Degree"}</p>
                  <p className="text-muted">
                    {e.institution}
                    {[e.start, e.end].filter(Boolean).length ? `, ${[e.start, e.end].filter(Boolean).join(" to ")}` : ""}
                    {e.grade ? `. ${e.grade}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-neutral-400">Not yet</p>
            )}
          </Block>

          <Block id="work" title="Work">
            {p.work.length ? (
              sortWork(p.work).map((w, i) => (
                <div key={i} className="py-3 text-sm">
                  <p className="font-medium">
                    {w.role}, {w.company}
                  </p>
                  <p className="text-muted">
                    {[w.start, w.end ?? "present"].filter(Boolean).join(" to ")}
                    {w.location ? `, ${w.location}` : ""}
                  </p>
                  {w.highlights.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                      {w.highlights.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-neutral-400">Not yet</p>
            )}
          </Block>

          <Block id="tests" title="Tests and English">
            {p.tests.map((t) => (
              <Row key={t.name} k={t.name} v={[cap(t.status.replace(/_/g, " ")), t.score, t.date].filter(Boolean).join(", ")} />
            ))}
            <Row k="English proof" v={cap(p.english.route)} />
            {p.english.notes && <Row k="Notes" v={p.english.notes} />}
          </Block>

          <Block id="preferences" title="Preferences">
            <Row k="Locations" v={p.preferences.locations === null ? null : p.preferences.locations.length ? p.preferences.locations : "No preference"} />
            <Row k="Avoid" v={p.preferences.avoid} />
            <Row k="STEM preferred" v={p.preferences.stem_preferred == null ? null : p.preferences.stem_preferred ? "Yes" : "No"} />
            <Row k="Applications" v={p.preferences.max_applications} />
            <Row k="Recommenders lined up" v={p.recommenders.count_lined_up} />
          </Block>

          <Block id="stories" title="Stories for essays">
            {p.stories.length ? (
              p.stories.map((st) => (
                <div key={st.title} className="py-3 text-sm">
                  <p className="font-medium">{st.title}</p>
                  <p className="mt-0.5 leading-relaxed text-muted">{st.summary}</p>
                  {st.metrics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {st.metrics.map((m) => <Tag key={m}>{m}</Tag>)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-neutral-400">The interviewer collects these as you talk.</p>
            )}
          </Block>

          {p.skills.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">Skills</h2>
              <div className="flex flex-wrap gap-1.5">{p.skills.map((sk) => <Tag key={sk}>{sk}</Tag>)}</div>
            </section>
          )}

          {p.notes.length > 0 && (
            <Block id="notes" title="Other notes">
              <ul className="list-disc space-y-1 py-3 pl-5 text-sm leading-relaxed">
                {p.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </Block>
          )}
        </div>
      </div>
    </div>
  );
}
