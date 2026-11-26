import { ORIGINS } from "@/content/countries";
import { REGIONS } from "@/lib/profile";
import type { Ask } from "@/lib/ask";

// starting on WhatsApp (founder, 26 nov 2026): someone says hi to Ivyward's number, confirms their email with a code,
// answers the same few questions the web setup asks (as buttons and lists they tap), sends their CV, and gets their
// shortlist in the chat. this file is the conversation itself: what each step asks and how a reply is read. pure, so
// it's tested; lib/whatsapp-onboard runs it against the database and the WhatsApp API.

export type Step = "email" | "code" | "name" | "level" | "fields" | "passport" | "passport_other" | "regions" | "regions_more" | "funding" | "start" | "cv" | "done";
export type Level = "undergraduate" | "masters" | "phd";
export type Funding = "full" | "partial" | "self";

// what they've told us so far (whatsapp_flows.state)
export type Answers = { name?: string; level?: Level; fields?: string[]; passport?: string; regions?: string[]; funding?: Funding; term?: string; cv?: boolean };

export type Button = { id: string; title: string };
export type Row = { id: string; title: string; description?: string };
export type Out =
  | { kind: "text"; body: string }
  | { kind: "buttons"; body: string; buttons: Button[] }
  | { kind: "list"; body: string; button: string; rows: Row[] };

// a reply: what they typed, and the id of the button or list row they tapped (null when they typed)
export type In = { text: string; reply: string | null };

// WhatsApp's limits: button titles 20 characters, list rows 24 (title) and 72 (description), bodies 1024 with buttons
export const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
};

// the intakes the web setup offers (app/onboarding)
export const TERMS = [
  ["fall-2027", "Fall 2027"],
  ["spring-2028", "Spring 2028"],
  ["fall-2028", "Fall 2028"],
] as const;

const ORDER: Step[] = ["name", "level", "fields", "passport", "regions", "funding", "start", "cv", "done"];

// the first question they haven't answered: an existing account that links on WhatsApp skips what it already has
export function nextStep(a: Answers): Step {
  if (!a.name) return "name";
  if (!a.level) return "level";
  if (!a.fields?.length) return "fields";
  if (!a.passport) return "passport";
  if (!a.regions?.length) return "regions";
  if (!a.funding) return "funding";
  if (!a.term) return "start";
  if (!a.cv) return "cv";
  return "done";
}
// how many questions are left from this one, this one included
export const stepsLeft = (s: Step) => Math.max(1, ORDER.indexOf("done") - ORDER.indexOf(s === "passport_other" ? "passport" : s === "regions_more" ? "funding" : s));

// ---- signing up ----

export const SITE_HOST = "tryivyward.com";
export const GREETING = `Hi, I'm Ivyward AI. I run university applications abroad with AI agents: I find programmes that fit you, prepare each application and keep you on track, right here on WhatsApp.

To set up your free account, what's your email address?

By carrying on you agree to our terms (${SITE_HOST}/terms) and privacy policy (${SITE_HOST}/privacy). Reply STOP any time.`;

export const emailIn = (text: string): string | null => {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/i);
  return m ? m[0].toLowerCase().replace(/\.+$/, "") : null;
};
export const codeOf = (text: string): string | null => text.replace(/[\s-]/g, "").match(/^\d{6}$/)?.[0] ?? null;
// an invite code in the first message ("Hi Ivyward (ref: ada12)"), from the site's button when they came through a link
export const refIn = (text: string): string | null => text.match(/\bref[:\s]+([a-z0-9]{4,16})\b/i)?.[1]?.toLowerCase() ?? null;

export const CODE_MINUTES = 15;
export const CODE_TRIES = 5;
export const CODES_PER_DAY = 3;

export const askedCode = (email: string): Out => ({
  kind: "buttons",
  body: `I've sent a 6-digit code to ${email}. Type it here to confirm it's your email. It works for ${CODE_MINUTES} minutes; check your spam folder if it isn't there.`,
  buttons: [
    { id: "code:resend", title: "Send it again" },
    { id: "code:change", title: "Change email" },
  ],
});

// ---- the questions ----

const levelWord = (l?: Level) => (l === "undergraduate" ? "bachelor's" : l === "phd" ? "PhD" : "master's");
const regionName = (k: string) => (k === "europe" ? "Europe" : k === "australia_nz" ? "Australia & NZ" : REGIONS[k]);
export const regionNames = (ks: string[]) => ks.map(regionName).filter(Boolean).join(", ");

