// plain-english activity feed and the daily digest. pure: no db, no model, no cost.

export interface EventRow {
  actor: string;
  action: string;
  created_at: string;
  context?: Record<string, unknown> | null;
}

const LABELS: Record<string, string> = {
  "system.pinged": "agent loop checked",
  "document.uploaded": "document uploaded",
  "document.extracted": "read a document into your profile",
  "profile.patched": "updated your profile",
  "profile.consolidated": "cleaned up your profile",
  "preferences.updated": "saved your study preferences",
  "interview.turn": "interview answer saved",
  "recon.requested": "started a program search",
  "recon.planned": "planned the program search",
  "recon.discovered": "found candidate programs",
  "program.shortlisted": "shortlisted a program",
  "program.researching": "still researching a program",
  "program.dropped": "dropped a program",
  "scholarships.found": "found scholarships that match you",
  "application.prepare_requested": "started preparing an application",
  "application.planned": "wrote the application strategy",
  "artifact.drafted": "drafted an essay",
  "artifact.revised": "revised an essay",
  "artifact.ready_for_user": "an essay is ready for your review",
  "artifact.edited": "you edited an essay",
  "artifact.approved": "you approved an essay",
  "artifact.revision_requested": "you asked for a revision",
  "artifact.sent_back": "essay sent back for another pass",
  "packet.approved": "you approved an application packet",
  "application.submitted": "application submitted",
  "fee_waiver.drafted": "drafted a fee-waiver request",
  "funding.plan_drafted": "wrote a funding plan for an admit",
  "email.scheduled": "email scheduled to send",
  "email.sent": "email sent",
  "email.cancelled": "email cancelled",
  "email.failed": "email failed to send",
  "email.outcome": "you logged an email reply",
  "mail.connected": "connected your Gmail",
  "mail.disconnected": "disconnected your Gmail",
  "runner.started": "runner started filling a portal",
  "runner.needs_you": "runner needs you on a portal",
  "runner.submitted": "runner submitted an application",
  "runner.failed": "runner hit a problem",
  "runner.connected": "connected the browser extension",
  "runner.queued": "you sent an application to the runner",
  "runner.stopped": "you stopped the runner",
  "controls.paused": "you paused agents",
  "controls.resumed": "you resumed agents",
  "controls.dial_changed": "you changed the autonomy dial",
  "controls.fee_envelope": "you changed the fee envelope",
  "approval.approved": "you approved a request",
  "approval.rejected": "you declined a request",
  "job.failed": "an agent task failed",
};

const ACTOR: Record<string, string> = {
  user: "you",
  system: "system",
};

export function actorLabel(actor: string): string {
  if (ACTOR[actor]) return ACTOR[actor];
  return actor.replace(/^agent:/, "");
}

export function describe(e: EventRow): string | null {
  // internal plumbing stays out of the user's feed
  if (e.action.startsWith("guard.")) return null;
  if (e.action.startsWith("decision.")) return `you recorded a decision: ${e.action.slice(9)}`;
  if (e.action.startsWith("application.") && !LABELS[e.action]) return `application moved to ${e.action.slice(12).replace(/_/g, " ")}`;
  const title = typeof e.context?.title === "string" ? ` (${e.context.title})` : "";
  return (LABELS[e.action] ?? e.action.replace(/[._]/g, " ")) + title;
}

// ---------------------------------------------------------------------------
// digest
// ---------------------------------------------------------------------------
export interface DigestInput {
  name: string | null;
  since: string;
  events: EventRow[];
  pendingApprovals: { title: string }[];
  draftsReady: { title: string }[];
  deadlines: { school: string; program: string; date: string; status: string }[];
  scheduledEmails: { subject: string; to: string | null; send_after: string | null }[];
  runnerNeedsYou: { school: string; note: string | null }[];
  today: string; // YYYY-MM-DD
}

export interface Digest {
  headline: string;
  needs_you: string[];
  done: string[];
  coming_up: string[];
  empty: boolean;
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export function buildDigest(d: DigestInput): Digest {
  const needs_you: string[] = [];
  if (d.pendingApprovals.length) needs_you.push(`${d.pendingApprovals.length} decision${d.pendingApprovals.length > 1 ? "s" : ""} in your queue: ${d.pendingApprovals.slice(0, 3).map((a) => a.title).join("; ")}`);
  for (const r of d.draftsReady.slice(0, 5)) needs_you.push(`review: ${r.title}`);
  for (const r of d.runnerNeedsYou) needs_you.push(`${r.school}: the runner stopped${r.note ? ` (${r.note})` : ""}`);

  // what agents did, grouped and counted
  const counts = new Map<string, number>();
  for (const e of d.events) {
    if (e.actor === "user") continue;
    const label = describe({ ...e, context: null });
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const done = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l, n]) => (n > 1 ? `${l} ×${n}` : l));

  const coming_up: string[] = [];
  for (const x of d.deadlines) {
    const n = daysBetween(d.today, x.date);
    if (n < 0 || n > 30) continue;
    coming_up.push(`${x.school} · ${x.program}: deadline in ${n} day${n === 1 ? "" : "s"} (${x.status.replace(/_/g, " ")})`);
  }
  for (const m of d.scheduledEmails) coming_up.push(`email "${m.subject}"${m.to ? ` to ${m.to}` : ""} sends soon; you can still cancel it`);

  const urgent = d.deadlines.filter((x) => {
    const n = daysBetween(d.today, x.date);
    return n >= 0 && n <= 7 && !["submitted", "packet_approved"].includes(x.status);
  }).length;
  const headline = urgent
    ? `${urgent} deadline${urgent > 1 ? "s" : ""} within a week`
    : needs_you.length
      ? `${needs_you.length} thing${needs_you.length > 1 ? "s" : ""} need${needs_you.length > 1 ? "" : "s"} you`
      : done.length
        ? "agents kept working; nothing needs you"
        : "quiet day";
  return { headline, needs_you, done, coming_up, empty: !needs_you.length && !done.length && !coming_up.length };
}

export function digestText(g: Digest, appUrl: string, name: string | null): string {
  const sec = (h: string, xs: string[]) => (xs.length ? `${h}\n${xs.map((x) => `- ${x}`).join("\n")}\n\n` : "");
  return `${name ? `hi ${name.split(" ")[0]},\n\n` : ""}${g.headline}.\n\n${sec("needs you", g.needs_you)}${sec("done since yesterday", g.done)}${sec("coming up", g.coming_up)}open your dashboard: ${appUrl}/dashboard\n\nturn this email off on your dashboard.`;
}

// is it digest time (7am) for this timezone?
export function localHour(tz: string | null, now = new Date()): number {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz || "UTC" }).format(now)) % 24;
  } catch {
    return now.getUTCHours();
  }
}
