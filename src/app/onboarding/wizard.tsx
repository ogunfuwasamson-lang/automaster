"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, FileUp, Mail, Mic, X, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { uploadDocument } from "@/lib/upload-client";

const LEVELS: [string, string, string][] = [
  ["undergraduate", "Bachelor's", "A first degree"],
  ["masters", "Master's", "MSc, MA, MBA, MiM and similar"],
  ["phd", "PhD", "Doctoral and research degrees"],
];
const TERMS = ["Fall 2027", "Spring 2028", "Fall 2028"];
const STEPS = ["What you're applying for", "Where", "Your documents", "Your email", "Your interview"];

async function save(body: Record<string, unknown>) {
  const res = await fetch("/api/profile/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save");
}

const chip = (on: boolean) =>
  `rounded-full border px-4 py-2 text-sm transition-colors ${on ? "border-foreground bg-foreground text-background" : "border-line bg-surface hover:border-neutral-400"}`;

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
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Wordmark href="/dashboard" />
        <a href="/dashboard" className="text-sm text-muted hover:text-foreground">Skip setup</a>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20">
        <ol className="mb-10 grid grid-cols-5 gap-1.5" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s} className="space-y-2">
              <div className={`h-1 rounded-full transition-colors ${i + 1 <= step ? "bg-foreground" : "bg-line"}`} />
              <button
                onClick={() => i + 1 < step && setStep(i + 1)}
                disabled={i + 1 >= step}
                className={`hidden text-left text-xs sm:block ${i + 1 === step ? "font-medium text-foreground" : "text-muted"}`}
                aria-current={i + 1 === step ? "step" : undefined}
              >
                {s}
              </button>
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 1 && (
              <div className="space-y-8">
                <h1 className="font-display text-5xl font-bold leading-none tracking-tight">What are you applying for?</h1>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LEVELS.map(([k, label, hint]) => (
                    <button
                      key={k}
                      onClick={() => setLevel(k)}
                      className={`rounded-xl border p-4 text-left transition-colors ${level === k ? "border-foreground bg-foreground text-background" : "border-line bg-surface hover:border-neutral-400"}`}
                      aria-pressed={level === k}
                    >
                      <span className="block font-display text-2xl font-semibold">{label}</span>
                      <span className={`mt-1 block text-sm ${level === k ? "text-background/75" : "text-muted"}`}>{hint}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="font-medium">Which fields? <span className="font-normal text-muted">Add one or more, like finance or computer science.</span></p>
                  <div className="flex flex-wrap gap-2">
                    {fields.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-foreground py-1.5 pl-3.5 pr-2 text-sm text-background">
                        {f}
                        <button onClick={() => setFields(fields.filter((x) => x !== f))} aria-label={`Remove ${f}`} className="rounded-full p-0.5 hover:bg-white/15">
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
                  <p className="font-medium">When do you want to start?</p>
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
                  <h1 className="font-display text-5xl font-bold leading-none tracking-tight">Where do you want to study?</h1>
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
                  <h1 className="font-display text-5xl font-bold leading-none tracking-tight">Add your CV and transcripts</h1>
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
                  className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line bg-surface px-6 py-12 text-center transition-colors hover:border-neutral-400"
                >
                  {uploading ? <LoaderCircle className="size-7 animate-spin text-muted" aria-hidden /> : <FileUp className="size-7 text-muted" aria-hidden />}
                  <span className="font-medium">{uploading ? `Uploading ${uploading}…` : "Drop files here or choose files"}</span>
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
                  <h1 className="font-display text-5xl font-bold leading-none tracking-tight">Connect your Gmail</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    Agents use it to send fee-waiver and funding emails from your address, read the codes portals send when they create your
                    accounts, and tell you when a school replies. They never delete or change anything in your inbox.
                  </p>
                </div>
                {props.mailEmail ? (
                  <p className="flex items-center gap-2 text-[15px]"><Check className="size-5 text-go" aria-hidden />Connected as <span className="font-medium">{props.mailEmail}</span></p>
                ) : props.mailAvailable ? (
                  <ButtonLink href="/api/mail/connect?next=/onboarding" size="lg" variant="signal"><Mail className="size-4" aria-hidden />Connect Gmail</ButtonLink>
                ) : (
                  <p className="text-sm text-muted">Email connection isn&apos;t available yet. You can add it later in settings.</p>
                )}
                {props.mailNotice && props.mailNotice !== "connected" ? <p className="text-sm text-stop">Gmail wasn&apos;t connected. Try again, and tick both permissions on Google&apos;s screen.</p> : null}
                <div className="flex gap-3">
                  <Button size="lg" variant={props.mailEmail ? "primary" : "secondary"} onClick={() => next()}>{props.mailEmail ? "Continue" : "Do this later"}</Button>
                  <Button size="lg" variant="ghost" onClick={() => setStep(3)}>Back</Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <div>
                  <h1 className="font-display text-5xl font-bold leading-none tracking-tight">Last step: a short interview</h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                    Ten minutes, by voice or typing. The interviewer asks about your goals, your best work and anything your documents
                    didn&apos;t cover. Your essays are written from these answers.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/interview" size="lg"><Mic className="size-4" aria-hidden />Start the interview</ButtonLink>
                  <Button size="lg" variant="secondary" onClick={() => router.push("/dashboard")}>Go to my dashboard</Button>
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
