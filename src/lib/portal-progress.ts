// what an applicant sees of the agents' work on one school's portal: a line of milestones and one plain sentence.
// the raw runner note is written for the operator (what the page said, what the agents tried); the applicant gets
// it only when the next step is theirs. pure, so the application page, the dashboard and the tests agree.

export type StageKey = "portal" | "account" | "signin" | "form" | "documents" | "pay" | "submitted";
export type Stage = { key: StageKey; label: string; state: "done" | "now" | "next"; detail?: string };

// the stops where the next step is the applicant's. every other stop (stuck on a page, a run that failed, a hang,
// a portal we couldn't find) is ours: the operator is told and the applicant isn't asked to debug it
export const YOURS = new Set(["account", "login", "verification", "payment", "unpaid", "captcha", "blocked", "question", "missing", "documents", "closed", "review", "credits"]);

export type RunView = {
  portal?: { url?: string; ok?: boolean; at?: number } | null;
  signedIn?: boolean;
  accountAt?: number;
  route?: unknown[];
  formPages?: string[];
  stepOf?: { at: number; of: number } | null;
  uploads?: string[];
  reachedSubmit?: boolean;
  paymentAt?: number;
  resting?: string | null; // the day's effort cap was reached: carries on at this time (iso)
  wait?: { until: string | null; why: string } | null; // parked by the credit rules (lib/jobs noteRunnerWait)
};

export type PortalInput = {
  status: string; // the application's status
  runnerStatus: string | null;
  reason?: string | null;
  note?: string | null;
  paused?: boolean;
  pausedAll?: boolean;
  school: string;
  fee?: number | null;
  st?: RunView | null;
};

const SUBMITTED = new Set(["submitted", "under_review", "interview", "waitlisted", "admitted", "rejected"]);
const stuckish = (s: string | null) => s === "needs_you" || s === "failed";

// a review hold the agents made on a page that wasn't the application's own review page (ku leuven's doctoral
// instructions page): that's a wrong turn, not something for the applicant to check
const WRONG_PAGE = /\bnot (a|the|an) (pre-?submit(ting)? )?(review|summary|application) page\b|\bgeneral (instructions|information) page\b|\bnot (a|the) .{0,40}application portal\b/i;

export function ourSide(v: Pick<PortalInput, "runnerStatus" | "reason" | "note" | "status">): boolean {
  if (SUBMITTED.has(v.status)) return false;
  if (!stuckish(v.runnerStatus)) return false;
  if (v.runnerStatus === "failed") return true;
  if (v.reason === "review" && WRONG_PAGE.test(v.note ?? "")) return true;
  return !YOURS.has(v.reason ?? "");
}

// the applicant's turn: a stop whose next step is theirs
export const yourTurn = (v: Pick<PortalInput, "runnerStatus" | "reason" | "note" | "status">) => v.runnerStatus === "needs_you" && !ourSide(v) && !SUBMITTED.has(v.status);

export function portalStages(v: PortalInput): Stage[] {
  const st = v.st ?? {};
  const sent = SUBMITTED.has(v.status);
  const pages = st.formPages?.length ?? 0;
  const inForm = pages > 0 || !!st.reachedSubmit;
  const done: Record<StageKey, boolean> = {
    portal: sent || inForm || !!st.signedIn || !!st.accountAt || !!st.portal?.ok || (st.route?.length ?? 0) > 2,
    account: sent || inForm || !!st.signedIn || !!st.accountAt,
    signin: sent || inForm || !!st.signedIn,
    form: sent || !!st.reachedSubmit,
    documents: sent || !!st.reachedSubmit,
    pay: sent,
    submitted: sent,
  };
  const fee = v.fee ?? null;
  const step = st.stepOf && st.stepOf.of > 1 && st.stepOf.at <= st.stepOf.of ? st.stepOf : null;
  const ups = st.uploads?.length ?? 0;
  const list: Omit<Stage, "state">[] = [
    { key: "portal", label: "Portal found" },
    { key: "account", label: "Account" },
    { key: "signin", label: "Signed in" },
    { key: "form", label: "Form", detail: step ? `section ${step.at} of ${step.of}` : pages ? `${pages} page${pages === 1 ? "" : "s"} done` : undefined },
    { key: "documents", label: "Documents", detail: ups ? `${ups} uploaded` : undefined },
    { key: "pay", label: fee ? "Ready to pay" : "Final check" },
    { key: "submitted", label: "Submitted" },
  ];
  let nowGiven = false;
  const started = v.runnerStatus !== "idle" || inForm || !!st.signedIn || sent;
  return list.map((s) => {
    if (done[s.key]) return { ...s, state: "done" as const };
    if (!nowGiven && started) {
      nowGiven = true;
      return { ...s, state: "now" as const };
    }
    return { ...s, state: "next" as const };
  });
}

