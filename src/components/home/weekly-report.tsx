"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUp, House, X } from "lucide-react";
import { Mark } from "@/components/wordmark";

export interface ReportItem {
  title: string;
  body: string;
  label: string;
  action: string;
}
export interface WeeklyReport {
  kind: "weekly";
  week_of: string;
  next_on: string;
  headline: string;
  working: string;
  pivot: string;
  items: ReportItem[];
  stats: { value: string; label: string }[];
  closing: string;
  dismissed?: number[];
}

const href = (action: string) => (action.startsWith("open:") ? action.slice(5) : action.startsWith("chat:") ? `/dashboard?chat=open&say=${encodeURIComponent(action.slice(5).slice(0, 300))}` : "/dashboard");
const nice = (d: string, weekday: "long" | "short" = "long") => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday, day: "numeric", month: "short", timeZone: "UTC" });

// **bold** in the report's copy
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <strong key={i} className="font-semibold text-foreground">{p}</strong> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

// the report itself: headline, what's working, the few things holding the season back, the numbers, the close
export function ReportBody({ id, r, onDismiss }: { id: string; r: WeeklyReport; onDismiss?: (i: number) => void }) {
  const [hidden, setHidden] = useState<number[]>(r.dismissed ?? []);
  const items = r.items.map((it, i) => ({ it, i })).filter(({ i }) => !hidden.includes(i));
  return (
    <article className="px-6 py-8 sm:px-11 sm:py-10">
      <h2 className="font-serif text-[28px] leading-[1.18] sm:text-[36px]">{r.headline}</h2>
      <div className="my-7 flex items-center justify-center gap-3 text-line" aria-hidden>
        <span className="h-px w-10 bg-current" />
        <span className="text-[13px] tracking-[0.3em] text-muted">•••</span>
        <span className="h-px w-10 bg-current" />
      </div>
      <div className="space-y-4 text-[16px] leading-[1.7] text-neutral-700 dark:text-neutral-300">
        <p>
          <Rich text={r.working} />
        </p>
        <p>
          <Rich text={r.pivot} />
        </p>
      </div>
      {items.length > 0 && (
        <ol className="mt-6 space-y-3">
          {items.map(({ it, i }, n) => (
            <li key={i} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex gap-4">
                <span className="w-5 shrink-0 pt-0.5 font-serif text-[17px] text-brand">{n + 1}.</span>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-semibold leading-snug">{it.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.7] text-neutral-600 dark:text-neutral-400">
                    <Rich text={it.body} />
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <Link href={href(it.action)} className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 dark:text-neutral-950">
                      {it.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setHidden((h) => [...h, i]);
                        onDismiss?.(i);
                        fetch(`/api/reports/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dismiss: i }) }).catch(() => {});
                      }}
                      className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-foreground"
                    >
                      <X className="size-3.5" aria-hidden /> Not relevant
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <dl className="mt-8 grid grid-cols-2 border-y border-line sm:grid-cols-4">
        {r.stats.map((s, i) => (
          <div key={s.label} className={`py-4 ${i % 2 ? "pl-5" : "pr-5"} sm:px-5 ${i ? "sm:border-l sm:border-line" : "sm:pl-0"} ${i % 2 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line sm:border-t-0" : ""}`}>
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <span className="block font-serif text-[30px] leading-none tabular">{s.value}</span>
              <span className="mt-2 block text-[13px] leading-snug text-muted">{s.label}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-7 text-[16px] leading-[1.7] text-neutral-700 dark:text-neutral-300">
        <Rich text={r.closing} />
      </p>
      <p className="mt-6 text-[14px] text-muted">
        <span className="text-foreground">Ivyward AI</span>, next report {nice(r.next_on)}
      </p>
    </article>
  );
}

const SEEN = "ivw-report-seen";
const seen = () => {
  try {
    return localStorage.getItem(SEEN);
  } catch {
    return null;
  }
};
const markSeen = (id: string) => {
  try {
    localStorage.setItem(SEEN, id);
  } catch {
    /* private mode */
  }
};

// the report as a window over the home page: opens by itself once per new report, or from the home page button
export function WeeklyReportDialog({ id, r, created }: { id: string; r: WeeklyReport; created: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState("");
  useEffect(() => {
    const asked = params.get("report");
    const fresh = Date.now() - Date.parse(created) < 7 * 86_400_000;
    if (asked === id || asked === "latest" || (fresh && seen() !== id)) setOpen(true);
  }, [id, created, params]);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("ivw:open-report", on);
    return () => window.removeEventListener("ivw:open-report", on);
  }, []);
  const close = () => {
    markSeen(id);
    setOpen(false);
    if (params.get("report")) router.replace("/dashboard", { scroll: false });
  };
  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content onOpenAutoFocus={(e) => e.preventDefault()} className="fixed inset-x-0 bottom-0 top-6 z-50 mx-auto flex max-w-[880px] flex-col overflow-hidden rounded-t-2xl border border-line bg-background shadow-lift sm:inset-x-4 sm:bottom-6 sm:rounded-2xl">
          <header className="flex items-center gap-3 border-b border-line bg-surface px-5 py-4 sm:px-7">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/10">
              <Mark className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[15px] font-semibold">Ivyward AI</Dialog.Title>
              <Dialog.Description className="truncate text-[13px] text-muted">Your weekly report, {nice(r.week_of)}</Dialog.Description>
            </div>
            <Link href="/reports" onClick={() => markSeen(id)} className="hidden text-[14px] text-muted hover:text-foreground sm:block">
              Past reports
            </Link>
            <Dialog.Close className="grid size-9 place-items-center rounded-lg text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800" aria-label="Close">
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </header>
          <p className="border-b border-line bg-neutral-50 px-5 py-2.5 text-[13px] leading-snug text-muted sm:px-7 dark:bg-neutral-900/50">
            <House className="mr-1.5 inline size-3.5 -translate-y-px" aria-hidden />
            Reopen it any time from your <span className="font-medium text-foreground">home page</span>. Also sent to your inbox.
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ReportBody id={id} r={r} />
          </div>
          <form
            className="flex items-center gap-3 border-t border-line bg-surface px-4 py-3 sm:px-7"
            onSubmit={(e) => {
              e.preventDefault();
              const t = ask.trim();
              if (!t) return;
              markSeen(id);
              setOpen(false);
              router.push(`/dashboard?chat=open&say=${encodeURIComponent(`About my weekly report: ${t}`.slice(0, 500))}`);
            }}
          >
            <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl border border-line bg-background pl-4 pr-1.5 focus-within:border-neutral-400">
              <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask me anything about this week…" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400" aria-label="Ask Ivyward AI about this report" />
              <button type="submit" disabled={!ask.trim()} className="grid size-8 place-items-center rounded-lg text-brand disabled:text-neutral-300" aria-label="Ask">
                <ArrowUp className="size-4" aria-hidden />
              </button>
            </div>
            <button type="button" onClick={close} className="shrink-0 px-2 text-[14px] text-muted hover:text-foreground">
              Dismiss
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// the home page entry point: reopen the latest report, or ask for the first one
export function ReportButton({ hasReport }: { hasReport: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (hasReport) return window.dispatchEvent(new Event("ivw:open-report"));
        setBusy(true);
        const r = await fetch("/api/reports", { method: "POST" }).catch(() => null);
        const j = r ? ((await r.json().catch(() => ({}))) as { id?: string }) : {};
        setBusy(false);
        if (j.id) router.push(`/dashboard?report=${j.id}`);
        router.refresh();
      }}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1 text-[13px] text-muted shadow-[0_1px_2px_rgb(9_9_11/0.04)] transition-colors hover:text-foreground"
    >
      <Mark className="size-3.5" />
      {busy ? "Writing your report…" : hasReport ? "Weekly report" : "Get this week's report"}
    </button>
  );
}
