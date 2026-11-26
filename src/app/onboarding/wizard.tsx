"use client";
import { useEffect, useRef, useState } from "react";
import { CampusInk } from "@/components/landing/campus-ink";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, FileUp, X, LoaderCircle, GraduationCap, Globe2, BookOpen, FlaskConical, Sparkles, Mail, CalendarDays, CircleCheck, MessageCircle } from "lucide-react";
import { ThemeButton } from "@/components/theme";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { chipClass, Tag } from "@/components/ui/chip";
import { uploadDocument } from "@/lib/upload-client";
import { guessKind } from "@/lib/doc-kinds";
import { SharpenCard } from "@/components/profile/sharpen-card";
import { WhatsAppChannel } from "@/components/growth/whatsapp-channel";
import { LinkWhatsApp, isLinked, type WaState } from "@/components/whatsapp/link-whatsapp";
import { SETUP } from "@/lib/setup-steps";

const LEVELS: [string, string, string][] = [
  ["undergraduate", "Bachelor's", "A first degree"],
  ["masters", "Master's", "MSc, MA, MBA, MiM and similar"],
  ["phd", "PhD", "Doctoral and research degrees"],
];
const LEVEL_ICON: Record<string, typeof BookOpen> = { undergraduate: BookOpen, masters: GraduationCap, phd: FlaskConical };
const TERMS = ["Fall 2027", "Spring 2028", "Fall 2028"];
// four screens, then the agents start: what, where, the first matches (with the documents ask: CV, transcript and
// certificate, now that there's a reason to give them), and gmail and the calendar, so the agents can act for you.
// the transcript and certificate are asked for here because asked for later most people never added them (25 nov
// 2026: 12 of 20 applicants with a CV had no transcript, 11 neither). the rest (passport name, the profile
// chapters) is asked for when a form needs it (lib/kickoff): six screens of asks before anything to look at lost
// most people (nov 2026). gmail and the calendar come last, after the matches, and either can be skipped: without
// gmail an application waits whenever a portal emails a code (founder's call, 24 nov 2026: ask for both in setup).
// WhatsApp comes after the matches and can't be skipped (founder's call, 26 nov 2026: most people never came back to
// the dashboard or opened the emails; WhatsApp is how the agents reach them)
const STEPS = ["What you're applying for", "Where to study", "Your first matches", "WhatsApp", "Gmail and calendar"];
const STEP_ICON = [GraduationCap, Globe2, Sparkles, MessageCircle, Mail];
const STEP_HINT = ["Level, fields and start date", "Regions the agents search", "Programmes that fit, and your documents", "Where your agents reach you", "So the agents can act for you"];
const { matches: MATCHES, whatsapp: WHATSAPP, connect: CONNECT } = SETUP;
const LAST = STEPS.length;

const MAIL_NOTICE: Record<string, [string, boolean]> = {
  connected: ["Gmail connected.", true],
  declined: ["You cancelled on Google's screen, so nothing was connected.", false],
  scope: ["Google didn't grant the Gmail permissions. Try again and leave each one ticked.", false],
  expired: ["That link expired. Try again.", false],
  error: ["Couldn't connect Gmail. Try again.", false],
  unavailable: ["Connecting Gmail isn't switched on yet. You can do it later in Settings.", false],
  down: ["Connecting Gmail isn't working on our side right now. We've been alerted; try again later in Settings.", false],
};
const CAL_NOTICE: Record<string, [string, boolean]> = {
  connected: ["Google Calendar connected. Your deadlines are going on it now.", true],
  declined: ["You cancelled on Google's screen, so nothing was connected.", false],
  expired: ["That link expired. Try again.", false],
  error: ["Couldn't connect Google Calendar. Try again.", false],
  unavailable: ["Connecting a calendar isn't switched on yet. School events come as email invites instead.", false],
};

type Match = {
  programId: string;
  school: string;
  program: string;
  degree: string;
  country: string | null;
  deadline: { date: string; round: string } | null;
  funding: "fully funded option" | "funding possible" | null;
  awards: number;
  tuition?: number | null;
  englishWaiver?: boolean;
};

async function save(body: Record<string, unknown>) {
  const res = await fetch("/api/profile/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save");
}

const chip = (on: boolean) => chipClass(on, "md");
const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });


