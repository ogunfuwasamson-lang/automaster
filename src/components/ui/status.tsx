// one vocabulary for where an application is, shared by the board, lists and pages
export const APP_STATUS: Record<string, { label: string; tone: "quiet" | "plain" | "signal" | "go" | "stop" }> = {
  researching: { label: "Researching", tone: "quiet" },
  shortlisted: { label: "Shortlisted", tone: "plain" },
  preparing: { label: "Writing", tone: "plain" },
  ready_for_review: { label: "Ready for you", tone: "signal" },
  packet_approved: { label: "Signed", tone: "plain" },
  submitted: { label: "Submitted", tone: "go" },
  under_review: { label: "Under review", tone: "go" },
  interview: { label: "Interview", tone: "signal" },
  admitted: { label: "Admitted", tone: "go" },
  waitlisted: { label: "Waitlisted", tone: "plain" },
  rejected: { label: "Not admitted", tone: "quiet" },
  withdrawn: { label: "Withdrawn", tone: "quiet" },
  dropped: { label: "Dropped", tone: "quiet" },
};

export const RUNNER_STATUS: Record<string, { label: string; tone: "quiet" | "plain" | "signal" | "go" | "stop" }> = {
  ready: { label: "Queued to submit", tone: "plain" },
  running: { label: "Submitting", tone: "plain" },
  needs_you: { label: "Needs you", tone: "signal" },
  failed: { label: "Problem", tone: "stop" },
  submitted: { label: "Submitted", tone: "go" },
};

const TONE = {
  quiet: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  plain: "bg-accent/10 text-accent",
  signal: "bg-signal/10 text-signal",
  go: "bg-go/10 text-go",
  stop: "bg-stop/10 text-stop",
};

// a soft tinted chip with a dot: colour carries the state, the label says it
export function StatusPill({ status, runner }: { status: string; runner?: string | null }) {
  const r = runner && runner !== "idle" && status === "packet_approved" ? RUNNER_STATUS[runner] : null;
  const s = r ?? APP_STATUS[status] ?? { label: status.replace(/_/g, " "), tone: "plain" as const };
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-bold ${TONE[s.tone]}`}>
      <span className={`size-1.5 rounded-full bg-current ${s.tone === "signal" || s.label === "Submitting" ? "animate-pulse" : ""}`} aria-hidden />
      {s.label}
    </span>
  );
}

export function daysUntil(date: string | null | undefined, today = new Date().toISOString().slice(0, 10)): number | null {
  if (!date) return null;
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
}

// agent notes are written mid-sentence; show them as sentences
export const sentence = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
