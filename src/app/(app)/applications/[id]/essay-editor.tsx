"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

export function EssayEditor({ e }: { e: EssayData }) {
  const [text, setText] = useState(e.content);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const router = useRouter();
  const dirty = text !== e.content;
  const count = words(text);
  const over = e.wordLimit ? count > e.wordLimit : false;
  const c = e.critique ?? {};
  const status = e.working
    ? "agents working"
    : e.approved
      ? "approved by you"
      : c.edited_by_user
        ? "your edit"
        : c.status === "ready"
          ? "ready for you"
          : e.version
            ? "in review"
            : "waiting";

  async function act(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setErr("");
    const res = await fetch(`/api/artifacts/${e.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "failed");
    setBusy(null);
    router.refresh();
  }

  return (
    <article className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">{e.title}</h2>
          {e.prompt && <p className="mt-1 text-sm text-neutral-500">{e.prompt}</p>}
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
            e.approved
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : status === "ready for you"
                ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          {status}
        </span>
      </header>

      {e.version > 0 ? (
        <>
          <textarea
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            rows={Math.min(28, Math.max(8, Math.ceil(text.length / 90)))}
            className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-[15px] leading-relaxed outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
          />
          <p className={`text-xs ${over ? "text-red-600" : "text-neutral-500"}`}>
            {count} words{e.wordLimit ? ` / ${e.wordLimit}` : ""} · version {e.version} of {e.versions} · {e.author === "user" ? "written by you" : "agent draft"}
          </p>

          {(c.unsupported_claims?.length || c.issues?.length || c.summary) && !c.edited_by_user ? (
            <details className="rounded-md bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-900" open={!!c.unsupported_claims?.length}>
              <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
                red team{c.score ? ` · ${c.score}/10` : ""}{c.round ? ` · round ${c.round}` : ""}
                {c.unsupported_claims?.length ? <span className="text-red-600"> · {c.unsupported_claims.length} unsupported claim{c.unsupported_claims.length > 1 ? "s" : ""}</span> : null}
              </summary>
              <div className="mt-2 space-y-2">
                {c.hit_round_cap && <p className="text-amber-700 dark:text-amber-400">stopped after 3 rounds with issues left. fix these in your edit.</p>}
                {c.summary && <p>{c.summary}</p>}
                {c.unsupported_claims?.length ? (
                  <div>
                    <p className="font-medium text-red-600">not backed by your profile. remove or correct before approving:</p>
                    <ul className="list-disc pl-5">{c.unsupported_claims.map((u) => <li key={u}>{u}</li>)}</ul>
                  </div>
                ) : null}
                {c.issues?.length ? (
                  <ul className="space-y-1">
                    {c.issues.map((i, n) => (
                      <li key={n}>
                        <span className={i.severity === "high" ? "text-red-600" : i.severity === "medium" ? "text-amber-700 dark:text-amber-400" : "text-neutral-500"}>{i.severity}</span>: {i.issue}
                        {i.fix && <span className="text-neutral-500"> → {i.fix}</span>}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={!dirty || !!busy}
              onClick={() => act({ action: "save", content: text }, "save")}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700"
            >
              {busy === "save" ? "saving…" : "save my edit"}
            </button>
            <button
              disabled={dirty || e.approved || !!busy || e.working || over}
              title={dirty ? "save your edit first" : over ? "over the word limit" : ""}
              onClick={() => act({ action: "approve", version: e.version }, "approve")}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {busy === "approve" ? "approving…" : e.approved ? "approved" : "approve as mine"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              placeholder="tell the writer what to change (optional)…"
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
            />
            <button
              disabled={!!busy || e.working}
              onClick={() => act({ action: "revise", notes }, "revise").then(() => setNotes(""))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700"
            >
              {busy === "revise" ? "sending…" : "revise"}
            </button>
          </div>
          {dirty && <p className="text-xs text-neutral-500">unsaved changes. a revision from the writer starts from the last saved version.</p>}
        </>
      ) : (
        <p className="text-sm text-neutral-500">{e.working ? "first draft on its way…" : "no draft yet."}</p>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </article>
  );
}