export function Onboarding(props: {
  userId: string;
  initialStep: number;
  level: string | null;
  fields: string[];
  term: string | null;
  regions: string[];
  allRegions: Record<string, string>;
  maxRegions: number;
  docCount: number;
  hasCv: boolean;
  hasTranscript: boolean;
  hasCertificate: boolean;
  gmail: { available: boolean; email: string | null; active: boolean; composio: boolean; notice: string | null };
  calendar: { available: boolean; connected: boolean; notice: string | null };
  whatsapp: WaState;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [wa, setWa] = useState<WaState>(props.whatsapp);
  const linked = isLinked(wa);
  // nothing after the WhatsApp step opens until their number is linked
  const [step, setStep] = useState(Math.min(Math.max(props.initialStep, 1), isLinked(props.whatsapp) ? LAST : WHATSAPP));
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(props.level ?? "");
  const [fields, setFields] = useState<string[]>(props.fields);
  const [fieldDraft, setFieldDraft] = useState("");
  const termLabel = (t: string | null) => (t ? t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");
  const [term, setTerm] = useState(termLabel(props.term) || "Fall 2027");
  const [regions, setRegions] = useState<string[]>(props.regions);
  const [uploaded, setUploaded] = useState<{ name: string; kind: string }[]>([]);
  const [uploading, setUploading] = useState<{ name: string; kind: string | null } | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const kindFor = useRef<string | null>(null);
  const pick = (k: string | null) => {
    kindFor.current = k;
    file.current?.click();
  };
  const has = (k: string) => (k === "cv" ? props.hasCv : k === "transcript" ? props.hasTranscript : k === "degree_certificate" ? props.hasCertificate : false) || uploaded.some((u) => u.kind === k);
  const hasCv = has("cv");
  // the three every application asks for, worded for the degree they're applying for (as lib/doc-checklist words them)
  const docSlots: { kind: string; label: string; why: string; alt: string }[] = [
    { kind: "cv", label: "CV", why: "Most of every form fills from it, and your fit is scored on it.", alt: "No CV yet? Upload what you have: a LinkedIn PDF works." },
    { kind: "transcript", label: level === "undergraduate" ? "School results or transcript" : "Transcript", why: level === "undergraduate" ? "Your grades and subjects. Your agents check them against each school's entry requirements." : "Your grades and courses. Your agents convert your GPA for each country and check entry requirements.", alt: "Not issued yet? Your statement of results works for now." },
    level === "undergraduate"
      ? { kind: "degree_certificate", label: "School-leaving certificate", why: "WAEC, NECO, A-levels or your national exam results.", alt: "Results not out yet? Your predicted grades from your school work for now." }
      : { kind: "degree_certificate", label: "Degree certificate", why: "Proof you finished. Some forms won't accept the application without it.", alt: "Still studying, or waiting for it? A letter from your university with your expected finish date works for now." },
  ];
  const missingDocs = docSlots.filter((d) => !has(d.kind));

  // re-asked after each "sharpen" answer, which re-ranks them
  const refresh = () =>
    fetch("/api/onboarding/matches")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { matches?: Match[] } | null) => j && setMatches(j.matches ?? []))
      .catch(() => {});

  // the matches screen asks the library as soon as it opens (the regions were saved on the way in)
  useEffect(() => {
    if (step !== MATCHES) return;
    let live = true;
    setMatches(null);
    // someone who came from the public matcher skipped the first screen: their time zone is saved here instead
    void fetch("/api/profile/timezone", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ timezone: browserZone() }) }).catch(() => null);
    fetch("/api/onboarding/matches")
      .then((r) => (r.ok ? r.json() : { matches: [] }))
      .then((j: { matches?: Match[] }) => live && setMatches(j.matches ?? []))
      .catch(() => live && setMatches([]));
    return () => {
      live = false;
    };
  }, [step]);

  async function next(body?: Record<string, unknown>) {
    if (body) {
      setBusy(true);
      try {
        await save(body);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setStep((s) => Math.min(s + 1, LAST));
  }

  // setup's done: the agents start (the request outlives the page change) and the dashboard takes over
  async function start() {
    setBusy(true);
    await fetch("/api/onboarding/kickoff", { method: "POST", keepalive: true }).catch(() => null);
    router.push("/dashboard?welcome=1");
  }

  // kind: what the applicant said the file is; null means work it out from the name (the intake agent checks it)
  async function onFiles(list: FileList | null, kind: string | null) {
    if (!list?.length) return;
    for (const f of Array.from(list)) {
      setUploading({ name: f.name, kind });
      const k = kind ?? guessKind(f.name, uploaded.length + props.docCount);
      const err = await uploadDocument(props.userId, f, k);
      if (err) toast.error(err);
      else setUploaded((u) => [...u, { name: f.name, kind: k }]);
    }
    setUploading(null);
    if (file.current) file.current.value = "";
  }

  const addField = () => {
    const v = fieldDraft.trim();
    if (v && !fields.includes(v) && fields.length < 8) setFields([...fields, v]);
    setFieldDraft("");
  };

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <CampusInk className="absolute inset-x-0 top-0 h-[560px] w-full opacity-60" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark href="/dashboard" />
        <div className="flex items-center gap-1">
          <ThemeButton />
          <a
            href="/dashboard"
            onClick={(e) => {
              // leaving setup early still starts the agents on what they have
              void fetch("/api/onboarding/kickoff", { method: "POST", keepalive: true }).catch(() => null);
              // except WhatsApp: the one step that can't be skipped
              if (!linked) {
                e.preventDefault();
                setStep(WHATSAPP);
                toast("Link your WhatsApp to finish. It's the one step you can't skip.");
              }
            }}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-foreground"
          >
            Skip setup
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="relative z-10 mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
        {/* the route: every step with what it's for, done ones ticked */}
        <aside className="hidden lg:block">
          <div className="glass sticky top-6 rounded-2xl border border-white/80 p-5 shadow-card dark:border-white/[0.07]">
            <p className="text-[15px] font-bold tracking-[-0.02em]">Set up your season</p>
            <p className="mt-0.5 text-xs text-muted">About two minutes. You can change all of it later.</p>
            <ol className="relative mt-5 space-y-1">
              {STEPS.map((s, i) => {
                const n = i + 1;
                const Icon = STEP_ICON[i];
                const done = n < step;
                const now = n === step;
                return (
                  <li key={s}>
                    <button
                      onClick={() => done && setStep(n)}
                      disabled={!done}
                      aria-current={now ? "step" : undefined}
                      className={`flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition-colors ${now ? "bg-accent/[0.08]" : done ? "hover:bg-neutral-100 dark:hover:bg-neutral-800" : ""}`}
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl transition-all ${now ? "bg-hero-gradient text-white" : done ? "bg-go/10 text-go" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>
                        {done ? <Check className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className={`block text-[13.5px] font-bold ${now ? "text-accent" : done ? "" : "text-muted"}`}>{s}</span>
                        <span className="block text-[11.5px] leading-snug text-muted">{STEP_HINT[i]}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 lg:hidden">
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="text-accent">Step {step} of {STEPS.length}</span>
              <span className="text-muted">{STEPS[step - 1]}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/70 dark:bg-white/10">
              <div className="bg-bar-gradient h-full rounded-full transition-[width] duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
            </div>
          </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-2xl border border-white/80 p-6 shadow-lift sm:p-10 dark:border-white/[0.07]"
          >
            {step === 1 && (
              <div className="space-y-6 sm:space-y-8">
                <h1 className="text-[30px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">What are you applying for?</h1>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LEVELS.map(([k, label, hint]) => {
                    const LI = LEVEL_ICON[k];
                    return (
                    <button
                      key={k}
                      onClick={() => setLevel(k)}
                      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 sm:block sm:p-5 ${level === k ? "border-transparent bg-accent/8 ring-2 ring-accent" : "border-line bg-surface shadow-card hover:-translate-y-0.5 hover:shadow-lift"}`}
                      aria-pressed={level === k}
                    >
                      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl transition-all sm:mb-5 ${level === k ? "bg-hero-gradient text-white" : "bg-neutral-100 text-muted dark:bg-neutral-800"}`}>
                        <LI className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-lg font-bold tracking-[-0.03em] sm:text-xl ${level === k ? "text-accent" : ""}`}>{label}</span>
                        <span className="block text-sm text-muted sm:mt-1">{hint}</span>
                      </span>
                    </button>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <p className="font-bold">Which fields? <span className="font-normal text-muted">Add one or more, like finance or computer science.</span></p>
                  <div className="flex flex-wrap gap-2">
                    {fields.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 py-1.5 pl-3.5 pr-2 text-sm font-semibold text-accent ring-1 ring-accent/25">
                        {f}
                        <button onClick={() => setFields(fields.filter((x) => x !== f))} aria-label={`Remove ${f}`} className="grid size-6 place-items-center rounded-full hover:bg-accent/15">
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <form
                    className="flex max-w-md gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addField();
                    }}
                  >
                    <Input value={fieldDraft} onChange={(e) => setFieldDraft(e.target.value)} placeholder="Type a field and press add" />
                    <Button type="submit" variant="secondary">Add</Button>
                  </form>
                </div>
                <div className="space-y-3">
                  <p className="font-bold">When do you want to start?</p>
                  <div className="flex flex-wrap gap-2">
                    {TERMS.map((t) => (
                      <button key={t} onClick={() => setTerm(t)} className={chip(term === t)} aria-pressed={term === t}>{t}</button>
                    ))}
                  </div>
                </div>
                <Button
                  size="lg"
                  disabled={!level || busy}
                  onClick={() => next({ study_level: level, target_term: term.toLowerCase().replace(" ", "-"), timezone: browserZone(), ...(fields.length ? { fields } : {}) })}
                >
                  {busy ? "Saving…" : "Continue"}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">Where do you want to study?</h1>
                  <p className="mt-3 text-[15px] text-muted">
                    Agents search each region starting from its top-ranked schools.
                    {props.maxRegions < 9 ? ` Your plan covers ${props.maxRegions} region${props.maxRegions > 1 ? "s" : ""}.` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(props.allRegions).map(([k, label]) => {
                    const on = regions.includes(k);
                    return (
                      <button
                        key={k}
                        aria-pressed={on}
                        onClick={() => setRegions(on ? regions.filter((r) => r !== k) : regions.length >= props.maxRegions ? [...regions.slice(1), k] : [...regions, k])}
                        className={chip(on)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <Button size="lg" disabled={!regions.length || busy} onClick={() => next({ regions })}>{busy ? "Saving…" : "Continue"}</Button>
                  <Button size="lg" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                </div>
              </div>
            )}

            {step === MATCHES && (
              <div className="space-y-7">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">{matches && !matches.length ? "Your agents are ready to search" : "Your first matches"}</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    {matches && !matches.length
                      ? "Nothing we've checked so far fits your field exactly, so your agents search your regions from scratch. The first programmes arrive within the hour, and new matches every morning."
                      : "Programmes our agents have already checked that fit your level, field and regions. Your agents are searching for more now, and new matches arrive every morning."}
                  </p>
                </div>

                {matches === null ? (
                  <p className="flex items-center gap-2 text-[14.5px] text-muted"><LoaderCircle className="size-4 animate-spin" aria-hidden />Finding programmes that fit…</p>
                ) : matches.length ? (
                  <ul className="grid gap-2.5 sm:grid-cols-2">
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
                ) : null}

                <SharpenCard onAnswered={refresh} />

                <section className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5" aria-label="Your documents">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[17px] font-bold tracking-[-0.02em]">{missingDocs.length ? "Add your documents" : "Your documents are in"}</p>
                    <p className="text-[13px] font-semibold tabular-nums text-muted">{docSlots.length - missingDocs.length} of {docSlots.length}</p>
                  </div>
                  <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">
                    Your agents read them, score how well you fit each programme, check entry requirements and fill the education section of every form. PDF, Word or a clear photo of each page. Only you and your agents can see them.
                  </p>
                  <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                    {docSlots.map((d) => {
                      const done = has(d.kind);
                      const files = uploaded.filter((u) => u.kind === d.kind);
                      const busyHere = uploading?.kind === d.kind;
                      return (
                        <li
                          key={d.kind}
                          className="flex flex-wrap items-center gap-x-4 gap-y-2.5 p-4"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            onFiles(e.dataTransfer.files, d.kind);
                          }}
                        >
                          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${done ? "bg-go/12 text-go" : "border border-line text-muted"}`} aria-hidden>
                            {done ? <Check className="size-4" /> : <FileUp className="size-4" />}
                          </span>
                          <div className="min-w-0 flex-1 basis-56">
                            <p className="text-[15px] font-semibold">
                              {d.label}
                              {done ? <span className="sr-only"> (added)</span> : null}
                            </p>
                            <p className="text-[13px] leading-snug text-muted">{d.why}</p>
                            {files.length ? (
                              <ul className="mt-1.5 space-y-0.5">
                                {files.map((u, i) => (
                                  <li key={`${u.name}-${i}`} className="truncate text-[13px] text-go">{u.name}</li>
                                ))}
                              </ul>
                            ) : !done ? (
                              <p className="mt-1 text-[12.5px] text-muted">{d.alt}</p>
                            ) : null}
                          </div>
                          <Button size="sm" variant={done ? "ghost" : "secondary"} disabled={!!uploading} onClick={() => pick(d.kind)}>
                            {busyHere ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
                            {busyHere ? "Uploading…" : done ? "Add a page" : "Upload"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  <button type="button" disabled={!!uploading} onClick={() => pick(null)} className="mt-3 text-[13px] font-medium text-muted underline underline-offset-4 hover:text-foreground disabled:opacity-50">
                    Add something else: test scores, awards, a reference letter
                  </button>
                  {uploaded.some((u) => !docSlots.some((d) => d.kind === u.kind)) ? (
                    <ul className="mt-2 space-y-0.5">
                      {uploaded
                        .filter((u) => !docSlots.some((d) => d.kind === u.kind))
                        .map((u, i) => (
                          <li key={`${u.name}-${i}`} className="flex items-center gap-2 text-[13px]">
                            <Check className="size-3.5 text-go" aria-hidden />
                            <span className="truncate">{u.name}</span>
                          </li>
                        ))}
                    </ul>
                  ) : null}
                  <input ref={file} type="file" multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => onFiles(e.target.files, kindFor.current)} />
                </section>

                <WhatsAppChannel variant="compact" />

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    variant={missingDocs.length ? "secondary" : "primary"}
                    disabled={busy || !!uploading}
                    onClick={() => {
                      // the agents start on the shortlist now, while WhatsApp, gmail and the calendar are connected (safe
                      // to call again)
                      void fetch("/api/onboarding/kickoff", { method: "POST", keepalive: true }).catch(() => null);
                      setStep(WHATSAPP);
                    }}
                  >
                    {missingDocs.length ? "Skip for now" : "Continue"}
                  </Button>
                  <Button size="lg" variant="ghost" onClick={() => setStep(2)}>Back</Button>
                </div>
                {missingDocs.length ? (
                  <p className="-mt-3 max-w-xl text-[13px] text-muted">
                    Without your {missingDocs.map((d) => d.label.toLowerCase().replace(/^cv$/, "CV")).join(missingDocs.length === 2 ? " and " : ", ")}, your agents can&apos;t check entry requirements or fill the education section of a form, so applications stop there until you add {missingDocs.length === 1 ? "it" : "them"}.
                  </p>
                ) : null}
              </div>
            )}

            {step === WHATSAPP && (
              <div className="space-y-7">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">Link your WhatsApp</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    Your agents message you there when an application needs you: a form to sign, a document a school asks for, a deadline close by. Reply to ask Ivyward AI anything, or send a document straight from your phone.
                  </p>
                </div>
                <LinkWhatsApp state={wa} onChange={setWa} />
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Button size="lg" disabled={!linked} onClick={() => setStep(CONNECT)}>
                      Continue
                    </Button>
                    <Button size="lg" variant="ghost" onClick={() => setStep(MATCHES)}>Back</Button>
                  </div>
                  {!linked ? <p className="max-w-xl text-[13px] text-muted">This step is required: it&apos;s how your agents reach you when an application can&apos;t move without you. At most one message a week unless a deadline is close.</p> : null}
                </div>
              </div>
            )}

            {step === CONNECT && (
              <Connect gmail={props.gmail} calendar={props.calendar} busy={busy} onStart={start} onBack={() => setStep(WHATSAPP)} />
            )}
          </motion.section>
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// the last screen: gmail (portal codes, sending as you, replies) and google calendar (deadlines and school events).
// both go through google's own screen and come back here (api/mail/callback, api/calendar/callback)
function Connect({ gmail, calendar, busy, onStart, onBack }: { gmail: { available: boolean; email: string | null; active: boolean; composio: boolean; notice: string | null }; calendar: { available: boolean; connected: boolean; notice: string | null }; busy: boolean; onStart: () => void; onBack: () => void }) {
  const mailDone = gmail.active || !gmail.available;
  const calDone = calendar.connected || !calendar.available;
  const done = mailDone && calDone;
  const mn = gmail.notice ? MAIL_NOTICE[gmail.notice] : null;
  const cn = calendar.notice ? CAL_NOTICE[calendar.notice] : null;
  const note = (n: [string, boolean] | null) => (n ? <p role="status" className={`rounded-xl border px-3.5 py-2.5 text-sm ${n[1] ? "border-go/40 bg-go/8" : "border-stop/40 bg-stop/8"}`}>{n[0]}</p> : null);
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">Connect Gmail and your calendar</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">So your agents can act for you. About a minute on Google&apos;s screens, and you can disconnect either one in Settings.</p>
      </div>

      <section className={`rounded-2xl border p-5 ${gmail.active ? "border-go/30 bg-go/[0.04]" : "border-accent/30 bg-accent/[0.04]"}`} aria-label="Gmail">
        <div className="flex items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${gmail.active ? "bg-go/10 text-go" : "bg-hero-gradient text-white"}`}>{gmail.active ? <CircleCheck className="size-5" aria-hidden /> : <Mail className="size-5" aria-hidden />}</span>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-[17px] font-bold tracking-[-0.02em]">{gmail.active ? `Gmail connected${gmail.email ? `: ${gmail.email}` : ""}` : "Gmail"}</p>
              <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">
                School portals email a code or a link when the agents create your accounts. With Gmail connected the agents read those and carry on, send the emails you approve from your own address, and show you replies from your schools. They never delete or change anything in your inbox.
              </p>
            </div>
            {note(mn)}
            {!gmail.available ? (
              <p className="text-[13px] text-muted">Connecting Gmail isn&apos;t switched on yet. Until it is, drafts open in your own email app.</p>
            ) : !gmail.active ? (
              <>
                {gmail.email ? <p className="text-[13px] text-stop">{gmail.email} needs reconnecting.</p> : null}
                {gmail.composio ? (
                  <p className="text-[13px] leading-relaxed text-muted">
                    Google will ask you to allow <span className="font-medium text-foreground">Composio</span>, the service Ivyward uses to connect to Gmail securely. Leave every permission ticked.
                  </p>
                ) : null}
                {/* a plain link, not next's <Link>: a prefetch would start a connection (api/mail/connect) */}
                <a href="/api/mail/connect?next=/onboarding" className={buttonClass("primary", "lg")}>
                  <Mail className="size-4" aria-hidden /> Connect Gmail
                </a>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className={`rounded-2xl border p-5 ${calendar.connected ? "border-go/30 bg-go/[0.04]" : "border-line bg-surface"}`} aria-label="Google Calendar">
        <div className="flex items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${calendar.connected ? "bg-go/10 text-go" : "bg-neutral-100 text-muted dark:bg-neutral-800"}`}>{calendar.connected ? <CircleCheck className="size-5" aria-hidden /> : <CalendarDays className="size-5" aria-hidden />}</span>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-[17px] font-bold tracking-[-0.02em]">{calendar.connected ? "Google Calendar connected" : "Google Calendar"}</p>
              <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">
                Every application deadline on your list, and the webinars, open days and interviews your schools email you about, go on your calendar with reminders a week, two days and a day before. Ivyward only changes events it added.
              </p>
            </div>
            {note(cn)}
            {!calendar.available ? (
              <p className="text-[13px] text-muted">Connecting a calendar isn&apos;t switched on yet, so school events come as email invites.</p>
            ) : !calendar.connected ? (
              <a href={`/api/calendar/connect?then=${encodeURIComponent(`/onboarding?step=${CONNECT}`)}`} className={buttonClass("secondary", "lg")}>
                <CalendarDays className="size-4" aria-hidden /> Connect Google Calendar
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Button size="lg" variant={done ? "primary" : "ghost"} disabled={busy} onClick={onStart}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {busy ? "Starting your agents…" : done ? "Start my agents" : "Skip for now"}
          </Button>
          <Button size="lg" variant="ghost" onClick={onBack}>Back</Button>
        </div>
        {!mailDone ? <p className="max-w-xl text-[13px] text-muted">Without Gmail, an application stops each time a portal emails a code, until you paste that email into Messages.</p> : null}
      </div>
    </div>
  );
}
