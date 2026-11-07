"use client";
import { useRef, useState } from "react";
import { CampusInk } from "@/components/landing/campus-ink";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, FileUp, Mail, Mic, X, LoaderCircle, GraduationCap, Globe2, BookOpen, FlaskConical, Ticket, IdCard, Rows3, Rocket } from "lucide-react";
import { ThemeButton } from "@/components/theme";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { chipClass } from "@/components/ui/chip";
import { uploadDocument } from "@/lib/upload-client";
import { DOC_KINDS, DOC_KIND_WHY } from "@/lib/doc-kinds";
import { BuyPack } from "@/components/billing/pay";
import { QuestionDeck } from "@/components/profile/question-deck";
import { CHAPTERS, chapterStates, type Level } from "@/lib/profile-chapters";
import type { PortalDetails } from "@/lib/portal-fields";

const LEVELS: [string, string, string][] = [
  ["undergraduate", "Bachelor's", "A first degree"],
  ["masters", "Master's", "MSc, MA, MBA, MiM and similar"],
  ["phd", "PhD", "Doctoral and research degrees"],
];
const LEVEL_ICON: Record<string, typeof BookOpen> = { undergraduate: BookOpen, masters: GraduationCap, phd: FlaskConical };
const TERMS = ["Fall 2027", "Spring 2028", "Fall 2028"];
const BASE_STEPS = ["What you're applying for", "Where to study", "Your documents", "Your email", "Meet Ivyward AI"];
const BASE_ICON = [GraduationCap, Globe2, FileUp, Mail, Mic];
const BASE_HINT = ["Level, fields and start date", "Regions the agents search", "CV, transcripts and anything else", "Lets agents send and read for you", "Your admissions assistant"];

export type PackOffer = { label: string; each: string; size: number; credits: number; bonus: number; justPaid: boolean; ready: boolean };

async function save(body: Record<string, unknown>) {
  const res = await fetch("/api/profile/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save");
}

const chip = (on: boolean) => chipClass(on, "md");

