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
  quiet: "text-muted border-line",
  plain: "text-foreground border-line bg-surface",
  signal: "text-neutral-950 border-signal bg-signal",
  go: "text-go border-go/40 bg-go/10",
  stop: "text-stop border-stop/40 bg-stop/10",
};

export function StatusPill({ status, runner }: { status: string; runner?: string | null }) {
  const r = runner && runner !== "idle" && status === "packet_approved" ? RUNNER_STATUS[runner] : null;
  const s = r ?? APP_STATUS[status] ?? { label: status.replace(/_/g, " "), tone: "plain" as const };
  return <span className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium ${TONE[s.tone]}`}>{s.label}</span>;
}

export function daysUntil(date: string | null | undefined, today = new Date().toISOString().slice(0, 10)): number | null {
  if (!date) return null;
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
}
