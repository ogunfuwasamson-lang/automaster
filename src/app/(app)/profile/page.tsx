import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile, profileGaps, completeness } from "@/lib/profile";

export const dynamic = "force-dynamic";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  const empty = v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 py-1.5 text-sm max-sm:grid-cols-1 max-sm:gap-0">
      <dt className="text-neutral-500">{k}</dt>
      <dd className={empty ? "text-neutral-400" : ""}>{empty ? "—" : Array.isArray(v) ? v.join(", ") : v}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">{title}</h2>
      <div className="rounded-md border border-neutral-200 px-4 py-2 dark:border-neutral-800">{children}</div>
    </section>
  );
}

const money = (n: number | null) => (n == null ? null : `$${n.toLocaleString()}`);

export default async function ProfilePage() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await auth.sb.from("profiles").select("profile").single();
  const p = loadProfile(data?.profile);
  const gaps = profileGaps(p);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">profile</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {completeness(p)}% complete. built from your documents and the interview. something wrong? tell the interviewer and it corrects it.
          </p>
        </div>
        <Link href="/interview" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900">
          {gaps.length ? `fill ${gaps.length} gaps` : "talk to interviewer"}
        </Link>
      </header>

      {gaps.length > 0 && (
        <Section title="still missing">
          <ul className="list-disc space-y-1 py-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
            {gaps.map((g) => <li key={g.key}>{g.ask}</li>)}
          </ul>
        </Section>
      )}

      <Section title="goals">
        <Row k="fields" v={p.goals.fields} />
        <Row k="degree types" v={p.goals.degree_types} />
        <Row k="term" v={p.goals.target_term} />
        <Row k="gmat / gre" v={p.goals.gmat_gre_plan?.replace("_", " ")} />
        <Row k="right after" v={p.goals.short_term_goal} />
        <Row k="long term" v={p.goals.long_term_goal} />
        <Row k="why a masters" v={p.goals.why_masters} />
      </Section>

      <Section title="funding">
        <Row k="need" v={p.funding.need} />
        <Row k="can cover / yr" v={money(p.funding.annual_budget_usd)} />
        <Row k="fee budget" v={money(p.funding.application_fee_budget_usd)} />
        <Row k="notes" v={p.funding.notes} />
      </Section>

      <Section title="education">
        {p.education.length ? (
          p.education.map((e, i) => (
            <div key={i} className="py-2 text-sm">
              <p className="font-medium">{[e.degree, e.field].filter(Boolean).join(", ") || "degree"} · {e.institution}</p>
              <p className="text-neutral-500">{[e.start, e.end].filter(Boolean).join("–")}{e.grade ? ` · ${e.grade}` : ""}</p>
            </div>
          ))
        ) : (
          <p className="py-2 text-sm text-neutral-400">—</p>
        )}
      </Section>

      <Section title="work">
        {p.work.length ? (
          p.work.map((w, i) => (
            <div key={i} className="py-2 text-sm">
              <p className="font-medium">{w.role} · {w.company}</p>
              <p className="text-neutral-500">{[w.start, w.end ?? "present"].filter(Boolean).join("–")}{w.location ? ` · ${w.location}` : ""}</p>
              {w.highlights.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-neutral-700 dark:text-neutral-300">
                  {w.highlights.map((h) => <li key={h}>{h}</li>)}
                </ul>
              )}
            </div>
          ))
        ) : (
          <p className="py-2 text-sm text-neutral-400">—</p>
        )}
      </Section>

      <Section title="tests & english">
        {p.tests.map((t) => (
          <Row key={t.name} k={t.name} v={[t.status.replace("_", " "), t.score, t.date].filter(Boolean).join(" · ")} />
        ))}
        <Row k="english proof" v={p.english.route} />
        {p.english.notes && <Row k="" v={p.english.notes} />}
      </Section>

      <Section title="preferences">
        <Row k="locations" v={p.preferences.locations === null ? null : p.preferences.locations.length ? p.preferences.locations : "no preference"} />
        <Row k="avoid" v={p.preferences.avoid} />
        <Row k="stem preferred" v={p.preferences.stem_preferred == null ? null : p.preferences.stem_preferred ? "yes" : "no"} />
        <Row k="applications" v={p.preferences.max_applications} />
        <Row k="recommenders" v={p.recommenders.count_lined_up} />
      </Section>

      <Section title="stories (essay material)">
        {p.stories.length ? (
          p.stories.map((s) => (
            <div key={s.title} className="py-2 text-sm">
              <p className="font-medium">{s.title}</p>
              <p className="text-neutral-600 dark:text-neutral-400">{s.summary}</p>
              {s.metrics.length > 0 && <p className="text-neutral-500">{s.metrics.join(" · ")}</p>}
            </div>
          ))
        ) : (
          <p className="py-2 text-sm text-neutral-400">—</p>
        )}
      </Section>

      {p.skills.length > 0 && (
        <Section title="skills">
          <p className="py-2 text-sm">{p.skills.join(", ")}</p>
        </Section>
      )}
    </main>
  );
}
