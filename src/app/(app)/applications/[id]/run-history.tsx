import { ChevronDown } from "lucide-react";
import { admin } from "@/lib/supabase/admin";

// what the agents did on the portal, page by page: the questions they answered there (labels; the answers are in
// the packet), a picture of the page when Chrome had it on screen, and what the weekly status checks found.
type Ev = { action: string; created_at: string; context: Record<string, unknown> | null };

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export async function RunHistory({ userId, applicationId, checkin }: { userId: string; applicationId: string; checkin?: { summary?: string; missing?: string[]; at?: number; signedOut?: boolean } | null }) {
  const db = admin();
  const { data } = await db
    .from("events")
    .select("action, created_at, context")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .in("action", ["runner.page", "runner.corrections", "runner.status_changed", "runner.submitted", "runner.moved_to_chrome"])
    .order("created_at", { ascending: false })
    .limit(40);
  const events = (data ?? []) as Ev[];
  if (!events.length && !checkin?.at) return null;
  // pictures live in the applicant's private folder: short-lived links, made for this page view
  const shots = events.map((e) => (e.action === "runner.page" ? (e.context?.shot as string | null) : null)).filter((s): s is string => !!s);
  const signed = new Map<string, string>();
  if (shots.length) {
    const { data: urls } = await db.storage.from("documents").createSignedUrls(shots.slice(0, 20), 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  const pages = events.filter((e) => e.action === "runner.page").length;

  return (
    <details className="group rounded-3xl border border-line bg-surface shadow-card">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-4">
        <span>
          <span className="block font-bold">Portal history</span>
          <span className="block text-[13px] text-muted">
            {pages ? `${pages} page${pages === 1 ? "" : "s"} filled in` : "No pages recorded yet"}
            {checkin?.at ? ` · last status check ${when(new Date(checkin.at).toISOString())}` : ""}
          </span>
        </span>
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 border-t border-line px-5 py-4 text-sm">
        {checkin?.at ? (
          <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900">
            <p className="font-medium">What the portal says now</p>
            {checkin.signedOut ? (
              <p className="text-muted">Chrome was signed out of this portal at the last check. Sign in to it once in Chrome and the weekly check can read it.</p>
            ) : (
              <>
                <p className="text-muted">{checkin.summary}</p>
                {checkin.missing?.length ? (
                  <ul className="mt-2 list-disc pl-5">
                    {checkin.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        <ol className="space-y-4">
          {events.map((e, i) => {
            const c = e.context ?? {};
            if (e.action === "runner.page") {
              const filled = (c.filled as string[] | undefined) ?? [];
              const shot = c.shot ? signed.get(c.shot as string) : undefined;
              return (
                <li key={i} className="space-y-1">
                  <p>
                    <span className="font-medium">{String(c.title || c.host || "A page")}</span> <span className="text-muted">· {when(e.created_at)} · {filled.length} answered</span>
                  </p>
                  {filled.length ? <p className="text-[13px] text-muted">{filled.slice(0, 12).join(" · ")}{filled.length > 12 ? ` and ${filled.length - 12} more` : ""}</p> : null}
                  {shot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shot} alt={`The page as the agents left it: ${String(c.title || "")}`} className="mt-2 w-full max-w-xl rounded-xl border border-line" loading="lazy" />
                  ) : null}
                </li>
              );
            }
            const text =
              e.action === "runner.corrections"
                ? `You corrected ${((c.labels as string[]) ?? []).length} answer${((c.labels as string[]) ?? []).length === 1 ? "" : "s"}; the agents learned from it`
                : e.action === "runner.status_changed"
                  ? `Status check: ${String(c.summary ?? "")}`
                  : e.action === "runner.submitted"
                    ? "Submitted"
                    : "Moved to your Chrome";
            return (
              <li key={i}>
                <span className="font-medium">{text}</span> <span className="text-muted">· {when(e.created_at)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}
