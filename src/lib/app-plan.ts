// one application's remaining steps, in order, with who does each: the applicant, the agents, or the school.
// built from what's already stored; nothing new is tracked for it.

export type Who = "you" | "agents" | "school";
export type PlanStep = { key: string; label: string; who: Who; state: "done" | "now" | "next"; detail?: string; href?: string };

export type PlanInput = {
  status: string;
  essaysTotal: number;
  essaysApproved: number;
  essaysWorking: boolean;
  attested: boolean;
  runnerStatus: string | null;
  runnerNote: string | null;
  openQuestions: number;
  fee: number | null;
  waiver: string | null;
  deadline: string | null;
};

const ORDER = ["researching", "shortlisted", "preparing", "ready_for_review", "packet_approved", "submitted", "under_review", "interview", "waitlisted", "admitted", "rejected", "withdrawn"];
const past = (status: string, than: string) => ORDER.indexOf(status) > ORDER.indexOf(than);

export function planFor(a: PlanInput): PlanStep[] {
  const steps: Omit<PlanStep, "state">[] = [];
  const done = new Set<string>();
  const submitted = a.status === "submitted" || past(a.status, "submitted");

  steps.push({ key: "research", label: "Check the program's requirements and deadline", who: "agents" });
  if (past(a.status, "shortlisted") || a.essaysTotal) done.add("research");

  steps.push({ key: "write", label: a.essaysTotal ? `Write and fact-check ${a.essaysTotal} piece${a.essaysTotal === 1 ? "" : "s"}` : "Write and fact-check the essays", who: "agents" });
  if (a.essaysTotal && !a.essaysWorking) done.add("write");

  steps.push({ key: "approve", label: "Read and approve the essays", who: "you", detail: a.essaysTotal ? `${a.essaysApproved} of ${a.essaysTotal} approved` : undefined, href: "#essays" });
  if (a.attested || (a.essaysTotal > 0 && a.essaysApproved >= a.essaysTotal)) done.add("approve");

  steps.push({ key: "sign", label: "Sign the application packet", who: "you", href: "#sign" });
  if (a.attested) done.add("sign");

  if (a.fee && a.fee > 0) {
    steps.push({ key: "waiver", label: `Ask the school to waive the $${a.fee} fee`, who: "agents", detail: a.waiver === "granted" ? "waived" : a.waiver === "denied" ? "declined" : a.waiver === "requested" ? "asked, waiting for the school" : undefined });
    if (a.waiver) done.add("waiver");
  }

  if (a.openQuestions > 0 && !submitted) steps.push({ key: "questions", label: `Answer ${a.openQuestions} question${a.openQuestions === 1 ? "" : "s"} the portal asked`, who: "you", href: "#portal" });

  const stuck = a.runnerStatus === "needs_you" && !submitted;
  steps.push({ key: "submit", label: "Fill in the portal and submit", who: stuck ? "you" : "agents", detail: stuck ? (a.runnerNote ?? "the agents need you on the portal") : a.runnerStatus === "running" ? "working on the portal now" : undefined, href: "#portal" });
  if (submitted) done.add("submit");

  steps.push({ key: "decision", label: "The school decides", who: "school", detail: a.status === "admitted" ? "admitted" : a.status === "rejected" ? "not admitted" : a.status === "waitlisted" ? "waitlisted" : undefined });
  if (["admitted", "rejected", "waitlisted", "withdrawn"].includes(a.status)) done.add("decision");

  // the first step not done is the one happening now. a fee waiver runs alongside, so it never holds the line
  let nowGiven = false;
  return steps.map((st) => {
    if (done.has(st.key)) return { ...st, state: "done" as const };
    if (!nowGiven && st.key !== "waiver") {
      nowGiven = true;
      return { ...st, state: "now" as const };
    }
    return { ...st, state: "next" as const };
  });
}
