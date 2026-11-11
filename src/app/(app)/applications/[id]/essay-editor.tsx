"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleAlert, CircleCheck, Lightbulb, LoaderCircle, Wand2 } from "lucide-react";
import { Clamp } from "@/components/ui/clamp";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface EssayData {
  id: string;
  title: string;
  kind: string;
  prompt: string | null;
  wordLimit: number | null;
  version: number;
  content: string;
  author: string;
  critique: {
    status?: string;
    round?: number;
    score?: number | null;
    unsupported_claims?: string[];
    issues?: { severity: string; issue: string; fix: string }[];
    summary?: string;
    hit_round_cap?: boolean;
    edited_by_user?: boolean;
  } | null;
  approved: boolean;
  versions: number;
  working: boolean;
}

const words = (t: string) => (t.trim().match(/\S+/g) ?? []).length;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function EssayEditor({ e }: { e: EssayData }) {
  const [text, setText] = useState(e.content);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const dirty = text !== e.content;
  const count = words(text);
  const over = e.wordLimit ? count > e.wordLimit : false;
  const c = e.critique ?? {};
  const state = e.working ? "working" : e.approved ? "approved" : c.edited_by_user ? "edited" : c.status === "ready" ? "ready" : e.version ? "review" : "waiting";
  const STATE = {
    working: ["Agents are writing", "text-muted"],
    approved: ["Approved by you", "text-go"],
    edited: ["Your edit", "text-foreground"],
    ready: ["Ready for you", "text-foreground"],
    review: ["In review", "text-muted"],
    waiting: ["Waiting", "text-muted"],
  } as const;
  const claims = !c.edited_by_user ? c.unsupported_claims ?? [] : [];
  const issues = !c.edited_by_user ? c.issues ?? [] : [];

  async function act(body: Record<string, unknown>, label: string, ok: string) {
    setBusy(label);
    const res = await fetch(`/api/artifacts/${e.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't save that");
    else toast.success(ok);
    setBusy(null);
    router.refresh();
  }

  const [panel, setPanel] = useState<"claims" | "tips" | null>(null);
  const tone = { working: "bg-neutral-100 text-muted dark:bg-neutral-800", approved: "bg-go/10 text-go", edited: "bg-accent/10 text-accent", ready: "bg-signal/10 text-signal", review: "bg-neutral-100 text-muted dark:bg-neutral-800", waiting: "bg-neutral-100 text-muted dark:bg-neutral-800" }[state];

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <header className="space-y-3 px-5 pb-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold tracking-[-0.02em]">{cap(e.title)}</h3>
          <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${tone}`}>
            {state === "working" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : state === "approved" ? <CircleCheck className="size-3.5" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" aria-hidden />}
            {STATE[state][0]}
          </span>
        </div>
        {e.prompt && (
          <div className="rounded-2xl border-l-[3px] border-accent/50 bg-neutral-50 px-4 py-2.5 text-[13px] leading-relaxed text-muted dark:bg-neutral-900/60">
            <Clamp lines={2}>{e.prompt}</Clamp>
          </div>
        )}
      </header>

      {e.version > 0 ? (
        <>
          {/* the fact check, folded into two chips: open either for the detail */}
          <div className="flex flex-wrap items-center gap-2 border-y border-line bg-neutral-50/60 px-5 py-2.5 sm:px-6 dark:bg-neutral-900/40">
            <span className="mr-1 text-[11.5px] font-bold text-muted">Fact check</span>
            {claims.length ? (
              <button onClick={() => setPanel(panel === "claims" ? null : "claims")} aria-expanded={panel === "claims"} className="inline-flex items-center gap-1.5 rounded-full bg-stop/10 px-3 py-1 text-xs font-bold text-stop hover:bg-stop/15">
                <CircleAlert className="size-3.5" aria-hidden />
                {claims.length} claim{claims.length > 1 ? "s" : ""} not in your profile
                <ChevronDown className={`size-3 transition-transform ${panel === "claims" ? "rotate-180" : ""}`} aria-hidden />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-go/10 px-3 py-1 text-xs font-bold text-go">
                <CircleCheck className="size-3.5" aria-hidden />
                {c.edited_by_user ? "Your words, your facts" : "Every claim checks out"}
              </span>
            )}
            {issues.length > 0 && (
              <button onClick={() => setPanel(panel === "tips" ? null : "tips")} aria-expanded={panel === "tips"} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent hover:bg-accent/15">
                <Lightbulb className="size-3.5" aria-hidden />
                {issues.length} suggestion{issues.length > 1 ? "s" : ""}
                <ChevronDown className={`size-3 transition-transform ${panel === "tips" ? "rotate-180" : ""}`} aria-hidden />
              </button>
            )}
            {c.summary && !c.edited_by_user && <span className="hidden min-w-0 flex-1 truncate text-xs text-muted lg:block" title={c.summary}>{c.summary}</span>}
          </div>
          {panel === "claims" && claims.length > 0 && (
            <ul className="space-y-1.5 border-b border-line bg-stop/[0.04] px-5 py-3 text-[13px] sm:px-6">
              <li className="text-xs font-bold text-stop">Fix or remove these before approving</li>
              {claims.map((u) => (
                <li key={u} className="flex gap-2">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-stop" aria-hidden />
                  {u}
                </li>
              ))}
            </ul>
          )}
          {panel === "tips" && issues.length > 0 && (
            <ul className="grid gap-2 border-b border-line bg-accent/[0.03] px-5 py-3 text-[13px] sm:grid-cols-2 sm:px-6">
              {issues.map((i, n) => (
                <li key={n} className="rounded-2xl border border-line bg-surface p-3">
                  <span className={`block font-bold ${i.severity === "high" ? "text-stop" : ""}`}>{cap(i.issue)}</span>
                  {i.fix && <span className="mt-0.5 block leading-relaxed text-muted">{cap(i.fix)}</span>}
                </li>
              ))}
              {c.hit_round_cap && !c.edited_by_user ? <li className="text-xs text-muted sm:col-span-2">The reviewer stopped after its last round with points left. Fix them in your edit.</li> : null}
            </ul>
          )}

          <div className="space-y-3 px-5 py-5 sm:px-6">
            <textarea
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              rows={Math.min(14, Math.max(8, Math.ceil(text.length / 95)))}
              aria-label={`${e.title} text`}
              className="max-h-[28rem] w-full resize-y rounded-2xl border border-line bg-background px-4 py-3.5 text-[15px] leading-[1.75] outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/12"
            />
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              {e.wordLimit ? (
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <span className={`block h-full rounded-full ${over ? "bg-stop" : "bg-bar-gradient"}`} style={{ width: `${Math.min(100, (count / e.wordLimit) * 100)}%` }} />
                  </span>
                  <span className={over ? "font-bold text-stop" : ""}>
                    {count} of {e.wordLimit} words
                  </span>
                </span>
              ) : (
                <span>{count} words</span>
              )}
              <span className="ml-auto">
                Version {e.version}, {e.author === "user" ? "written by you" : "agent draft"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button disabled={dirty || e.approved || !!busy || e.working || over} title={dirty ? "Save your edit first" : over ? "Over the word limit" : ""} onClick={() => act({ action: "approve", version: e.version }, "approve", "Approved as yours")}>
                <CircleCheck className="size-4" aria-hidden />
                {busy === "approve" ? "Approving…" : e.approved ? "Approved" : "Approve as mine"}
              </Button>
              <Button variant="secondary" disabled={!dirty || !!busy} onClick={() => act({ action: "save", content: text }, "save", "Your edit is saved")}>
                {busy === "save" ? "Saving…" : "Save my edit"}
              </Button>
              {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
            </div>
            <form
              className="flex gap-2 rounded-2xl border border-dashed border-line p-1.5"
              onSubmit={(ev) => {
                ev.preventDefault();
                act({ action: "revise", notes }, "revise", "Sent to the writer").then(() => setNotes(""));
              }}
            >
              <input value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Ask the writer for a change, like: shorter opening, more on my Kuda work" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" aria-label="Ask the writer for a change" />
              <Button type="submit" size="sm" variant="secondary" disabled={!!busy || e.working || !notes.trim()}>
                <Wand2 className="size-3.5" aria-hidden />
                {busy === "revise" ? "Sending…" : "Revise"}
              </Button>
            </form>
          </div>
        </>
      ) : (
        <p className="flex items-center gap-2 border-t border-line px-6 py-6 text-sm text-muted">
          {e.working ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {e.working ? "The first draft is on its way." : "No draft yet."}
        </p>
      )}
    </article>
  );
}

// one essay at a time: pills to switch, each showing where that piece stands
export function EssayTabs({ essays }: { essays: EssayData[] }) {
  const firstOpen = essays.findIndex((x) => !x.approved);
  const [i, setI] = useState(firstOpen >= 0 ? firstOpen : 0);
  const cur = essays[Math.min(i, essays.length - 1)];
  // a piece was just approved: go to the next one that isn't, or up to the signature when none is left, so the
  // applicant never has to work out what comes next
  const done = essays.filter((x) => x.approved).length;
  const before = useRef(done);
  useEffect(() => {
    if (done > before.current) {
      const next = essays.findIndex((x) => !x.approved && !x.working && x.kind !== "video_or_interview");
      if (next >= 0) setI(next);
      else {
        const sign = document.getElementById("sign");
        sign?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        (sign?.querySelector("input[type=checkbox]") as HTMLElement | null)?.focus({ preventScroll: true });
      }
    }
    before.current = done;
  }, [done, essays]);
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Essays">
        {essays.map((x, n) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={n === i}
            onClick={() => setI(n)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-[13px] font-bold transition-all ${
              n === i ? "border-accent/30 bg-accent/[0.07] text-accent shadow-card" : "border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            {x.working ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            ) : x.approved ? (
              <CircleCheck className="size-3.5 text-go" aria-hidden />
            ) : (
              <span className={`size-2 rounded-full ${x.critique?.status === "ready" ? "bg-signal" : "bg-neutral-300 dark:bg-neutral-600"}`} aria-hidden />
            )}
            {cap(x.title)}
          </button>
        ))}
      </div>
      <EssayEditor key={`${cur.id}:${cur.version}`} e={cur} />
    </div>
  );
}
