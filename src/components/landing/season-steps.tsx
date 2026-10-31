"use client";
import { useState } from "react";
import { Check, CircleDot, FileText, Mic, Upload } from "lucide-react";
import { Mark } from "@/components/wordmark";

// "a whole application season, run for you": the five stages on the left, and a small mock-up of each on the
// right that changes with the stage you pick. every school in the mock-ups is invented.

const STEPS = [
  { t: "Tell us about you", d: "Upload your CV and transcripts, then talk to Ivyward AI for ten minutes. It fills your profile and asks only what's missing." },
  { t: "Get your shortlist", d: "Agents search the regions you pick, from the top-ranked schools down, and keep the programs you can realistically get into." },
  { t: "Approve your essays", d: "Drafts are written from facts in your profile and checked for any claim you couldn't back up. You edit, then sign." },
  { t: "Agents submit", d: "They find each portal, create your account, fill every page and upload your documents. You step in only for bot checks and fees." },
  { t: "Work every admit for money", d: "After an offer, agents look for merit reconsideration, assistantships and scholarships, and draft the emails." },
];

function Panel({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_10px_40px_-18px_rgb(9_9_11/0.3)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[12px] text-muted">
        <Mark className="size-4" />
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="truncate">{path}</span>
      </div>
      <div className="p-5 text-[13.5px]">{children}</div>
    </div>
  );
}

const ok = <Check className="mt-0.5 size-4 shrink-0 text-go" aria-hidden />;
const wait = <CircleDot className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />;

function Art({ i }: { i: number }) {
  if (i === 0)
    return (
      <Panel path="Profile · getting started">
        <div className="flex flex-wrap gap-2">
          {["CV.pdf", "Transcript.pdf", "Degree certificate.pdf"].map((f) => (
            <span key={f} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-background px-2.5 py-1.5 text-[12.5px]">
              <Upload className="size-3.5 text-muted" aria-hidden /> {f} <Check className="size-3.5 text-go" aria-hidden />
            </span>
          ))}
        </div>
        <div className="mt-5 space-y-2.5">
          <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-background px-3.5 py-2.5">Your transcript shows a 4.21. Is that out of 5?</p>
          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-on-ink">Yes, out of 5.</p>
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <Mic className="size-3.5" aria-hidden /> Saved to your profile. 3 questions left.
          </p>
        </div>
      </Panel>
    );
  if (i === 1)
    return (
      <Panel path="Shortlist · fall 2027">
        <ul className="divide-y divide-line">
          {[
            ["Northfield University", "MSc Management Analytics", "Strong"],
            ["Kingsbridge University", "MSc Finance", "Strong"],
            ["Halden Technical University", "MSc Management and Technology", "Good"],
            ["Lakemoor Business School", "MSc Business Analytics", "Reach"],
          ].map(([s, p, f]) => (
            <li key={s} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{s}</span>
                <span className="block truncate text-muted">{p}</span>
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] ${f === "Reach" ? "bg-signal/10 text-signal" : "bg-go/10 text-go"}`}>{f}</span>
            </li>
          ))}
        </ul>
      </Panel>
    );
  if (i === 2)
    return (
      <Panel path="Kingsbridge · Statement of purpose · draft 2">
        <p className="font-serif text-[15.5px] leading-relaxed">
          At a payments startup I closed partnerships with <mark className="rounded bg-go/10 px-0.5 text-inherit">four commercial banks</mark> in eighteen months…
        </p>
        <div className="mt-4 space-y-1.5 border-t border-line pt-4">
          {["Four banks: matches your CV", "Eighteen months: matches your dates", "No claim you couldn't back up"].map((t) => (
            <p key={t} className="flex gap-2">
              {ok} {t}
            </p>
          ))}
        </div>
      </Panel>
    );
  if (i === 3)
    return (
      <Panel path="Northfield · application portal">
        <ol className="space-y-3">
          {[
            ["Found the portal", "apply.northfield.edu", true],
            ["Created your account", "password saved in Portal logins", true],
            ["Filled 6 sections", "84 answers from your profile", true],
            ["Uploaded documents", "CV, transcript, statement of purpose", true],
            ["Application fee", "waiting for you: pay it on the portal", false],
          ].map(([t, d, done]) => (
            <li key={t as string} className="flex gap-3">
              {done ? ok : wait}
              <span>
                <span className="block font-medium">{t}</span>
                <span className="text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    );
  return (
    <Panel path="Offers · funding">
      <ul className="divide-y divide-line">
        {[
          ["Northfield University", "Asked for merit reconsideration: draft ready", "Admitted"],
          ["Ashby School of Management", "Entrance award applied for", "Admitted"],
          ["Kingsbridge University", "Scholarship form submitted", "Under review"],
        ].map(([s, d, st]) => (
          <li key={s} className="flex items-center gap-3 py-3">
            <FileText className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{s}</span>
              <span className="block truncate text-muted">{d}</span>
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] ${st === "Admitted" ? "bg-go/10 text-go" : "bg-neutral-100 text-muted dark:bg-neutral-800"}`}>{st}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function SeasonSteps() {
  const [on, setOn] = useState(0);
  return (
    <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const active = i === on;
          return (
            <li key={s.t}>
              <button
                type="button"
                onClick={() => setOn(i)}
                onMouseEnter={() => setOn(i)}
                aria-expanded={active}
                className={`w-full rounded-xl border px-5 py-4 text-left transition-colors ${active ? "border-line bg-surface shadow-[0_1px_2px_rgb(9_9_11/0.05)]" : "border-transparent hover:bg-surface/60"}`}
              >
                <span className="flex items-baseline gap-4">
                  <span className={`font-serif text-[17px] tabular ${active ? "text-brand" : "text-muted"}`}>{i + 1}</span>
                  <span className="min-w-0">
                    <span className={`block font-serif text-[21px] leading-snug ${active ? "" : "text-muted"}`}>{s.t}</span>
                    {/* the description stays in the page for search and screen readers; it only shows for the open step */}
                    <span className={`block text-[14.5px] leading-relaxed text-muted ${active ? "mt-1.5" : "sr-only"}`}>{s.d}</span>
                  </span>
                </span>
              </button>
              {/* phones: the mock-up sits right under the open step */}
              {active && (
                <div className="mt-3 lg:hidden">
                  <Art i={i} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="relative hidden lg:sticky lg:top-24 lg:block">
        <div
          className="absolute -inset-6 -z-10 rounded-[28px]"
          style={{ background: "radial-gradient(70% 60% at 20% 10%, color-mix(in oklab, var(--brand) 12%, transparent), transparent 70%), radial-gradient(60% 60% at 90% 90%, color-mix(in oklab, var(--wash) 10%, transparent), transparent 70%)" }}
          aria-hidden
        />
        <Art i={on} />
      </div>
    </div>
  );
}
