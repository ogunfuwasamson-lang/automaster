"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, FlaskConical, GraduationCap, LoaderCircle, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { chipClass, Tag } from "@/components/ui/chip";
import { OpenScholarships, SharpenQuestionView } from "@/components/profile/sharpen-card";
import { sharpenQuestions } from "@/lib/sharpen";
import { openScholarships } from "@/lib/open-scholarships";

type Match = {
  programId: string;
  school: string;
  program: string;
  country: string | null;
  deadline: { date: string; round: string } | null;
  funding: "fully funded option" | "funding possible" | null;
  awards: number;
  tuition?: number | null;
  englishWaiver?: boolean;
};

const LEVELS: [string, string, typeof BookOpen][] = [
  ["undergraduate", "Bachelor's", BookOpen],
  ["masters", "Master's", GraduationCap],
  ["phd", "PhD", FlaskConical],
];
const SUGGEST = ["Data Science", "Computer Science", "Public Health", "Business", "Finance", "Engineering", "Economics", "Law"];
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function Matcher({ regions: allRegions, initial }: { regions: Record<string, string>; initial: { level: string; fields: string[]; regions: string[] } }) {
  const [level, setLevel] = useState(initial.level);
  const [fields, setFields] = useState<string[]>(initial.fields);
  const [draft, setDraft] = useState("");
  const [regions, setRegions] = useState<string[]>(initial.regions);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const results = useRef<HTMLDivElement>(null);
  // "sharpen your matches", kept in the page until sign-up carries it into the account (onboarding saves it)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const asked = sharpenQuestions((level || null) as "undergraduate" | "masters" | "phd" | null).filter(
    (q) => ["citizenship", "funding", "budget", "english", "tests"].includes(q.key) && !(q.key === "budget" && answers.funding === "full"),
  );
  const nextQ = asked.find((q) => !(q.key in answers));
  const prefs = Object.fromEntries(Object.entries(answers).filter(([k, v]) => v !== "skip" && k !== "citizenship" && k !== "grades"));
  const citizenship = answers.citizenship && answers.citizenship !== "skip" ? answers.citizenship : null;
  const open = openScholarships(citizenship, regions);
  const ready = !!level && (fields.length > 0 || !!draft.trim()) && regions.length > 0;

  async function find(extra: Record<string, string> = prefs, scroll = true) {
    const all = draft.trim() && !fields.includes(draft.trim()) ? [...fields, draft.trim()] : fields;
    if (draft.trim()) {
      setFields(all.slice(0, 4));
      setDraft("");
    }
    setBusy(true);
    const q = new URLSearchParams({ level, fields: all.join("|"), regions: regions.join(","), ...extra });
    const j = await fetch(`/api/public/matches?${q}`).then((r) => (r.ok ? r.json() : { matches: [] })).catch(() => ({ matches: [] }));
    setMatches(j.matches ?? []);
    setBusy(false);
    if (scroll) requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function answer(key: string, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (key !== "citizenship") void find(Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== "skip" && k !== "citizenship")), false);
  }

  // arriving from the home page with everything understood: show the matches straight away
  useEffect(() => {
    if (initial.level && initial.fields.length && initial.regions.length) void find({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sign-up carries the choices into setup, which saves them and opens on the matches screen
  const carry = new URLSearchParams({ level, fields: fields.join("|"), regions: regions.join(","), ...Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== "skip")) });
  const signup = `/login?mode=signup&next=${encodeURIComponent(`/onboarding?${carry}`)}`;

  return (
    <div className="space-y-10">
      <div className="space-y-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8">
        <div className="space-y-3">
          <p className="font-bold">What level?</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => setLevel(k)} aria-pressed={level === k} className={`${chipClass(level === k, "md")} inline-flex items-center gap-2`}>
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="font-bold">Which field?</p>
          {fields.length ? (
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 py-1.5 pl-3.5 pr-2 text-sm font-semibold text-accent ring-1 ring-accent/25">
                  {f}
                  <button type="button" onClick={() => setFields(fields.filter((x) => x !== f))} aria-label={`Remove ${f}`} className="grid size-6 place-items-center rounded-full hover:bg-accent/15">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <form
            className="flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = draft.trim();
              if (v && !fields.includes(v) && fields.length < 4) setFields([...fields, v]);
              setDraft("");
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. public health" aria-label="Field of study" />
            <Button type="submit" variant="secondary">Add</Button>
          </form>
          {!fields.length && (
            <div className="flex flex-wrap gap-2">
              {SUGGEST.map((s) => (
                <button key={s} type="button" onClick={() => setFields([s])} className={chipClass(false, "sm")}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <p className="font-bold">Where?</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(allRegions).map(([k, label]) => {
              const on = regions.includes(k);
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => setRegions(on ? regions.filter((r) => r !== k) : [...regions, k])} className={chipClass(on, "md")}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <Button size="lg" disabled={!ready || busy} onClick={() => find()}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {busy ? "Finding matches…" : "Show my matches"}
        </Button>
      </div>

      <div ref={results} className="scroll-mt-24" aria-live="polite">
        {matches && (
          <div className="space-y-6">
            {matches.length ? (
              <>
                <h2 className="text-[26px] leading-tight sm:text-[32px]">{matches.length} programme{matches.length > 1 ? "s" : ""} that fit</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {matches.map((m) => (
                    <li key={m.programId} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                      <p className="text-[12.5px] text-muted">{m.school}{m.country ? `, ${m.country}` : ""}</p>
                      <p className="mt-0.5 text-[15px] font-bold leading-snug tracking-[-0.01em]">{m.program}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <Tag>{m.deadline ? `Closes ${day(m.deadline.date)}` : "Deadline being checked"}</Tag>
                        {m.funding && <Tag tone="go">{m.funding === "fully funded option" ? "Fully funded option" : "Funding possible"}</Tag>}
                        {m.awards ? <Tag tone="accent">{m.awards} scholarship{m.awards > 1 ? "s" : ""} on file</Tag> : null}
                          {m.tuition ? <Tag>Tuition about ${Math.round(m.tuition / 1000)}k a year</Tag> : null}
                          {m.englishWaiver ? <Tag tone="go">Accepts an English-medium letter</Tag> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="max-w-2xl text-[16px] leading-relaxed text-muted">
                We haven&apos;t checked programmes in that field and region yet. Make a free account and your agents search for you, with new matches every morning.
              </p>
            )}
            {(nextQ || open.length > 0) && (
              <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-label="Sharpen your matches">
                {nextQ ? (
                  <>
                    <p className="text-[13px] font-medium text-brand">Sharpen your matches: {asked.length - asked.filter((q) => !(q.key in answers)).length} of {asked.length}</p>
                    <SharpenQuestionView key={nextQ.key} q={nextQ} busy={busy} onAnswer={(v) => answer(nextQ.key, v)} />
                  </>
                ) : null}
                <OpenScholarships items={open} citizenship={citizenship} />
              </section>
            )}
            <section className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5 sm:p-6">
              <p className="text-[19px] font-bold tracking-[-0.02em]">{matches.length ? "Save these, and get your fit score on each" : "Let your agents search for you"}</p>
              <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted">
                Add your CV and Ivyward AI scores how well you fit each programme, finds scholarships you qualify for, and keeps searching: new matches every morning. When you&apos;re ready, it drafts your essays and fills in the application forms. Nothing goes to a school until you sign.
              </p>
              <ButtonLink href={signup} size="lg" className="mt-4">Start for free</ButtonLink>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
