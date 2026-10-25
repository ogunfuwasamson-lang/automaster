"use client";
import { useRef, useState } from "react";
import { CampusInk } from "@/components/landing/campus-ink";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, FileUp, Mail, Mic, X, LoaderCircle, GraduationCap, Globe2, BookOpen, FlaskConical } from "lucide-react";
import { ThemeButton } from "@/components/theme";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { chipClass } from "@/components/ui/chip";
import { uploadDocument } from "@/lib/upload-client";

const LEVELS: [string, string, string][] = [
  ["undergraduate", "Bachelor's", "A first degree"],
  ["masters", "Master's", "MSc, MA, MBA, MiM and similar"],
  ["phd", "PhD", "Doctoral and research degrees"],
];
const LEVEL_ICON: Record<string, typeof BookOpen> = { undergraduate: BookOpen, masters: GraduationCap, phd: FlaskConical };
const TERMS = ["Fall 2027", "Spring 2028", "Fall 2028"];
const STEPS = ["What you're applying for", "Where to study", "Your documents", "Your email", "Your interview"];
const STEP_ICON = [GraduationCap, Globe2, FileUp, Mail, Mic];
const STEP_HINT = ["Level, fields and start date", "Regions the agents search", "CV and transcripts fill your profile", "Lets agents send and read for you", "Ten minutes, by voice or text"];

async function save(body: Record<string, unknown>) {
  const res = await fetch("/api/profile/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save");
}

const chip = (on: boolean) => chipClass(on, "md");

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
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(Math.min(Math.max(props.initialStep, 1), 5));
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(props.level ?? "");
  const [fields, setFields] = useState<string[]>(props.fields);
  const [fieldDraft, setFieldDraft] = useState("");
  const termLabel = (t: string | null) => (t ? t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");
  const [term, setTerm] = useState(termLabel(props.term) || "Fall 2027");
  const [regions, setRegions] = useState<string[]>(props.regions);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

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
    setStep((s) => Math.min(s + 1, 5));
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    for (const f of Array.from(list)) {
      setUploading(f.name);
      const kind = /transcript|record|marksheet/i.test(f.name) ? "transcript" : /cert/i.test(f.name) ? "degree_certificate" : uploaded.length || props.docCount ? "other" : "cv";
      const err = await uploadDocument(props.userId, f, kind);
      if (err) toast.error(err);
      else setUploaded((u) => [...u, f.name]);
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
              <div className="space-y-8">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">Add your CV and transcripts</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    Agents read them to build your profile, so the interview only asks what&apos;s missing. PDF, Word or photos, up to 10 MB each. Only you and your agents can see them.
                  </p>
                </div>
                <button
                  onClick={() => file.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onFiles(e.dataTransfer.files);
                  }}
                  className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-accent/30 bg-accent/[0.03] px-6 py-12 text-center transition-colors hover:border-accent/60 hover:bg-accent/[0.06]"
                >
                  {uploading ? <LoaderCircle className="size-7 animate-spin text-muted" aria-hidden /> : <span className="bg-hero-gradient grid size-14 place-items-center rounded-2xl text-white"><FileUp className="size-6" aria-hidden /></span>}
                  <span className="font-bold">{uploading ? `Uploading ${uploading}…` : "Drop files here or choose files"}</span>
                  <span className="text-sm text-muted">Start with your CV</span>
                </button>
                <input ref={file} type="file" multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => onFiles(e.target.files)} />
                {uploaded.length || props.docCount ? (
                  <ul className="space-y-2 text-sm">
                    {props.docCount ? <li className="flex items-center gap-2 text-muted"><Check className="size-4 text-go" aria-hidden />{props.docCount} document{props.docCount > 1 ? "s" : ""} already added</li> : null}
                    {uploaded.map((u) => (
                      <li key={u} className="flex items-center gap-2"><Check className="size-4 text-go" aria-hidden />{u}</li>
                    ))}
                  </ul>
                ) : null}
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

            {step === 5 && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[42px]">Last step: a short interview</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    Ten minutes, by voice or typing. The interviewer asks about your goals, your best work and anything your documents
                    didn&apos;t cover. Your essays are written from these answers.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/dashboard?chat=open" size="lg" variant="accent"><Mic className="size-4" aria-hidden />Start the interview</ButtonLink>
                  <Button size="lg" variant="secondary" onClick={() => router.push("/dashboard")}>Go to my dashboard</Button>
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