export type Ctx = { first: string; phone: string; answers: Answers; usBlocked: string | null };

export function question(step: Step, c: Ctx): Out {
  const a = c.answers;
  switch (step) {
    case "name":
      return { kind: "text", body: "What's your full name, as it is on your passport? It goes on every application form." };
    case "level":
      return {
        kind: "buttons",
        body: `Thanks${c.first ? `, ${c.first}` : ""}. What are you applying for?`,
        buttons: [
          { id: "lvl:undergraduate", title: "Bachelor's" },
          { id: "lvl:masters", title: "Master's" },
          { id: "lvl:phd", title: "PhD" },
        ],
      };
    case "fields":
      return { kind: "text", body: a.level === "phd" ? "What's your PhD in? Type one or more fields, like public health or machine learning." : `Which ${a.level === "undergraduate" ? "subjects" : "fields"} do you want to study? Type one or more, like ${a.level === "undergraduate" ? "computer science, economics" : "data science, finance"}.` };
    case "passport": {
      const home = countryFromPhone(c.phone);
      if (!home) return { kind: "text", body: "Which country's passport do you hold? Scholarships and visas depend on it." };
      return {
        kind: "buttons",
        body: "Which passport do you hold? Scholarships and visas depend on it.",
        buttons: [
          { id: `pp:${home.name}`, title: clip(home.name, 20) },
          { id: "pp:other", title: "Another country" },
        ],
      };
    }
    case "passport_other":
      return { kind: "text", body: "Type the country on your passport." };
    case "regions": {
      const left = Object.keys(REGIONS).filter((k) => !(a.regions ?? []).includes(k) && !(c.usBlocked && k === "us"));
      return {
        kind: "list",
        body: `${c.usBlocked ? `${c.usBlocked}\n\n` : ""}Where do you want to study? Pick one; you can add more after.`,
        button: "Choose a region",
        rows: left.map((k) => ({ id: `rg:${k}`, title: clip(regionName(k), 24) })),
      };
    }
    case "regions_more":
      return {
        kind: "buttons",
        body: `Your agents will search ${regionNames(a.regions ?? [])}. Add another region?`,
        buttons: [
          { id: "rg:more", title: "Add another" },
          { id: "rg:done", title: "That's all" },
        ],
      };
    case "funding":
      return {
        kind: "buttons",
        body: "How will you pay for it? Your agents look for funding either way.",
        buttons: [
          { id: "fund:full", title: "Full funding only" },
          { id: "fund:partial", title: "Partial is fine" },
          { id: "fund:self", title: "I'll pay myself" },
        ],
      };
    case "start":
      return { kind: "buttons", body: `When do you want to start your ${levelWord(a.level)}?`, buttons: TERMS.map(([id, title]) => ({ id: `term:${id}`, title })) };
    case "cv":
      return {
        kind: "buttons",
        body: "Last one: send your CV here, as a PDF or Word file or a photo. Your agents fill most of every form from it and check your fit against each programme.",
        buttons: [{ id: "cv:skip", title: "Skip for now" }],
      };
    default:
      return { kind: "text", body: "" };
  }
}

// a reply to the step they're on: what to save and where to go next, or what to ask again
export type Parsed = { ok: true; set: Answers; next: Step } | { ok: false; again: string };

