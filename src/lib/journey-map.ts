import { FEE_STEPS, TRAVEL_STEPS, arrivalSteps, visaSteps, type Step } from "@/lib/journey-steps";
import { US_SUSPENSION_GUIDE, nationalsOf, usSuspension, usSuspensionNote } from "@/lib/us-visa-suspension";

// the applicant's whole journey, from their profile to their first day in school (founder's call, 26 nov 2026: Ivyward
// is with them every step, not only to the submit button). the dashboard shows it as a map. each stop lists the
// applicant's own things at that stop: what's missing from the profile, the programmes on the shortlist, the
// applications being written, the schools waiting on a decision, the admissions; after a confirmed admission, the
// funding, visa, fees, travel and arrival steps to tick off (some tick themselves). pure, so it's tested.

export type StageId = "profile" | "shortlist" | "apply" | "submitted" | "admitted" | "funding" | "visa" | "fees" | "travel" | "arrival";
export type StageState = "done" | "current" | "todo";
export type MapStep = Step & { done: boolean; auto?: boolean };
export type Tone = "go" | "signal" | "plain" | "muted";
// one of the applicant's own things at a stop: a school, a document, an offer
export type MapItem = { id: string; title: string; sub: string; status: string; tone: Tone; href: string };
export type Stage = {
  id: StageId;
  label: string;
  title: string; // what the stop is about, as a heading
  summary: string; // where they stand at it, in a sentence
  state: StageState;
  items: MapItem[];
  attention: number; // items waiting on the applicant
  steps?: MapStep[];
  href?: string;
  cta?: string;
};

export type MapApp = {
  id: string;
  school: string;
  programme: string;
  country: string | null;
  status: string;
  runner: string | null;
  deadline: string | null;
  verified: boolean;
  aid: number;
  acceptBy: string | null;
  scholarshipsChecked: boolean;
};
export type MapInput = { hasCv: boolean; hasTranscript?: boolean; basicsMissing: number; apps: MapApp[]; ticks: Set<string>; citizenship?: string | null };
export type JourneyMap = { stages: Stage[]; done: number; current: Stage | null; destination: MapApp | null; pendingAdmission: MapApp | null };

const WRITING = ["preparing", "ready_for_review", "packet_approved"];
const WITH_SCHOOL = ["submitted", "under_review", "interview", "waitlisted", "rejected"];
const READY = ["ready_for_review", "packet_approved", ...WITH_SCHOOL, "admitted", "accepted", "declined"];
const SENT = [...WITH_SCHOOL, "admitted", "accepted", "declined"];

// the school they're going to: one they accepted, else the confirmed admission with the most funding
export function destinationOf(apps: MapApp[]): MapApp | null {
  const confirmed = apps.filter((a) => a.verified && a.status !== "declined");
  return confirmed.find((a) => a.status === "accepted") ?? [...confirmed].sort((a, b) => b.aid - a.aid)[0] ?? null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2027-04-15" → "15 Apr 2027"
export const day = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
};
const short = (school: string) => school.split(",")[0].replace(/\s*\([^)]*\)/g, "").trim();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const TONE_ORDER: Record<Tone, number> = { signal: 0, go: 1, plain: 2, muted: 3 };

export const tickKey = (applicationId: string, stage: StageId, step: string) => `${applicationId}:${stage}.${step}`;

// where one application stands, in the applicant's words, for the stop it's at
function appStatus(a: MapApp): { status: string; tone: Tone; anchor?: string } {
  switch (a.status) {
    case "researching":
      return { status: "Being checked", tone: "muted" };
    case "shortlisted":
      return { status: a.deadline ? `Closes ${day(a.deadline)}` : "Ready to start", tone: "plain" };
    case "preparing":
      return { status: "Essays being written", tone: "plain" };
    case "ready_for_review":
      return { status: "Ready for you to sign", tone: "signal", anchor: "#sign" };
    case "packet_approved":
      return a.runner === "needs_you"
        ? { status: "Needs you", tone: "signal", anchor: "#portal" }
        : a.runner === "running"
          ? { status: "Agents filling in the form", tone: "plain" }
          : { status: "Signed, going in next", tone: "plain" };
    case "submitted":
      return { status: "Waiting for a decision", tone: "plain" };
    case "under_review":
      return { status: "Under review", tone: "plain" };
    case "interview":
      return { status: "Interview", tone: "signal" };
    case "waitlisted":
      return { status: "Waitlisted", tone: "plain" };
    case "rejected":
      return { status: "Not admitted", tone: "muted" };
    case "admitted":
      return a.verified ? { status: "Admitted, confirmed", tone: "go" } : { status: "Confirm it with the letter", tone: "signal", anchor: "#admission" };
    case "accepted":
      return { status: "Offer accepted", tone: "go" };
    case "declined":
      return { status: "Offer declined", tone: "muted" };
    default:
      return { status: a.status, tone: "muted" };
  }
}