const money = (fee: number | null | undefined) => (fee ? `$${fee} ` : "");

// one plain sentence: where this application stands on the portal, and whether anything is the applicant's to do
export function portalSentence(v: PortalInput): string {
  const school = v.school || "the school";
  if (SUBMITTED.has(v.status)) return `Submitted. ${school} has your application.`;
  if (v.pausedAll) return "All agents are paused. Resume them on your dashboard and this one carries on from where it stopped.";
  if (v.paused) return "Paused. The agents kept their place; Resume carries on from the same page.";
  if (v.st?.resting && v.runnerStatus !== "needs_you") return "Resting for today after a long session on this portal. The agents carry on tomorrow by themselves.";
  if (v.st?.wait && v.runnerStatus !== "needs_you") {
    const day = v.st.wait.until ? new Date(v.st.wait.until).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }) : null;
    return `Waiting${day ? ` until ${day}` : ""}: ${v.st.wait.why}. The agents carry on by themselves${day ? " then" : ""}.`;
  }
  if (ourSide(v)) return `Ivyward is working on ${school}'s portal. Nothing for you to do; you'll hear from us if we need you.`;
  if (v.runnerStatus === "needs_you") {
    switch (v.reason) {
      case "account":
        return `Create your ${school} portal account with the email and password below. The agents sign in and carry on within 5 minutes.`;
      case "login":
        return `${school}'s portal won't take the saved login. Sign in or reset the password on the portal, and the agents carry on.`;
      case "verification":
        return `${school} sent a code or link to your email. Connect Gmail, or enter it on the portal, and the agents carry on.`;
      case "payment":
      case "unpaid":
        return `Everything is filled in. Pay the ${money(v.fee)}application fee and it's submitted.`;
      case "captcha":
      case "blocked":
        return `${school}'s application site only lets your own browser in. Add Ivyward to Chrome (free) and the agents finish it there.`;
      case "credits":
        return `The agents are waiting for credits to carry on with ${school}. Add credits and they start again within minutes.`;
      case "question":
        return `${school}'s form asks something your profile doesn't answer. Answer it and the agents carry on.`;
      case "missing":
        return "The portal asks for details your profile doesn't have yet. Add them and the agents carry on.";
      case "documents":
        return "The portal needs a document your packet doesn't have yet. Add it and the agents carry on.";
      case "closed":
        return `${school}'s portal says applications aren't open for this intake.`;
      case "review":
        return "Check one thing before it's submitted.";
    }
  }
  if (v.runnerStatus === "ready" || v.runnerStatus === "running") {
    const now = portalStages(v).find((s) => s.state === "now");
    switch (now?.key) {
      case "portal":
        return `Finding ${school}'s application portal.`;
      case "account":
        return `Creating your ${school} portal account.`;
      case "signin":
        return `Signing in to ${school}'s portal.`;
      case "form":
        return `Filling in the form${now.detail ? `: ${now.detail}` : ""}.`;
      case "documents":
        return "Uploading your documents.";
      case "pay":
        return "Getting it ready to submit.";
      default:
        return `Working on ${school}'s portal.`;
    }
  }
  return "Ready. Press Submit it for me and the agents take it from here.";
}

// why a portal job is parked, from the credit rules' reason, in the applicant's words (lib/jobs noteRunnerWait)
export function runnerWaitWhy(msg: string): { credits: boolean; text: string } {
  const reason = msg.replace(/^(budget|hold):\s*/i, "").trim();
  if (/monthly( \w+)? limit reached/i.test(reason)) return { credits: false, text: "this month's allowance for agent work is used up" };
  if (/unlock|out of credits|starter|free allowance|buy|credits/i.test(reason)) return { credits: true, text: reason.charAt(0).toUpperCase() + reason.slice(1) };
  return { credits: false, text: reason || "the agents are waiting their turn" };
}
