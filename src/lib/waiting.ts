// the dashboard's one list of what's waiting on the applicant: each thing once, each with one button. stops on our
// side (a portal page the agents can't get past) aren't on it: the operator has those. pure.
import { yourTurn } from "@/lib/portal-progress";

export type WaitItem = { key: string; title: string; body?: string; href: string; action: string; school?: string; urgent?: boolean };

export type WaitApp = {
  id: string;
  school: string;
  status: string;
  runnerStatus: string | null;
  reason: string | null;
  note: string | null;
  essaysTotal: number;
  essaysApproved: number;
  attested: boolean;
  fee?: number | null;
  questions?: number;
};

export type WaitSetup = { id: string; title: string; body?: string | null; href?: string | null; action_label?: string | null; urgent?: boolean | null };

const ESSAY = (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`;

export function appWaiting(a: WaitApp): WaitItem | null {
  const at = `/applications/${a.id}`;
  if (a.status === "ready_for_review" || (a.status === "preparing" && a.essaysTotal > 0 && a.essaysApproved < a.essaysTotal)) {
    const left = a.essaysTotal - a.essaysApproved;
    if (left > 0 && a.status === "ready_for_review") return { key: `approve:${a.id}`, school: a.school, title: `Read and approve ${ESSAY(left)} for ${a.school}`, href: `${at}#essays`, action: "Review" };
    if (left <= 0 && !a.attested) return { key: `sign:${a.id}`, school: a.school, title: `Sign ${a.school}'s application packet`, body: "After you sign, the agents find the portal and submit.", href: `${at}#sign`, action: "Sign", urgent: true };
    return null;
  }
  if (a.status !== "packet_approved") return null;
  if (a.questions && a.questions > 0) return { key: `ask:${a.id}`, school: a.school, title: `Answer ${a.questions === 1 ? "a question" : `${a.questions} questions`} from ${a.school}'s form`, href: `${at}#questions`, action: "Answer", urgent: true };
  if (!yourTurn(a)) return null;
  const base = { key: `run:${a.id}`, school: a.school, urgent: true };
  switch (a.reason) {
    case "account":
      return { ...base, title: `Create your ${a.school} portal account`, body: "The link, email and password to use are on the application.", href: `${at}#portal`, action: "Show me" };
    case "login":
      return { ...base, title: `Sign in to ${a.school}'s portal once`, href: `${at}#portal`, action: "Open" };
    case "verification":
      return { ...base, title: `Confirm the code ${a.school} emailed you`, href: `${at}#portal`, action: "Open" };
    case "payment":
    case "unpaid":
      return { ...base, title: `Pay ${a.school}'s ${a.fee ? `$${a.fee} ` : ""}application fee`, body: "Everything else is filled in.", href: `${at}?pay=1#pay`, action: "Pay" };
    case "captcha":
    case "blocked":
      return { ...base, title: `Add Ivyward to Chrome to finish ${a.school}`, body: "This school's application site only lets your own browser in. Free, about two minutes on a computer.", href: `/connect-chrome?then=${a.id}`, action: "Add to Chrome" };
    case "credits":
      return { ...base, title: `Add credits to carry on with ${a.school}`, body: "The agents stopped where they were and start again as soon as you have credits.", href: "/credits", action: "Add credits" };
    case "question":
      return { ...base, title: `Answer a question from ${a.school}'s form`, href: `${at}#questions`, action: "Answer" };
    case "missing":
      return { ...base, title: `Add the details ${a.school}'s form asks for`, href: "/profile?tab=details", action: "Add" };
    case "documents":
      return { ...base, title: `Add a document ${a.school} needs`, href: "/documents", action: "Add" };
    case "closed":
      return { ...base, title: `${a.school} isn't taking applications for this intake`, href: at, action: "See options", urgent: false };
    case "review":
      return { ...base, title: `Check ${a.school}'s application before it goes`, href: `${at}#portal`, action: "Check" };
  }
  return { ...base, title: `${a.school} needs one step from you`, href: `${at}#portal`, action: "Open" };
}

// the whole list: applications first (most urgent first), then setup asks the applications don't already cover
export function waitingList(apps: WaitApp[], setup: WaitSetup[] = []): WaitItem[] {
  const items = apps.map(appWaiting).filter((x): x is WaitItem => !!x);
  const chrome = items.some((i) => i.href.startsWith("/connect-chrome"));
  for (const n of setup) {
    if (chrome && /chrome/i.test(`${n.title} ${n.href ?? ""}`)) continue;
    items.push({ key: `setup:${n.id}`, title: n.title, body: n.body ?? undefined, href: n.href ?? "/dashboard", action: n.action_label ?? "Open", urgent: !!n.urgent });
  }
  return items.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
}