export function parse(step: Step, i: In, c: Ctx): Parsed {
  const text = i.text.trim();
  const r = i.reply ?? "";
  const after = (set: Answers): Step => nextStep({ ...c.answers, ...set });
  switch (step) {
    case "name": {
      const name = nameIn(text);
      return name ? { ok: true, set: { name }, next: after({ name }) } : { ok: false, again: "Type your name as it is on your passport, like Ada Obi." };
    }
    case "level": {
      const level = (r.startsWith("lvl:") ? r.slice(4) : levelIn(text)) as Level | null;
      return level && ["undergraduate", "masters", "phd"].includes(level) ? { ok: true, set: { level }, next: after({ level }) } : { ok: false, again: "Tap Bachelor's, Master's or PhD." };
    }
    case "fields": {
      const fields = fieldsIn(text);
      return fields.length ? { ok: true, set: { fields }, next: after({ fields }) } : { ok: false, again: "Type what you want to study, like computer science." };
    }
    case "passport":
    case "passport_other": {
      if (r === "pp:other") return { ok: true, set: {}, next: "passport_other" };
      const passport = r.startsWith("pp:") ? r.slice(3) : countryIn(text);
      return passport ? { ok: true, set: { passport }, next: after({ passport }) } : { ok: false, again: "Type the country on your passport, like Ghana." };
    }
    case "regions": {
      const k = r.startsWith("rg:") ? r.slice(3) : regionIn(text);
      if (!k || !REGIONS[k]) return { ok: false, again: "Pick a region from the list, or type one, like UK or Canada." };
      if (k === "us" && c.usBlocked) return { ok: false, again: `${c.usBlocked} Pick another region for now.` };
      const regions = [...new Set([...(c.answers.regions ?? []), k])];
      const left = Object.keys(REGIONS).filter((x) => !regions.includes(x) && !(c.usBlocked && x === "us"));
      return { ok: true, set: { regions }, next: left.length ? "regions_more" : after({ regions }) };
    }
    case "regions_more": {
      if (r === "rg:more" || /^\s*(add|more|another|yes)\b/i.test(text)) return { ok: true, set: {}, next: "regions" };
      const k = regionIn(text);
      if (k && !(k === "us" && c.usBlocked)) {
        const regions = [...new Set([...(c.answers.regions ?? []), k])];
        return { ok: true, set: { regions }, next: "regions_more" };
      }
      return { ok: true, set: {}, next: after({}) };
    }
    case "funding": {
      const funding = (r.startsWith("fund:") ? r.slice(5) : fundingIn(text)) as Funding | null;
      return funding ? { ok: true, set: { funding }, next: after({ funding }) } : { ok: false, again: "Tap one: full funding only, partial is fine, or you'll pay yourself." };
    }
    case "start": {
      const term = r.startsWith("term:") ? r.slice(5) : termIn(text);
      return term ? { ok: true, set: { term }, next: after({ term }) } : { ok: false, again: "Tap the intake you want: Fall 2027, Spring 2028 or Fall 2028." };
    }
    case "cv":
      // the file itself arrives as a document or image message (lib/whatsapp-onboard); a typed reply means later
      if (r === "cv:skip" || /^\s*(skip|later|no|not now|i don'?t have)/i.test(text)) return { ok: true, set: { cv: true }, next: "done" };
      return { ok: false, again: "Send your CV as a file or photo here, or tap Skip for now." };
    default:
      return { ok: false, again: "" };
  }
}

// ---- reading what they typed ----

export function nameIn(text: string): string | null {
  const t = text.replace(/^(my name is|i am|i'm|it'?s|name:)\s+/i, "").replace(/[^\p{L}\p{M}' .-]/gu, " ").replace(/\s+/g, " ").trim();
  if (t.length < 2 || t.length > 80 || !/\p{L}/u.test(t) || t.split(" ").length > 6) return null;
  // typed all in small letters: capitalise each name; otherwise keep it as they wrote it
  return t === t.toLowerCase() ? t.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : t;
}
export const firstOf = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] ?? "";

export function levelIn(text: string): Level | null {
  const t = text.toLowerCase();
  if (/\b(phd|ph\.d|doctor|doctoral|dphil)\b/.test(t)) return "phd";
  if (/\b(master|masters|master's|msc|m\.sc|mba|mpa|mph|llm|meng|mres|mphil|ma)\b/.test(t)) return "masters";
  if (/\b(bachelor|bachelors|bachelor's|undergrad|undergraduate|bsc|b\.sc|ba|beng|first degree|degree)\b/.test(t)) return "undergraduate";
  return null;
}

export function fieldsIn(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/,|;|\n|\band\b|\/|&/i)
        .map((f) => f.replace(/^(i want to study|i'd like to study|study|in)\s+/i, "").replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim().toLowerCase())
        .filter((f) => f.length >= 2 && f.length <= 60 && /\p{L}/u.test(f)),
    ),
  ].slice(0, 8);
}

export function countryIn(text: string): string | null {
  const t = text.toLowerCase().replace(/[^\p{L} ]/gu, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const alias: Record<string, string> = { usa: "United States", us: "United States", america: "United States", uk: "United Kingdom", britain: "United Kingdom", uae: "United Arab Emirates", drc: "Democratic Republic of the Congo" };
  if (alias[t]) return alias[t];
  const hit = ORIGINS.find((o) => o.name.toLowerCase() === t || o.demonym?.toLowerCase() === t) ?? ORIGINS.find((o) => t.includes(o.name.toLowerCase()));
  if (hit) return hit.name;
  return t.length >= 3 && t.length <= 56 && t.split(" ").length <= 4 ? t.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : null;
}

const REGION_WORDS: [RegExp, string][] = [
  [/\b(us|usa|u\.s|united states|america|american)\b/, "us"],
  [/\b(canada|canadian)\b/, "canada"],
  [/\b(uk|u\.k|united kingdom|britain|england|scotland|wales|london)\b/, "uk"],
  [/\b(europe|eu|germany|france|netherlands|ireland|italy|spain|sweden|switzerland|finland|denmark|norway|belgium|austria|poland|portugal)\b/, "europe"],
  [/\b(asia|china|japan|korea|singapore|hong kong|malaysia|india|taiwan)\b/, "asia"],
  [/\b(australia|new zealand|nz)\b/, "australia_nz"],
  [/\b(middle east|uae|dubai|qatar|saudi|turkey|israel)\b/, "middle_east"],
  [/\b(africa|south africa|rwanda|ghana|kenya|egypt|morocco)\b/, "africa"],
  [/\b(latin america|brazil|mexico|chile|argentina|colombia)\b/, "latin_america"],
];
export function regionIn(text: string): string | null {
  const t = text.toLowerCase();
  if (REGIONS[t.trim()]) return t.trim();
  return REGION_WORDS.find(([re]) => re.test(t))?.[1] ?? null;
}

export function fundingIn(text: string): Funding | null {
  const t = text.toLowerCase();
  if (/\b(full|fully|scholarship only|only funded)\b/.test(t)) return "full";
  if (/\b(partial|part|some|half)\b/.test(t)) return "partial";
  if (/\b(self|myself|my own|i'?ll pay|parents|family|sponsor)\b/.test(t)) return "self";
  return null;
}

export function termIn(text: string): string | null {
  const t = text.toLowerCase();
  const year = t.match(/\b20(2[6-9])\b/)?.[0];
  const season = /\b(fall|autumn|sept|september|october)\b/.test(t) ? "fall" : /\b(spring|jan|january|february)\b/.test(t) ? "spring" : null;
  if (!season || !year) return null;
  return `${season}-${year}`;
}

// ---- after setup: what a typed word asks for ----

export type Command = "help" | "status" | "shortlist" | "link" | "visa" | "questions";
export function commandOf(text: string): Command | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (/^(help|menu|commands|options|hi|hello|hey)$/.test(t)) return "help";
  if (/^(status|progress|update|updates|where am i|my applications)$/.test(t)) return "status";
  if (/^(shortlist|my shortlist|schools|programmes|programs|matches)$/.test(t)) return "shortlist";
  if (/^(link|login|log in|sign in|signin|dashboard|open ivyward|website)$/.test(t)) return "link";
  if (/^(visa|my visa|visa guide)$/.test(t)) return "visa";
  if (/^(questions|quick questions|cards|form questions)$/.test(t)) return "questions";
  return null;
}

export const HELP = `Ask me anything about your applications here, or type one of these:
*status*: where your applications stand
*shortlist*: your programmes, to start one
*questions*: quick answers your forms need
*link*: a sign-in link to your dashboard
*visa*: your visa steps after an offer
Reply STOP to turn off messages here.`;

// ---- the shortlist in the chat ----

export type ShortApp = { id: string; school: string; program: string; deadline: string | null; status: string };
const shortSchool = (s: string) => s.split(",")[0].replace(/\s*\([^)]*\)/g, "").trim();
const dayOf = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function shortlistOut(apps: ShortApp[], total: number): Out {
  const rows = apps.slice(0, 10).map((a) => ({
    id: `app:${a.id}`,
    title: clip(shortSchool(a.school), 24),
    description: clip(`${a.program}${a.deadline ? `, deadline ${dayOf(a.deadline)}` : ""}${a.status === "preparing" ? ", being prepared" : ""}`, 72),
  }));
  const more = total > rows.length ? ` There are ${total - rows.length} more on your dashboard.` : "";
  return { kind: "list", body: `Your shortlist: ${total} programme${total === 1 ? "" : "s"} your agents checked against your profile. Tap one to see it and start the application.${more}`, button: "See programmes", rows };
}

export type AppDetail = ShortApp & { degree: string | null; fee: number | null; waiver: boolean; tuition: number | null; why: string | null; url: string | null };
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export function appOut(a: AppDetail): Out {
  const lines = [
    `*${shortSchool(a.school)}*`,
    a.program,
    a.deadline ? `Deadline: ${dayOf(a.deadline)}` : "Deadline: not published yet",
    a.fee != null ? `Application fee: ${a.fee ? money(a.fee) : "none"}${a.fee && a.waiver ? " (a waiver is possible)" : ""}` : null,
    a.tuition ? `Tuition: about ${money(a.tuition)} a year` : null,
    a.why ? `Why it fits: ${clip(a.why, 400)}` : null,
  ].filter(Boolean);
  const buttons: Button[] =
    a.status === "shortlisted"
      ? [
          { id: `start:${a.id}`, title: "Start this one" },
          { id: "shortlist", title: "See the others" },
        ]
      : [{ id: "shortlist", title: "See the others" }];
  return { kind: "buttons", body: clip(lines.join("\n"), 1000), buttons };
}

// ---- "status" and "visa" ----

const STATUS_WORD: Record<string, string> = {
  researching: "being checked",
  shortlisted: "on your shortlist",
  preparing: "being prepared",
  ready_for_review: "ready for you to sign",
  packet_approved: "being submitted",
  submitted: "submitted",
  under_review: "with the school",
  interview: "interview stage",
  admitted: "admitted",
  waitlisted: "waitlisted",
  rejected: "not admitted",
  accepted: "you accepted",
};
// active first (what needs them, then what's moving), the shortlist after
const RANK = ["ready_for_review", "admitted", "interview", "preparing", "packet_approved", "submitted", "under_review", "waitlisted", "accepted", "researching", "shortlisted", "rejected"];

export function statusText(apps: { school: string; status: string; deadline: string | null }[], task: { title: string; href: string } | null, site: string): string {
  const live = apps.filter((a) => STATUS_WORD[a.status]).sort((a, b) => RANK.indexOf(a.status) - RANK.indexOf(b.status) || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  if (!live.length) return `No applications yet. Type *shortlist* to see the programmes your agents found${task ? `, or do this next: ${task.title} (${site}${task.href})` : ""}.`;
  const working = live.filter((a) => a.status !== "shortlisted");
  const listed = live.length - working.length;
  const lines = working.slice(0, 8).map((a) => `- ${shortSchool(a.school)}: ${STATUS_WORD[a.status]}${a.deadline && ["preparing", "ready_for_review"].includes(a.status) ? ` (deadline ${dayOf(a.deadline)})` : ""}`);
  return [
    "*Where things stand*",
    ...(lines.length ? lines : ["Nothing in preparation yet."]),
    ...(working.length > 8 ? [`and ${working.length - 8} more on your dashboard`] : []),
    ...(listed ? [`${listed} more on your shortlist: type *shortlist* to start one.`] : []),
    ...(task ? ["", `Next for you: ${task.title}`, `${site}${task.href}`] : []),
  ].join("\n");
}

export function visaText(stage: { title: string; summary: string; steps?: { label: string; done: boolean; href?: string }[]; href?: string } | null, admitted: boolean, site: string): string {
  if (!stage || !admitted) return "Your visa steps start once a school admits you. Got an offer letter? Send it here as a file or photo and your agents will confirm it and set out your visa steps.";
  const steps = (stage.steps ?? []).map((s) => `${s.done ? "Done" : "-"} ${s.label}${s.href && !s.done ? `: ${s.href}` : ""}`);
  return [`*${stage.title}*`, stage.summary, ...(steps.length ? ["", ...steps] : []), ...(stage.href ? ["", `The full guide: ${site}${stage.href}`] : [])].join("\n");
}

// ---- Ivyward AI's and the cards' questions, as taps ----

// Ivyward AI asked something with a few answers: tap one, and the answer goes back to it as if typed
export function askOut(body: string, ask: Pick<Ask, "options" | "kind"> | null, idFor: (option: string, i: number) => string, skip?: string): Out {
  const options = ask?.kind === "yes_no" && !ask.options.length ? ["Yes", "No"] : (ask?.options ?? []);
  const text = clip(body, 1024);
  if (options.length < 2 || options.length > 10 || ask?.kind === "search") return { kind: "text", body };
  const room = skip ? 2 : 3;
  if (options.length <= room && options.every((o) => o.length <= 20)) {
    return { kind: "buttons", body: text, buttons: [...options.map((o, i) => ({ id: idFor(o, i), title: o })), ...(skip ? [{ id: skip, title: "Skip" }] : [])] };
  }
  const rows: Row[] = options.slice(0, skip ? 9 : 10).map((o, i) => ({ id: idFor(o, i), title: clip(o, 24), ...(o.length > 24 ? { description: clip(o, 72) } : {}) }));
  if (skip) rows.push({ id: skip, title: "Skip this one" });
  return { kind: "list", body: clip(body, 4000), button: "Choose an answer", rows };
}
// an answer tapped on Ivyward AI's own question: the option itself, kept short enough for a row id
export const answerId = (option: string) => `ans:${option.slice(0, 190)}`;
// a card's answer: the card and the option's place (the card is looked up again when it comes back)
export const cardId = (id: string, i: number | "skip") => `card:${i}:${id}`;
export function cardReply(reply: string): { id: string; option: number | "skip" } | null {
  const m = reply.match(/^card:(\d+|skip):(.+)$/);
  if (!m) return null;
  return { id: m[2], option: m[1] === "skip" ? "skip" : Number(m[1]) };
}

// WhatsApp shows *one* star as bold; Ivyward AI writes markdown's two
export const waText = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "*$1*").replace(/^#+\s*/gm, "");

// ---- where they are, from their number ----

const CALLING: Record<string, [string, string]> = {
  "234": ["NG", "Africa/Lagos"], "233": ["GH", "Africa/Accra"], "254": ["KE", "Africa/Nairobi"], "27": ["ZA", "Africa/Johannesburg"],
  "20": ["EG", "Africa/Cairo"], "251": ["ET", "Africa/Addis_Ababa"], "256": ["UG", "Africa/Kampala"], "255": ["TZ", "Africa/Dar_es_Salaam"],
  "250": ["RW", "Africa/Kigali"], "260": ["ZM", "Africa/Lusaka"], "263": ["ZW", "Africa/Harare"], "265": ["MW", "Africa/Blantyre"],
  "237": ["CM", "Africa/Douala"], "221": ["SN", "Africa/Dakar"], "225": ["CI", "Africa/Abidjan"], "229": ["BJ", "Africa/Porto-Novo"],
  "228": ["TG", "Africa/Lome"], "232": ["SL", "Africa/Freetown"], "220": ["GM", "Africa/Banjul"], "267": ["BW", "Africa/Gaborone"],
  "264": ["NA", "Africa/Windhoek"], "258": ["MZ", "Africa/Maputo"], "212": ["MA", "Africa/Casablanca"], "216": ["TN", "Africa/Tunis"],
  "213": ["DZ", "Africa/Algiers"], "243": ["CD", "Africa/Kinshasa"], "244": ["AO", "Africa/Luanda"], "231": ["LR", "Africa/Monrovia"],
  "91": ["IN", "Asia/Kolkata"], "92": ["PK", "Asia/Karachi"], "880": ["BD", "Asia/Dhaka"], "94": ["LK", "Asia/Colombo"], "977": ["NP", "Asia/Kathmandu"],
  "62": ["ID", "Asia/Jakarta"], "63": ["PH", "Asia/Manila"], "84": ["VN", "Asia/Ho_Chi_Minh"], "60": ["MY", "Asia/Kuala_Lumpur"], "66": ["TH", "Asia/Bangkok"],
  "86": ["CN", "Asia/Shanghai"], "82": ["KR", "Asia/Seoul"], "90": ["TR", "Europe/Istanbul"], "98": ["IR", "Asia/Tehran"], "964": ["IQ", "Asia/Baghdad"],
  "966": ["SA", "Asia/Riyadh"], "971": ["AE", "Asia/Dubai"], "962": ["JO", "Asia/Amman"], "961": ["LB", "Asia/Beirut"], "998": ["UZ", "Asia/Tashkent"],
  "55": ["BR", "America/Sao_Paulo"], "52": ["MX", "America/Mexico_City"], "57": ["CO", "America/Bogota"], "51": ["PE", "America/Lima"], "56": ["CL", "America/Santiago"],
  "54": ["AR", "America/Argentina/Buenos_Aires"], "44": ["GB", "Europe/London"], "49": ["DE", "Europe/Berlin"], "33": ["FR", "Europe/Paris"], "380": ["UA", "Europe/Kyiv"],
};
export function countryFromPhone(phone: string): { name: string; zone: string } | null {
  for (const n of [3, 2, 1]) {
    const hit = CALLING[phone.slice(0, n)];
    if (hit) {
      const o = ORIGINS.find((x) => x.iso === hit[0]);
      return o ? { name: o.name, zone: hit[1] } : null;
    }
  }
  return null;
}