const item = (a: MapApp): MapItem => {
  const s = appStatus(a);
  return { id: a.id, title: short(a.school), sub: a.programme, status: s.status, tone: s.tone, href: `/applications/${a.id}${s.anchor ?? ""}` };
};
const sorted = (xs: MapItem[], apps: MapApp[]) => {
  const due = new Map(apps.map((a) => [a.id, a.deadline ?? "9999"]));
  return xs.sort((x, y) => TONE_ORDER[x.tone] - TONE_ORDER[y.tone] || (due.get(x.id) ?? "9999").localeCompare(due.get(y.id) ?? "9999") || x.title.localeCompare(y.title));
};

export function journeyMap(i: MapInput): JourneyMap {
  const any = (sts: string[]) => i.apps.some((a) => sts.includes(a.status));
  const dest = destinationOf(i.apps);
  const pending = dest ? null : (i.apps.find((a) => a.status === "admitted" && !a.verified) ?? null);
  const ticked = (stage: StageId, steps: Step[], auto: Record<string, boolean> = {}): MapStep[] =>
    steps.map((s) => ({ ...s, done: !!auto[s.id] || (!!dest && i.ticks.has(tickKey(dest.id, stage, s.id))), auto: s.id in auto }));
  const at = (sts: string[]) => sorted(i.apps.filter((a) => sts.includes(a.status)).map(item), i.apps);

  const school = dest ? short(dest.school) : "your school";
  const visa = visaSteps(dest?.country);
  // new US student visas suspended for their nationality (lib/us-visa-suspension): said where it matters, at the
  // shortlist, the applications and the visa
  const us = usSuspension(i.citizenship);
  const inUs = (a: MapApp) => /united states|^usa?$/i.test((a.country ?? "").trim());
  const usFlag = (sts: string[]) => {
    const n = us ? i.apps.filter((a) => sts.includes(a.status) && inUs(a)).length : 0;
    return n && us ? ` ${n === 1 ? "One is" : `${n} are`} in the US, where new student visas for ${nationalsOf(us)} are suspended.` : "";
  };
  const usVisa = !!(us && dest && inUs(dest));
  const funding: Step[] = [
    { id: "plan", label: `Your agents look for more funding at ${school}`, href: dest ? `/applications/${dest.id}#funding` : undefined },
    { id: "awards", label: "Apply for the awards they find" },
    { id: "accept", label: dest?.acceptBy ? `Accept your offer by ${day(dest.acceptBy)}` : "Accept your offer" },
  ];

  // the profile: what every form needs
  const profileItems: MapItem[] = [
    { id: "cv", title: "CV", sub: "Builds most of your profile", status: i.hasCv ? "On file" : "Missing", tone: i.hasCv ? "go" : "signal", href: "/documents" },
    ...(i.hasTranscript === undefined ? [] : [{ id: "transcript", title: "Transcript", sub: "Grades and courses for every form", status: i.hasTranscript ? "On file" : "Missing", tone: (i.hasTranscript ? "go" : "signal") as Tone, href: "/documents" }]),
    { id: "basics", title: "Form basics", sub: "Phone, date of birth, passport details", status: i.basicsMissing ? `${i.basicsMissing} to add` : "Done", tone: i.basicsMissing ? "signal" : "go", href: "/profile/chapters/basics" },
  ];
  const missing = profileItems.filter((x) => x.tone === "signal").length;
  const shortlist = at(["researching", "shortlisted"]);
  const writing = at(WRITING);
  const withSchool = at(WITH_SCHOOL);
  const offers = at(["admitted", "accepted", "declined"]);
  const waitingOnYou = (xs: MapItem[]) => xs.filter((x) => x.tone === "signal").length;
  const decided = withSchool.filter((x) => x.tone === "muted").length;
  const confirmed = i.apps.filter((a) => a.verified && ["admitted", "accepted"].includes(a.status)).length;

  const raw: Omit<Stage, "state" | "attention">[] = [
    {
      id: "profile",
      label: "Profile",
      title: missing ? "Finish your profile" : "Your profile is ready",
      summary: missing ? `${plural(missing, "thing")} left before the agents can fill in forms without stopping.` : "Everything application forms ask for is on file.",
      items: profileItems,
      href: missing ? (profileItems.find((x) => x.tone === "signal")?.href ?? "/profile") : "/profile",
      cta: missing ? "Add what's missing" : "Open your profile",
    },
    {
      id: "shortlist",
      label: "Shortlist",
      title: "Your shortlist",
      summary: shortlist.length ? `${plural(shortlist.length, "programme")} waiting to be started, each checked on the school's own pages.${usFlag(["researching", "shortlisted"])}` : i.apps.length ? "Everything on your shortlist has been started." : "Your agents haven't shortlisted programmes yet.",
      items: shortlist,
      href: "/shortlist",
      cta: "Open your shortlist",
    },
    {
      id: "apply",
      label: "Applications",
      title: "Applications in progress",
      summary: writing.length ? `${plural(writing.length, "application")} being written or going in${waitingOnYou(writing) ? `, ${waitingOnYou(writing)} waiting on you` : ""}.${usFlag(WRITING)}` : "None in progress right now. Start one from your shortlist.",
      items: writing,
      href: "/applications",
      cta: "All applications",
    },
    {
      id: "submitted",
      label: "Submitted",
      title: "With the schools",
      summary: withSchool.length
        ? `${plural(withSchool.length - decided, "application")} waiting for a decision${waitingOnYou(withSchool) ? `, ${waitingOnYou(withSchool)} needing you` : ""}${decided ? `. ${decided} turned down` : ""}. Your agents read school emails for decisions.`
        : "Nothing submitted yet.",
      items: withSchool,
      href: "/applications",
      cta: "All applications",
    },
    {
      id: "admitted",
      label: "Admitted",
      title: offers.length ? "Your admissions" : "No admissions yet",
      summary: offers.length
        ? `${plural(offers.length, "admission")}${confirmed ? `, ${confirmed} confirmed` : ""}${pending ? `. Confirm ${short(pending.school)} with the letter or the school's email so your agents start on funding and your visa` : dest ? `. Next: funding at ${school}` : ""}.`
        : "When a school admits you, confirm it here with the school's email or the letter. Already admitted somewhere? Add the letter.",
      items: offers,
      href: pending ? `/applications/${pending.id}#admission` : dest ? `/applications/${dest.id}` : undefined,
      cta: pending ? "Confirm it" : dest ? "See the offer" : undefined,
    },
    { id: "funding", label: "Funding", title: dest ? `Funding at ${school}` : "Funding", summary: dest ? (dest.aid ? `Offered about $${dest.aid.toLocaleString("en-US")} a year so far. Your agents look for more.` : "Scholarships, assistantships and a better aid offer.") : "Scholarships, assistantships and a better aid offer, once an admission is confirmed.", items: [], steps: ticked("funding", funding, { plan: !!dest?.scholarshipsChecked }) },
    {
      id: "visa",
      label: "Visa",
      title: visa.name,
      summary: usVisa && us ? usSuspensionNote(us) : dest ? `For ${school}, step by step, with the government's own pages.` : "The student visa for your destination, once an admission is confirmed.",
      items: usVisa && us ? [{ id: "us-suspension", title: "New US student visas suspended", sub: `For ${nationalsOf(us)} since 1 January 2026`, status: "Read first", tone: "signal", href: US_SUSPENSION_GUIDE }] : [],
      steps: ticked("visa", visa.steps),
      ...(visa.guide ? { href: `/guides/${visa.guide}`, cta: "Read the full guide" } : {}),
    },
    { id: "fees", label: "School fees", title: "Deposit and tuition", summary: "Paid on the school's own payment page. Keep every receipt: visa officers can ask for them.", items: [], steps: ticked("fees", FEE_STEPS) },
    { id: "travel", label: "Travel", title: "Housing and travel", summary: "Somewhere to live, then the flight once the visa is granted.", items: [], steps: ticked("travel", TRAVEL_STEPS) },
    { id: "arrival", label: "First day", title: "Your first days", summary: dest ? `Arriving at ${school}.` : "Arriving and registering at your school.", items: [], steps: ticked("arrival", arrivalSteps(dest?.country)) },
  ];

  const isDone = (s: Omit<Stage, "state" | "attention">): boolean => {
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
  let seenCurrent = false;
  const stages: Stage[] = raw.map((s, n) => {
    const done = isDone(s) || (!!dest && n < 4);
    let state: StageState = done ? "done" : "todo";
    if (!done && !seenCurrent) {
      state = "current";
      seenCurrent = true;
    }
    return { ...s, state, attention: waitingOnYou(s.items) };
  });
  return { stages, done: stages.filter((s) => s.state === "done").length, current: stages.find((s) => s.state === "current") ?? null, destination: dest, pendingAdmission: pending };
}