function guessKind(name: string, already: number): string {
  if (/\b(cv|resume|résumé)\b/i.test(name)) return "cv";
  if (/transcript|record|marksheet|result/i.test(name)) return "transcript";
  if (/ielts|toefl|gre|gmat|sat|duolingo|pte|score/i.test(name)) return "test_score";
  if (/passport|national.?id|\bid\b/i.test(name)) return "passport";
  if (/reference|recommendation|lor\b/i.test(name)) return "reference_letter";
  if (/degree|diploma|certificate|cert/i.test(name)) return /award|prize|winner/i.test(name) ? "award" : "degree_certificate";
  if (/award|prize|honou?r|scholarship/i.test(name)) return "award";
  if (/bank|sponsor|affidavit|proof.?of.?fund/i.test(name)) return "financial";
  if (/sop|statement|essay|personal/i.test(name)) return "old_essay";
  if (/portfolio|sample|publication|paper/i.test(name)) return "portfolio";
  return already ? "other" : "cv";
}

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
  mailEmail: string | null;
  mailAvailable: boolean;
  mailVia?: "composio" | "google";
  mailNotice: string | null;
  pack: PackOffer | null;
  details: PortalDetails;
}) {
  // goals, where, documents, email, the basics, then (in pack countries) the submission pack, and last the
  // application profile: the rest of what forms ask, by conversation or cards, now or later
  const BASICS = 5;
  const PACK = props.pack ? 6 : -1;
  const STEPS = [...BASE_STEPS.slice(0, 4), "The basics", ...(props.pack ? ["Your submissions"] : []), "Your application profile"];
  const STEP_ICON = [...BASE_ICON.slice(0, 4), IdCard, ...(props.pack ? [Ticket] : []), Rows3];
  const STEP_HINT = [...BASE_HINT.slice(0, 4), "Your name as schools need it", ...(props.pack ? ["Pay now or when you're ready"] : []), "Ivyward AI or quick cards"];
  const LAST = STEPS.length;
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(Math.min(Math.max(props.initialStep, 1), props.pack ? 7 : 6));
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(props.level ?? "");
  const [fields, setFields] = useState<string[]>(props.fields);
  const [fieldDraft, setFieldDraft] = useState("");
  const termLabel = (t: string | null) => (t ? t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");
  const [term, setTerm] = useState(termLabel(props.term) || "Fall 2027");
  const [regions, setRegions] = useState<string[]>(props.regions);
  const [uploaded, setUploaded] = useState<{ name: string; kind: string }[]>([]);
  const [uploading, setUploading] = useState<{ name: string; kind: string | null } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const kindFor = useRef<string | null>(null);
  const pick = (k: string) => {
    kindFor.current = k === "other" ? null : k;
    file.current?.click();
  };

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
          <a href="/dashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-foreground">Skip setup</a>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
        {/* the route: every step with what it's for, done ones ticked */}
        <aside className="hidden lg:block">
          <div className="glass sticky top-6 rounded-2xl border border-white/80 p-5 shadow-card dark:border-white/[0.07]">
            <p className="text-[15px] font-bold tracking-[-0.02em]">Set up your season</p>
            <p className="mt-0.5 text-xs text-muted">About four minutes. You can change all of it later.</p>
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
              <div className="space-y-8">
                <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">What are you applying for?</h1>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LEVELS.map(([k, label, hint]) => {
                    const LI = LEVEL_ICON[k];
                    return (
                    <button
                      key={k}
                      onClick={() => setLevel(k)}
                      className={`rounded-2xl border p-5 text-left transition-all duration-200 ${level === k ? "border-transparent bg-accent/8 ring-2 ring-accent" : "border-line bg-surface shadow-card hover:-translate-y-0.5 hover:shadow-lift"}`}
                      aria-pressed={level === k}
                    >
                      <span className={`mb-5 grid size-11 place-items-center rounded-2xl transition-all ${level === k ? "bg-hero-gradient text-white" : "bg-neutral-100 text-muted dark:bg-neutral-800"}`}>
                        <LI className="size-5" aria-hidden />
                      </span>
                      <span className={`block text-xl font-bold tracking-[-0.03em] ${level === k ? "text-accent" : ""}`}>{label}</span>
                      <span className="mt-1 block text-sm text-muted">{hint}</span>
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
                        <button onClick={() => setFields(fields.filter((x) => x !== f))} aria-label={`Remove ${f}`} className="rounded-full p-0.5 hover:bg-accent/15">
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
                  onClick={() => next({ study_level: level, target_term: term.toLowerCase().replace(" ", "-"), ...(fields.length ? { fields } : {}) })}
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

            {step === 3 && (
              <div className="space-y-7">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">Add your documents</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    Start with your CV. Add anything else you have: agents read every file to fill your profile and your forms, and upload them to portals. PDF, Word or photos, up to 10 MB each. Only you and your agents can see them.
                  </p>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {DOC_KINDS.filter(([k]) => k !== "other").map(([k, label]) => {
                    const mine = uploaded.filter((u) => u.kind === k);
                    const busyHere = uploading?.kind === k;
                    return (
                      <li key={k} className="flex items-center gap-3 px-4 py-3">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${mine.length || (k === "cv" && props.docCount) ? "bg-go/10 text-go" : "bg-neutral-100 text-muted dark:bg-neutral-800"}`}>
                          {mine.length ? <Check className="size-4" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium">
                            {label}
                            {k === "cv" && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">Start here</span>}
                          </span>
                          <span className="block truncate text-[12.5px] text-muted">{mine.length ? mine.map((m) => m.name).join(", ") : DOC_KIND_WHY[k]}</span>
                        </span>
                        <Button size="sm" variant={mine.length ? "ghost" : "secondary"} disabled={!!uploading} onClick={() => pick(k)}>
                          {busyHere ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
                          {mine.length ? "Add another" : "Add"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => pick("other")}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onFiles(e.dataTransfer.files, null);
                  }}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-7 text-center transition-colors hover:border-neutral-400"
                >
                  {uploading && !uploading.kind ? <LoaderCircle className="size-6 animate-spin text-muted" aria-hidden /> : <FileUp className="size-6 text-muted" aria-hidden />}
                  <span className="font-medium">{uploading ? `Uploading ${uploading.name}…` : "Drop several files here"}</span>
                  <span className="text-[13px] text-muted">Agents work out what each one is</span>
                </button>
                <input ref={file} type="file" multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => onFiles(e.target.files, kindFor.current)} />
                {props.docCount ? <p className="flex items-center gap-2 text-sm text-muted"><Check className="size-4 text-go" aria-hidden />{props.docCount} document{props.docCount > 1 ? "s" : ""} added earlier</p> : null}
                <div className="flex gap-3">
                  <Button size="lg" onClick={() => next()} disabled={!!uploading}>{uploaded.length || props.docCount ? "Continue" : "Skip for now"}</Button>
                  <Button size="lg" variant="ghost" onClick={() => setStep(2)}>Back</Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">Connect your Gmail</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    Agents use it to send fee-waiver and funding emails from your address, read the codes portals send when they create your
                    accounts, and tell you when a school replies. They never delete or change anything in your inbox.
                  </p>
                </div>
                {props.mailEmail ? (
                  <p className="flex items-center gap-2 text-[15px]"><Check className="size-5 text-go" aria-hidden />Connected as <span className="font-medium">{props.mailEmail}</span></p>
                ) : props.mailAvailable ? (
                  <div className="space-y-3">
                    {props.mailVia === "composio" && (
                      <p className="max-w-xl text-sm leading-relaxed text-muted">
                        Google will ask you to allow <span className="font-medium text-foreground">Composio</span>, the service Ivyward uses to connect to Gmail securely, so Google shows its name instead of ours. You can disconnect it in Settings at any time.
                      </p>
                    )}
                    <ButtonLink href="/api/mail/connect?next=/onboarding" size="lg" variant="accent"><Mail className="size-4" aria-hidden />Connect Gmail</ButtonLink>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Email connection isn&apos;t available yet. You can add it later in settings.</p>
                )}
                {props.mailNotice && props.mailNotice !== "connected" ? <p className="text-sm text-stop">Gmail wasn&apos;t connected. Try again, and allow each permission on Google&apos;s screen.</p> : null}
                <div className="flex gap-3">
                  <Button size="lg" variant={props.mailEmail ? "primary" : "secondary"} onClick={() => next()}>{props.mailEmail ? "Continue" : "Do this later"}</Button>
                  <Button size="lg" variant="ghost" onClick={() => setStep(3)}>Back</Button>
                </div>
              </div>
            )}

            {step === BASICS && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">The basics, the way schools need them</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">Your name exactly as on your passport, your birthday and a phone number. Ten taps or so; skip anything you&apos;d rather add later.</p>
                </div>
                <QuestionDeck initial={props.details} level={(level || null) as Level | null} chapterId="basics" only chatHref={false} onFinished={() => setStep((s) => s + 1)} />
                <div className="flex gap-3">
                  <Button size="lg" variant="ghost" onClick={() => setStep(4)}>Back</Button>
                  <Button size="lg" variant="ghost" onClick={() => setStep((s) => s + 1)}>Do this later</Button>
                </div>
              </div>
            )}

            {props.pack && step === PACK && (
              <div className="space-y-8">
                {props.pack.justPaid || props.pack.credits > 0 ? (
                  <div>
                    <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">You have {props.pack.credits + props.pack.bonus} submissions ready</h1>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">Each one is used only when an application, scholarship form or funding request actually goes in, after you&apos;ve signed it. They don&apos;t expire.</p>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">{props.pack.size} submissions for {props.pack.label.replace(/ for \d+ submissions$/, "")}</h1>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                      Preparing is free: your shortlist, essays and every page of each portal. A pack covers your next {props.pack.size} submissions ({props.pack.each} each). No subscription, nothing renews. Pay now so your first application goes in the moment it&apos;s ready, or skip and pay then.
                    </p>
                  </div>
                )}
                <ul className="grid gap-2 text-[14.5px] sm:grid-cols-2">
                  {[`A submission is used only when something goes in`, "Applications, scholarship forms and funding requests", "Credits don't expire", "Card, bank transfer or mobile money"].map((t) => (
                    <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />{t}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  {props.pack.justPaid || props.pack.credits > 0 ? (
                    <Button size="lg" onClick={() => next()}>Continue</Button>
                  ) : (
                    <>
                      {props.pack.ready && <BuyPack label={props.pack.label} back="onboarding" size="lg">Pay {props.pack.label.replace(/ for \d+ submissions$/, "")}</BuyPack>}
                      <Button
                        size="lg"
                        variant="secondary"
                        onClick={() => {
                          // a reminder they can come back to; the pay card also appears on any application that's ready
                          void fetch("/api/billing/later", { method: "POST" }).catch(() => null);
                          next();
                        }}
                      >
                        Skip for now
                      </Button>
                    </>
                  )}
                  <Button size="lg" variant="ghost" onClick={() => setStep(BASICS)}>Back</Button>
                </div>
                {!props.pack.justPaid && props.pack.credits === 0 && <p className="text-[13px] text-muted">You can buy a pack any time from Settings, or from an application when it&apos;s ready to submit.</p>}
              </div>
            )}

            {step === LAST && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">Last step: your application profile</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    Every application form asks the same things: your family, your school record, visas, funding, your story. Answer them once, in short chapters, and the agents fill every form without stopping to ask. Do it now or any time from your profile.
                  </p>
                </div>
                <ol className="grid gap-2 sm:grid-cols-2">
                  {chapterStates(props.details, (level || null) as Level | null)
                    .filter((c) => c.chapter.id !== "basics")
                    .map((c, i) => (
                      <li key={c.chapter.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent/10 text-[12px] font-bold text-accent tabular">{i + 1}</span>
                        <span>
                          <span className="block text-[14.5px] font-semibold">{c.chapter.title}</span>
                          <span className="block text-[12.5px] text-muted">{c.chapter.style === "story" ? "A conversation" : `${c.total} quick questions`}</span>
                        </span>
                      </li>
                    ))}
                </ol>
                <div className="grid gap-3 sm:grid-cols-3">
                  <a href={`/dashboard?chat=open&setup=1&say=${encodeURIComponent(`Let's do my profile chapter: ${CHAPTERS[1].title}`)}`} className="group rounded-2xl border border-accent/40 bg-accent/5 p-4 transition-colors hover:bg-accent/10">
                    <Mic className="size-5 text-accent" aria-hidden />
                    <p className="mt-2 font-bold">Talk it through</p>
                    <p className="mt-0.5 text-[13px] text-muted">Ivyward AI asks, by voice or text. Best for your story.</p>
                  </a>
                  <a href={`/profile/chapters/${CHAPTERS[1].id}`} className="group rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent/40">
                    <Rows3 className="size-5 text-accent" aria-hidden />
                    <p className="mt-2 font-bold">Quick cards</p>
                    <p className="mt-0.5 text-[13px] text-muted">One question at a time. Tap, next.</p>
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      // skipping still starts the agents; what's missing turns into notifications
                      setBusy(true);
                      await fetch("/api/onboarding/kickoff", { method: "POST" }).catch(() => null);
                      router.push("/dashboard");
                    }}
                    className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent/40"
                  >
                    {busy ? <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden /> : <Rocket className="size-5 text-accent" aria-hidden />}
                    <p className="mt-2 font-bold">{busy ? "Starting your agents…" : "Later: start my agents"}</p>
                    <p className="mt-0.5 text-[13px] text-muted">They ask for anything they need as they go.</p>
                  </button>
                </div>
                <Button size="lg" variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
