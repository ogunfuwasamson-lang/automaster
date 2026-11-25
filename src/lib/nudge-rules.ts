// asking an engaged applicant to pay, a different way each time. pure: the server fills in the facts, this picks
// the angle and the words. every line has to be true for this applicant: real deadlines, real counts, nothing
// invented (no fake scarcity, no testimonials, no promise of admission).

import { fill, type Angle, type AngleSetting } from "@/lib/credit-policy";
export type { Angle };
type Overrides = Partial<Record<Angle, AngleSetting>>;

export interface NudgeCtx {
  model: "pack" | "subscription";
  price: string; // in-app only: "₦10,000 for 60 credits", "$20 a month"
  programs: number; // programmes on their list
  essays: number; // essays the agents have drafted
  ready: number; // applications written and waiting to go in
  nearest: { school: string; days: number } | null; // the next deadline still ahead
  freeLeft: number | null; // free applications left (subscription countries)
}

export interface Nudge {
  angle: Angle;
  headline: string;
  body: string;
  cta: string; // the button
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const short = (school: string) => school.split(",")[0].trim();

// the angles that are true for this applicant right now, most pressing first
export function angles(c: NudgeCtx, o: Overrides = {}): Angle[] {
  return applicable(c).filter((a) => o[a]?.on !== false);
}
function applicable(c: NudgeCtx): Angle[] {
  const out: Angle[] = [];
  if (c.nearest && c.nearest.days <= 45) out.push("deadline");
  if (c.ready > 0) out.push("ready");
  if (c.programs > 0) out.push("progress");
  out.push("handsoff", "funding");
  if (c.model === "subscription" && c.freeLeft != null && c.freeLeft <= 1) out.push("freeleft");
  out.push("value");
  return out;
}

const unlock = (c: NudgeCtx) => (c.model === "pack" ? "Get a pack" : "Go Pro");

function builtIn(angle: Angle, c: NudgeCtx, opts: { prices: boolean }): Nudge {
  const what = c.model === "pack" ? "a pack of credits" : "Pro";
  const price = opts.prices ? ` (${c.price})` : "";
  switch (angle) {
    case "deadline": {
      const n = c.nearest!;
      const when = n.days === 0 ? "today" : n.days === 1 ? "tomorrow" : `in ${n.days} days`;
      return {
        angle,
        headline: `${short(n.school)} closes ${when}`,
        body: `Portals slow down on deadline day. With ${what}${price} in place, the agents fill every page and submit the moment your application is signed, so it's in well before the rush.`,
        cta: c.model === "pack" ? "Get credits" : "Go Pro and submit",
      };
    }
    case "ready":
      return {
        angle,
        headline: `${plural(c.ready, "application")} ${c.ready === 1 ? "is" : "are"} written and waiting`,
        body: `The essays are drafted and checked. The last step is the portal: the agents fill it in for you and submit once you sign off. ${c.model === "pack" ? `One pack${price} covers five, with credits to spare.` : `Pro${price} covers up to 16 a month.`}`,
        cta: c.ready === 1 ? "Send it in" : "Send them in",
      };
    case "progress":
      // what they have so far, then what credits add: plain, and true for one programme as much as for twenty
      return c.essays
        ? {
            angle,
            headline: `${plural(c.essays, "essay")} drafted for ${c.essays === 1 ? "your application" : "your applications"}`,
            body: `Read ${c.essays === 1 ? "it" : "them"} when you're ready. With credits${price}, the agents then fill in each application form, upload your documents and submit once you've signed.`,
            cta: unlock(c),
          }
        : {
            angle,
            headline: c.programs === 1 ? "Your shortlist has its first programme" : `${plural(c.programs, "programme")} on your shortlist`,
            body: `${c.programs === 1 ? "It's" : "Each one is"} checked on the school's own pages, with deadlines, fees and funding. With credits${price}, the agents take ${c.programs === 1 ? "it" : "each one"} from start to finish: your essays, the application form and your documents, then they submit once you've signed.`,
            cta: c.model === "pack" ? "Get credits" : "Go Pro",
          };
    case "handsoff":
      return {
        angle,
        headline: "Stop filling in the same form ten times",
        body: `Every portal wants your details, grades, documents and essays in its own format. With ${what}${price}, the agents do every page of every portal. You read it, sign once, and they submit.`,
        cta: unlock(c),
      };
    case "funding":
      return {
        angle,
        headline: "Ask the schools for money, too",
        body: `Fee waivers, scholarship forms and funding emails to schools are submissions as well. The agents find them and draft each one. Each one uses a single credit. ${c.model === "pack" ? `A pack${price} gives you 60.` : `Pro${price} gives you 160 a month.`}`,
        cta: c.model === "pack" ? "Get a pack" : "Go Pro",
      };
    case "freeleft":
      return {
        angle,
        headline: c.freeLeft ? "One free application left" : "Your free applications are used",
        body: `Pro${price} gives you 160 credits a month: an application uses 10, a funding request 1. Cancel any time.`,
        cta: "Go Pro",
      };
    case "value":
      return {
        angle,
        headline: c.model === "pack" ? "60 credits, no subscription" : "160 credits a month",
        body:
          c.model === "pack"
            ? `A pack${price} gives you 60 credits for 30 days: 5 applications and 10 programme checks, or funding requests at 1 each.`
            : `Pro${price} gives you 160 credits a month: an application uses 10. Cancel any time from Settings.`,
        cta: c.model === "pack" ? "Get a pack" : "Go Pro",
      };
  }
}

// the operator's own wording (from the console) wins over the built-in, field by field, with placeholders filled.
// a deadline angle without a deadline, or "ready" with none ready, never shows: overrides don't change when.
export function copy(angle: Angle, c: NudgeCtx, opts: { prices: boolean } = { prices: true }, o: Overrides = {}): Nudge {
  const b = builtIn(angle, c, opts);
  const own = o[angle];
  if (!own) return b;
  const vars = {
    school: c.nearest ? short(c.nearest.school) : "",
    days: c.nearest?.days ?? "",
    ready: c.ready,
    programs: c.programs,
    essays: c.essays,
    what: c.model === "pack" ? "a pack of submissions" : "Pro",
    price: opts.prices ? c.price : "",
    free_left: c.freeLeft ?? "",
  };
  const tidy = (t: string) => fill(t, vars).replace(/\s*\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
  return { angle, headline: own.headline ? tidy(own.headline) : b.headline, body: own.body ? tidy(own.body) : b.body, cta: own.cta ? tidy(own.cta) : b.cta };
}

// a stable number per applicant, so two people on the same day don't see the same angle
export function seedOf(userId: string): number {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// the dashboard: a different angle each day. a deadline inside two weeks always wins: that's the real reason to act.
// null when the operator switched every angle that applies off
export function pickNudge(c: NudgeCtx, userSeed: number, day: number, o: Overrides = {}): Nudge | null {
  const list = angles(c, o);
  if (!list.length) return null;
  if (list.includes("deadline") && c.nearest && c.nearest.days <= 14) return copy("deadline", c, { prices: true }, o);
  return copy(list[(userSeed + day) % list.length], c, { prices: true }, o);
}

// the emails: one at each step after an applicant becomes serious, each a different angle (no prices in email)
const EMAIL_ORDER: Angle[][] = [["progress", "handsoff"], ["handsoff", "value"], ["deadline", "ready", "progress"], ["funding", "value"], ["ready", "deadline", "value"]];

export function emailNudge(c: NudgeCtx, step: number, o: Overrides = {}): Nudge | null {
  const ok = angles(c, o);
  if (!ok.length) return null;
  const prefs = EMAIL_ORDER[step % EMAIL_ORDER.length];
  const angle = prefs.find((a) => ok.includes(a)) ?? ok[step % ok.length];
  return copy(angle, c, { prices: false }, o);
}

// the next email due, or none: one step at a time, spaced out
export function dueStep(days: number[], daysSinceEngaged: number, sent: number[], lastSentMs: number | null, now: number, gapDays = 2): number | null {
  if (lastSentMs != null && now - lastSentMs < gapDays * 86_400_000) return null;
  for (let i = 0; i < days.length; i++) if (!sent.includes(i)) return daysSinceEngaged >= days[i] ? i : null;
  return null;
}
