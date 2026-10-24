"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, LoaderCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

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

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{cap(e.title)}</h3>
          {e.prompt && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{e.prompt}</p>}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-medium ${STATE[state][1]}`}>
          {state === "working" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : state === "approved" ? <CircleCheck className="size-4" aria-hidden /> : null}
          {STATE[state][0]}
        </span>
      </header>

      {e.version > 0 ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="space-y-3 p-5">
            <textarea
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              rows={Math.min(30, Math.max(10, Math.ceil(text.length / 85)))}
              aria-label={`${e.title} text`}
              className="w-full resize-y rounded-lg border border-transparent bg-transparent px-0 py-0 font-[family-name:var(--font-sans)] text-[16px] leading-[1.75] outline-none focus:border-line focus:px-3 focus:py-2"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
              <span className={over ? "font-medium text-stop" : ""}>
                {count} words{e.wordLimit ? ` of ${e.wordLimit}` : ""}
              </span>
              <span>
                Version {e.version} of {e.versions}, {e.author === "user" ? "written by you" : "agent draft"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={!dirty || !!busy} onClick={() => act({ action: "save", content: text }, "save", "Your edit is saved")}>
                {busy === "save" ? "Saving…" : "Save my edit"}
              </Button>
              <Button
                disabled={dirty || e.approved || !!busy || e.working || over}
                title={dirty ? "Save your edit first" : over ? "Over the word limit" : ""}
                onClick={() => act({ action: "approve", version: e.version }, "approve", "Approved as yours")}
              >
                <CircleCheck className="size-4" aria-hidden />
                {busy === "approve" ? "Approving…" : e.approved ? "Approved" : "Approve as mine"}
              </Button>
            </div>
            {dirty && <p className="text-xs text-muted">Unsaved changes. A revision starts from the last saved version.</p>}
            <form
              className="flex gap-2 pt-1"
              onSubmit={(ev) => {
                ev.preventDefault();
                act({ action: "revise", notes }, "revise", "Sent to the writer").then(() => setNotes(""));
              }}
            >
              <Input value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Tell the writer what to change" />
              <Button type="submit" variant="secondary" disabled={!!busy || e.working}>
                <Wand2 className="size-4" aria-hidden />
                {busy === "revise" ? "Sending…" : "Revise"}
              </Button>
            </form>
          </div>

          <aside className="space-y-4 border-t border-line bg-neutral-50 p-5 text-sm dark:bg-neutral-950/40 lg:border-l lg:border-t-0">
            <p className="font-semibold">Fact check</p>
            {claims.length ? (
              <div className="space-y-2">
                <p className="flex items-start gap-2 text-stop">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {claims.length} claim{claims.length > 1 ? "s aren't" : " isn't"} backed by your profile. Fix or remove before approving.
                </p>
                <ul className="space-y-1.5 pl-6 text-foreground">{claims.map((u) => <li key={u} className="list-disc">{u}</li>)}</ul>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-muted">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-go" aria-hidden />
                {c.edited_by_user ? "You've edited this. Every fact in it is yours to stand behind." : "Every claim matches your profile."}
              </p>
            )}
            {c.summary && !c.edited_by_user ? <p className="leading-relaxed text-muted">{c.summary}</p> : null}
            {issues.length ? (
              <div className="space-y-2">
                <p className="font-semibold">Suggestions</p>
                <ul className="space-y-2.5">
                  {issues.map((i, n) => (
                    <li key={n} className="leading-relaxed">
                      <span className={i.severity === "high" ? "font-medium text-stop" : "font-medium"}>{cap(i.issue)}</span>
                      {i.fix && <span className="block text-muted">{cap(i.fix)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {c.hit_round_cap && !c.edited_by_user ? <p className="text-muted">The reviewer stopped after its last round with points left. Fix them in your edit.</p> : null}
          </aside>
        </div>
      ) : (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-muted">
          {e.working ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {e.working ? "The first draft is on its way." : "No draft yet."}
        </p>
      )}
    </article>
  );
}
