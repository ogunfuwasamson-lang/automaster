import { FEE_STEPS, TRAVEL_STEPS, arrivalSteps, visaSteps, type Step } from "@/lib/journey-steps";

// the applicant's whole journey, from their profile to their first day in school (founder's call, 26 nov 2026: Ivyward
// is with them every step, not only to the submit button). the dashboard shows it as a map. stages up to the
// admission come from what the agents and the applicant did; after a confirmed admission, the funding, visa,
// fees, travel and arrival steps are ticked off by the applicant (some tick themselves). pure, so it's tested.

export type StageId = "profile" | "shortlist" | "apply" | "submitted" | "admitted" | "funding" | "visa" | "fees" | "travel" | "arrival";
export type StageState = "done" | "current" | "todo";
export type MapStep = Step & { done: boolean; auto?: boolean };
export type Stage = { id: StageId; label: string; what: string; state: StageState; steps?: MapStep[]; href?: string; cta?: string };

export type MapApp = { id: string; school: string; country: string | null; status: string; verified: boolean; aid: number; acceptBy: string | null; scholarshipsChecked: boolean };
export type MapInput = { hasCv: boolean; basicsMissing: number; apps: MapApp[]; ticks: Set<string> };
export type JourneyMap = { stages: Stage[]; done: number; current: Stage | null; destination: MapApp | null; pendingAdmission: MapApp | null };

const READY = ["ready_for_review", "packet_approved", "submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "declined", "rejected"];
const SENT = READY.slice(2);

// the school they're going to: one they accepted, else the confirmed admission with the most funding
export function destinationOf(apps: MapApp[]): MapApp | null {
  const confirmed = apps.filter((a) => a.verified && a.status !== "declined");
  return confirmed.find((a) => a.status === "accepted") ?? [...confirmed].sort((a, b) => b.aid - a.aid)[0] ?? null;
}

// "2027-04-15" → "15 Apr 2027" (the reply-by date on an offer)
const day = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1]} ${m[1]}` : iso;
};

export const tickKey = (applicationId: string, stage: StageId, step: string) => `${applicationId}:${stage}.${step}`;

export function journeyMap(i: MapInput): JourneyMap {
  const any = (sts: string[]) => i.apps.some((a) => sts.includes(a.status));
  const dest = destinationOf(i.apps);
  const pending = dest ? null : (i.apps.find((a) => a.status === "admitted" && !a.verified) ?? null);
  const ticked = (stage: StageId, steps: Step[], auto: Record<string, boolean> = {}): MapStep[] =>
    steps.map((s) => ({ ...s, done: !!auto[s.id] || (!!dest && i.ticks.has(tickKey(dest.id, stage, s.id))), auto: s.id in auto }));

  const school = dest?.school.split(",")[0] ?? "your school";
  const visa = visaSteps(dest?.country);
  const funding: Step[] = [
    { id: "plan", label: `Your agents look for more funding at ${school}`, href: dest ? `/applications/${dest.id}#funding` : undefined },
    { id: "awards", label: "Apply for the awards they find" },
    { id: "accept", label: dest?.acceptBy ? `Accept your offer by ${day(dest.acceptBy)}` : "Accept your offer" },
  ];

  const raw: Omit<Stage, "state">[] = [
    { id: "profile", label: "Profile", what: "Your CV and the details every form asks for", href: "/profile", cta: "Open your profile" },
    { id: "shortlist", label: "Shortlist", what: "Programmes that fit you, checked on the schools' own pages", href: "/shortlist", cta: "Open your shortlist" },
    { id: "apply", label: "Applications", what: "Essays drafted and fact-checked, forms filled, fee waivers asked for", href: "/applications", cta: "Your applications" },
    { id: "submitted", label: "Submitted", what: "Sent to the school once you've signed", href: "/applications", cta: "Your applications" },
    {
      id: "admitted",
      label: "Admitted",
      what: dest ? `Confirmed: ${dest.school}` : pending ? `Confirm your admission to ${pending.school}` : "Confirmed from the school's email or your admission letter",
      href: pending ? `/applications/${pending.id}#admission` : dest ? `/applications/${dest.id}` : undefined,
      cta: pending ? "Confirm it" : dest ? "See the offer" : undefined,
    },
    { id: "funding", label: "Funding", what: "Scholarships, assistantships and a better aid offer", steps: ticked("funding", funding, { plan: !!dest?.scholarshipsChecked }) },
    { id: "visa", label: "Visa", what: visa.name, steps: ticked("visa", visa.steps) },
    { id: "fees", label: "School fees", what: "Deposit and tuition, paid the safe way", steps: ticked("fees", FEE_STEPS) },
    { id: "travel", label: "Travel", what: "Housing, flight and arrival", steps: ticked("travel", TRAVEL_STEPS) },
    { id: "arrival", label: "First day", what: "Registered and in class", steps: ticked("arrival", arrivalSteps(dest?.country)) },
  ];

  const isDone = (s: Omit<Stage, "state">): boolean => {
    switch (s.id) {
      case "profile":
        return i.hasCv && i.basicsMissing === 0;
      case "shortlist":
        return i.apps.length > 0;
      case "apply":
        return any(READY);
      case "submitted":
        return any(SENT);
      case "admitted":
        return !!dest;
      case "funding":
        return !!s.steps?.find((x) => x.id === "accept")?.done;
      case "visa":
        return !!s.steps?.find((x) => x.id === "granted")?.done;
      default:
        return !!s.steps?.length && s.steps.every((x) => x.done);
    }
  };
  // an admission from before Ivyward skips the stages before it: those count as done once it's confirmed
  const afterAdmit = !!dest;
  let seenCurrent = false;
  const stages: Stage[] = raw.map((s, n) => {
    const done = isDone(s) || (afterAdmit && n < 4);
    let state: StageState = done ? "done" : "todo";
    if (!done && !seenCurrent) {
      state = "current";
      seenCurrent = true;
    }
    return { ...s, state };
  });
  return { stages, done: stages.filter((s) => s.state === "done").length, current: stages.find((s) => s.state === "current") ?? null, destination: dest, pendingAdmission: pending };
}
