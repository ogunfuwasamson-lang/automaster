// the cloud runner's brain: looks at a portal page and decides the next move, then does it.
// no db and no network of its own: everything outside the page comes in through deps, so the same
// engine runs on vercel against browserbase and in tests against a local chromium.
import type { EngineFile, EngineFrame as Frame, EnginePage as Page } from "@/lib/engine-page";
import type { Fill, PageField } from "@/lib/runner-map";
import { cleanLabel } from "@/lib/labels";
import { NEVER_FILL } from "@/lib/never-fill";
import { keyForLabel } from "@/lib/fillsheet";

export interface Snapshot {
  url: string;
  title: string;
  body: string;
  captcha: boolean;
  payment: boolean;
  confirmation: boolean;
  fingerprint: string;
  fields: (PageField & { autocomplete?: string })[];
  allFields: { id: string; label: string; type: string; name?: string; autocomplete?: string; required?: boolean }[];
  buttons: { id: string; label: string; link: boolean; href?: string }[];
  errors?: string[];
}

// an AI call that failed because the AI can't be used (no credit, bad key) ends the run so the job waits for it;
// any other failure falls back as before. without this an outage read as "no answer": runs ended "stuck" (using up
// the page's retry budget) or went on without the AI's choices
const orOutage = <T>(fallback: T) => (e: unknown): T => {
  const msg = String((e as { message?: string })?.message ?? e);
  if ((e as { name?: string })?.name === "AiUnavailable" || /AI is paused until|credit balance is too low|insufficient.?credit|invalid x-api-key|authentication_error/i.test(msg)) throw e;
  return fallback;
};

export interface EngineState {
  steps: number;
  navCalls?: number;
  totalSteps?: number; // across every run on this application
  navHistory?: string[];
  triedMailLogin?: boolean;
  signedIn?: boolean; // a sign-in with the stored login has worked at least once
  missing?: string[]; // fill-sheet keys a portal asked for that the profile doesn't have
  // required portal questions nothing in the profile answers: the interviewer asks the applicant these
  questions?: PortalQuestion[];
  reachedSubmit?: boolean;
  submitClicked?: boolean;
  accountAt?: number; // when we created the portal account (verification emails come after this)
  verifyWaitSince?: number;
  lastFingerprint?: string;
  samePageCount?: number;
  decided?: string[]; // field labels the decide pass has already looked at (so it isn't asked twice)
  visionCalls?: number; // screenshot steps this run
  visionHistory?: string[];
  visited?: string[]; // "apply" links already followed, so a landing page can't send us round in circles
  triedCreate?: boolean;
  // buttons that start or create something (an application, an account), pressed once: never pressed twice
  createClicks?: string[];
  resumeLinkAt?: number; // when the emailed continue-link was last followed
  resumeLinkTries?: number; // emailed continue-links followed on this application (a few at most)
  lookedForReset?: boolean; // looked at the page for a password reset link once
  pressedAsked?: string[]; // buttons pressed because the page's text asked for them, by page
  typedUploads?: string[]; // documents sent through a choose-type-then-upload area, by site
  usernameTries?: number; // usernames the portal said were taken (calgary's eID): the next try adds a number
  signupTries?: number; // times the sign-up form was sent on this run
  restarts?: number; // times this run started again from the portal after the portal ended the session
  passwordChanges?: number; // times this run changed the portal password because the portal asked
  idpBacks?: number; // times this run was sent to a third party's sign-in page and turned back
  hangs?: number;
  navClicks?: number; // clicks the navigator made this run // runs that hit a step which never returned (reset when a run finishes normally)
  createNext?: boolean; // back on the portal's front page to press "Create account" (the saved login never worked)
  wentBackToCreate?: boolean; // went back for that once already
  accountExists?: boolean; // the sign-up page said this email already has an account
  lookups?: number; // peoplesoft "Look Up …" searches done on this run
  newAppBlocked?: string; // a "Start a new application" the once-per-portal rule held back
  newAppAllowedUsed?: boolean; // the applicant said yes to a new one, and it was started
  pdfOnly?: boolean; // the portal said uploads must be PDF
  missingDocs?: string[]; // required uploads the packet has no file for
  lockWaits?: number; // times we waited out "temporarily locked / too many attempts"
  downWaits?: number; // times we waited out maintenance or an outage
  entries?: { edu?: number; work?: number }; // education / work entries already saved through "add another"
  leadBacks?: number; // times this run came back from an enquiry form
  // a rejected password being reset: asked for the email, waiting for it, on the new-password page, done
  reset?: { stage: "requested" | "sent" | "link"; at: number; tries: number };
}

export interface PortalQuestion {
  label: string;
  type: string;
  options?: string[];
  key?: string; // the fill-sheet key it maps to, when we know it (country_of_birth, phone...)
}

function ask(state: EngineState, f: PageField, key?: string) {
  const label = cleanLabel(f.label, f.options).slice(0, 200);
  if (!label) return;
  const list = state.questions ?? [];
  const i = list.findIndex((q) => q.label.toLowerCase() === label.toLowerCase());
  const q: PortalQuestion = { label, type: f.type, ...(f.options?.length ? { options: f.options.filter((o) => o && !/^(select|choose|please|--)/i.test(o.trim())).slice(0, 40) } : {}), ...(key ? { key } : {}) };
  if (i >= 0) list[i] = { ...list[i], ...q, key: key ?? list[i].key };
  else list.push(q);
  state.questions = list.slice(-12);
}

// an upload box (a document to add) or an essay too long for its box: never a question the applicant can type into
function notAQuestion(state: EngineState, f: PageField): boolean {
  if (f.type === "file") {
    state.missingDocs = [...new Set([...(state.missingDocs ?? []), cleanLabel(f.label, f.options).slice(0, 80) || "a required document"])];
    return true;
  }
  const l = cleanLabel(f.label, f.options).slice(0, 50);
  return !!l && (state.missingDocs ?? []).some((m) => m.includes(l));
}

function questionNote(state: EngineState): string {
  const qs = state.questions ?? [];
  if (!qs.length) return missingNote(state.missing ?? []);
  return `the portal asks ${qs.length === 1 ? "something" : `${qs.length} things`} your profile doesn't answer yet: ${qs.slice(0, 3).map((q) => q.label.slice(0, 60)).join("; ")}. Ivyward AI will ask you, and the agents carry on once you answer`;
}

export interface Login {
  login_email: string;
  password: string;
  status?: string; // "created" until a sign-in has worked once
  answers?: string[]; // made-up answers for the account's security questions
}

export interface EngineDeps {
  map(fields: PageField[]): Promise<Fill[]>;
  // pdf: the upload box only takes PDF (Word files are converted)
  file(key: string, want?: { pdf?: boolean }): Promise<EngineFile>;
  canSubmit(): Promise<{ allowed: boolean; reason: string }>;
  existingLogin(): Promise<Login | null>;
  createLogin(email: string): Promise<Login>;
  accountEmail: string;
  // a verification code or link from the applicant's inbox that arrived after `since`; null if none yet
  verification(since: number): Promise<{ code: string | null; link: string | null } | null>;
  canReadMail: boolean;
  // the general fallback: a model reads the page and picks one constrained next step
  navigate?(input: NavInput): Promise<NavAction | null>;
  // fill one field from a fill-sheet key (values never come from the model)
  fillFromKey?(field: PageField, key: string): Fill | null | Promise<Fill | null>;
  // a login this portal emailed to the applicant (peoplesoft-style systems issue their own); saved to the vault
  loginFromMail?(since: number): Promise<Login | null>;
  progress(note: string): Promise<void>;
  // the applicant took the wheel (live browser): stop after the current step
  shouldStop?(): boolean;
  // second opinion on required fields the rules left empty: the model reads the whole fill sheet and the page and
  // picks an option from the field's own list, or a sheet key. it can't type a value of its own.
  decide?(fields: PageField[], page: { url: string; title: string; body: string; errors?: string[] }): Promise<Fill[]>;
  // look at a screenshot and pick one mouse or keyboard step (custom dropdowns, widgets the DOM can't explain)
  see?(input: SeeInput): Promise<SeeAction | null>;
  // the value behind a fill-sheet key, for typing what the screenshot step chose
  sheetValue?(key: string): string | null;
  // password resets: the reset link the portal emailed after `since`, and a new password saved to the vault
  resetLink?(since: number): Promise<string | null>;
  // where the application itself starts (to come back to after a wrong turn)
  portalUrl?: string | null;
  // the link a portal emailed to continue an application it has started ("we've sent you a link to complete the form")
  resumeLink?(): Promise<string | null>;
  // the value behind a profile field, to tell "the profile doesn't have it" from "the portal wouldn't take it"
  hasValue?(label: string): boolean;
  rotatePassword?(): Promise<Login>;
  // for jobs other than a whole application (a webinar registration, a waiver form): what the job is, and how
  // to tell it's finished. the button that completes it counts as "submit" (still checked with canSubmit).
  goal?: string;
  // the document keys that can be uploaded (for the screenshot steps)
  files?(): string[];
  isDone?(s: Snapshot): boolean;
  finalButton?: RegExp;
  // each answer put on the page (the applicant's own chrome shows them, and lists them for review before submit)
  onFilled?(f: { id: string; label: string; action: string; value: string; source?: string }): void;
  // before leaving a page of the form for the next one: false holds the run there ("ask before each page")
  beforeNext?(page: { label: string; title: string; url: string }): Promise<boolean>;
  // the applicant signs in themselves (their password manager fills it): an account that exists is never typed in
  signInYourself?(): boolean;
  // the applicant said yes to "start a new application for this program?" (the one started is for another)
  allowNewApp?(): Promise<boolean>;
}

export interface Mark {
  n: number;
  type: string; // button, a, text, email, select, checkbox, option, combobox...
  label: string;
  value: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface SeeInput {
  image: Uint8Array;
  goal: string;
  url: string;
  history: string[];
  empty: string[]; // required questions still blank
  marks: Mark[]; // numbered on the screenshot
  files: string[]; // document keys that can be uploaded
}
export interface SeeAction {
  action: "click" | "double_click" | "type" | "clear" | "key" | "scroll" | "hover" | "upload" | "back" | "wait" | "done" | "handoff";
  mark: number; // the numbered element to act on (0 when using x/y)
  x: number;
  y: number;
  sheet_key: string; // for type: the fill-sheet key whose value is typed
  text: string; // for type: a shorter part of that value (to search a long list), else ""
  key: string; // for key: Enter, Tab, Escape, ArrowDown, ArrowUp, Space, Backspace, PageDown, PageUp, Home, End
  file: string; // for upload: a document key
  direction: string; // for scroll: up or down
  note: string;
}

export interface NavInput {
  why: string;
  snapshot: Snapshot;
  history: string[];
  signedIn: boolean;
  haveLogin: boolean;
}
export interface NavAction {
  action: "click" | "fill" | "goto" | "wait_email" | "handoff" | "done";
  target_id: string;
  sheet_key: string;
  url: string;
  note: string;
}

export type Outcome =
  | { kind: "submitted"; note: string }
  | { kind: "needs_you"; note: string; reason: "captcha" | "payment" | "question" | "verification" | "stuck" | "login" | "account" | "blocked" | "review" | "stopped" | "documents" | "closed" }
  | { kind: "wait"; note: string; seconds: number } // try again later (e.g. waiting for the verification email)
  | { kind: "continue"; note: string } // out of time in this run; pick up straight away
  | { kind: "failed"; note: string };

const FINAL = /^(submit( (my|the|your))?( application)?|submit (and|&) pay|sign (and|&) submit|submit now|final submit)$/i;
const NEXT = /^(save (and|&) (continue|next)|next( page| section| step)?|continue( to .{0,30})?|proceed|save (and|&) proceed|go to next|save and go to next|suivant|continuer)\b/i;
const START = /^(start|begin|continue|resume) (my |an |your |a new |new )?application\b.{0,20}$|^apply( now| online| today| here)?( for (this|the) program.{0,30})?$|^start( here| now)?$|^(how to )?apply to (this|the) program$/i;
const CREATE = /^((create|register|sign up)( for| an| a| new| my| your)*( account| profile| login| here| e-?id| user ?id| username| applicant account)?|new (user|applicant)s?|first.?time (user|applicant)s?.*|create (a )?login|(get|request) (an? )?(e-?id|account))[?!.]*$/i;
const SIGNIN = /^(sign in|log ?in|login|continue|next|submit)$/i;
const CREATE_SUBMIT = /^(create( (an |my )?account)?|register|sign up|continue|submit|next|(set|save|create|update|change|choose) (my |your |a )?password|save|activate( (my )?account)?|finish|complete( registration)?|confirm)$/i;
const LEAD_PAGE = /request[-_ ]?(more[-_ ])?info(rmation)?|\b(rfi|inquiry|enquiry|enquire|inquire|brochure|newsletter|subscribe|contact[-_ ]us|stay[-_ ]in[-_ ]touch|keep[-_ ]me[-_ ]informed)\b/i;
const CREATE_LOOSE = /^(create|register|sign ?up|submit|continue|next|proceed|save|activate|finish|complete|confirm|get started|join|request)\b.{0,40}$|\b(create|register)\b.{0,20}\b(account|e-?id|profile|login|user)\b/i;
const VERIFY_BTN = /^(verify|confirm|submit|continue|next|activate|log ?in|login|sign in)$/i;
const CHANGE_PW = /(change (your )?password|must change|password (has )?expired|choose a new password|changer (votre )?mot de passe|nouveau mot de passe)/i;
const SIGNUP_WORDS = /(create (an |your )?account|register|sign up|new user|confirm password|re-?enter password)/i;
const CHECK_EMAIL = /(check your (e-?mail|inbox)|verify your e-?mail|we('ve| have) sent (you )?(an? )?(e-?mail|code|link)|activation (link|e-?mail)|confirm your e-?mail)/i;
const CODE_LABEL = /(verification|security|confirmation|access|one.?time|activation)?\s*(code|pin|otp|passcode)\b/i;
const REGISTER_PAGE = /(regist|create.?(an.?)?account|sign.?up|new.?user)/i;
const LOGIN_LINK = /^(log ?in|login|sign ?in)( here| now)?$|^returning (users?|applicants?)/i;
const FORGOT = /(forgot|forgotten|reset|lost|recover|change)\b.{0,25}(password|login|details|credentials|pin)|(password|login) (reset|recovery|help)|trouble (signing|logging) in|can'?t (sign|log) ?in/i;
const RESET_BTN = /^(send|reset|submit|continue|next|request|email me|recover|go|ok|confirm)\b/i;
const NO_ACCOUNT = /(no (account|user|record)s? (was |were )?(found|exists?|matches|associated)|(not|isn'?t) (found|registered|recogni[sz]ed)|does(n'?t| not) (exist|match)|unknown (user|email|account))/i;
// links that start an application, strongest first. "how to apply" pages are worth opening when nothing better is there.
const APPLY_STRONG = /^(apply( now| online| today| here| directly)?( for (this|the) (program(me)?|course|degree))?|start (my |an |your |a new |new |the )?application|begin (my |an |your )?application|online application( form| portal| system)?|application (portal|form|system)|apply (via|through|using) .{2,30}|submit (an|your) application|apply to (this|the) (program(me)?|course)|(go to|access) (the )?(online )?application( portal)?)\b/i;
const APPLY_WEAK = /\b(how to apply|apply|applying|application process|admissions? process|ready to apply)\b/i;
const NOT_APPLY = /\b(news|events?|blog|podcast|webinars?|open days?|visit|tour|chat|faq|request (info|information|a prospectus)|brochure|prospectus|fees?|funding|accommodation|housing|jobs?|careers?|vacanc|staff|alumni|donate|giving|search|menu|cookies?|privacy)\b/i;

// sign-in buttons come in many wordings: "Graduate Applicant Login", "Applicant Log In", "Returning users",
// "Existing applicants", "Already have an account?", "Access your application", "Log on". anything that says
// sign in counts, unless it's somebody else's door (staff, faculty, recommenders, current students), a
// third-party account (Google, LinkedIn...), or the opposite action (sign up, log out, reset).
const SIGN_WORDS = /\b(log ?-?in|login|log ?on|logon|sign ?-?in)\b|^(returning|existing) (users?|applicants?|accounts?)\b|already (have|registered|created)( an)? account|access (my|your) (application|account|portal)/i;
const NOT_MINE = /\b(sign ?-?up|register|create|new (user|applicant)|log ?out|sign ?out|faculty|staff|employees?|recommend(er|ers|ation)|referees?|reviewers?|admin(istrator)?|current students?|alumni|partners?|agents?|counsell?ors?|google|facebook|linkedin|apple|microsoft|github|forgot|reset|help|trouble)\b/i;
export function isSignIn(label: string): boolean {
  const l = label.replace(/\s+/g, " ").trim();
  return l.length > 0 && l.length <= 48 && SIGN_WORDS.test(l) && !NOT_MINE.test(l);
}
export const CREATE_RE = CREATE;
const findBy = (s: Snapshot, ok: (label: string) => boolean) => s.buttons.find((b) => ok(clean(b.label)) && goesSomewhere(s, b));
// bot walls that stand in front of the whole site (cloudflare, imperva, akamai): a real browser usually gets
// through in a few seconds, a cloud browser often never does
const BLOCK_TITLE = /^(access denied|forbidden|403\b|request (blocked|rejected)|attention required|just a moment|pardon our interruption|are you a (robot|human)|you have been blocked|blocked)/i;
const BLOCK_BODY = /(unusual traffic from your|automated (requests|queries|access)|request (was|has been) (blocked|rejected)|verify (that )?you are (a )?human|checking (if the site connection is secure|your browser before)|enable javascript and cookies to continue|performing security verification|verif(y|ies) (that )?you are not a bot|security service to protect against malicious bots)/i;
export const isBlockPage = (s: Pick<Snapshot, "title" | "body">) => BLOCK_TITLE.test(s.title.trim()) || BLOCK_BODY.test(s.body.slice(0, 800));
const TERMS = /(i (have read and )?(agree|accept)|i confirm (that )?i have read|accept to continue|terms (of use|and conditions|of service)|privacy (policy|notice)|data protection (statement|policy|notice))/i;

// a box to type an emailed code into: a text box labelled as one. not a yes/no question ("do you have a quebec
// permanent code?" made mcgill's identification page look like a code page, and a code was nearly typed into it),
// and not the other codes forms ask for
export function isCodeBox(f: { type: string; label: string }) {
  return /^(text|tel|number|search|)$/.test(f.type) && CODE_LABEL.test(f.label) && !/zip|postal|area|country|permanent|course|program|programme|subject|school|institution|promo|discount|coupon|referral|invite|tax|sort|swift|bank|do you have|have you/i.test(f.label);
}

// pure: what kind of page is this?
export function classify(s: Snapshot): "confirmation" | "captcha" | "payment" | "login" | "signup" | "verify_code" | "check_email" | "form" {
  if (s.confirmation) return "confirmation";
  // slate's invisible recaptcha can't make a token in the cloud browser: "Error generating captcha token" (bu,
  // brandeis). that's a bot check, so the run moves to the applicant's chrome, where it passes
  if (s.captcha || /error generating captcha token|captcha (verification|validation) failed|recaptcha (verification )?failed/i.test(`${s.body.slice(0, 4000)} ${(s.errors ?? []).join(" ")}`)) return "captcha";
  if (s.payment) return "payment";
  const pw = s.allFields.filter((f) => f.type === "password");
  const code = s.allFields.find((f) => isCodeBox(f));
  if (pw.length >= 2 || (pw.length === 1 && SIGNUP_WORDS.test(s.body.slice(0, 3000)) && s.allFields.length >= 4)) return "signup";
  if (pw.length === 1) return "login";
  if (code && s.allFields.length <= 3) return "verify_code";
  if (CHECK_EMAIL.test(s.body) && s.fields.length <= 1) return "check_email";
  return "form";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// some portals (peoplesoft, older systems) put the form inside a frame: work in whichever frame holds it
const active = new WeakMap<Page, Frame>();
const frameOf = (page: Page): Frame => active.get(page) ?? page.mainFrame();

async function snapFrame(f: Frame): Promise<Snapshot | null> {
  try {
    await f.helper();
    return await f.evaluate(() => (window as unknown as { __am: { snapshot(): Snapshot } }).__am.snapshot(), undefined);
  } catch {
    return null; // cross-origin ad frames and the like
  }
}

// a page mid-navigation has no document to read: wait for it to settle, then treat it as blank
async function snapMain(page: Page): Promise<Snapshot> {
  for (let i = 0; i < 3; i++) {
    const s = await snapFrame(page.mainFrame());
    if (s) return s;
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
    await sleep(800);
  }
  const url = await page.url();
  return { url, title: "", body: "", captcha: false, payment: false, confirmation: false, fingerprint: `blank:${url}`, fields: [], allFields: [], buttons: [] };
}

// the last alert-box messages per page, kept until the page moves on
const recentDialogs = new WeakMap<Page, string[]>();
async function snap(page: Page): Promise<Snapshot> {
  const main = await snapMain(page);
  let best: { f: Frame; s: Snapshot } = { f: page.mainFrame(), s: main };
  const score = (x: Snapshot) => x.allFields.length * 3 + x.buttons.length;
  let confirmation = main.confirmation;
  let captcha = main.captcha;
  for (const f of await page.frames()) {
    if (f.isMain || !f.url().startsWith("http")) continue;
    const s = await snapFrame(f);
    if (!s) continue;
    confirmation ||= s.confirmation;
    captcha ||= s.captcha;
    if ((s.allFields.length || s.buttons.length > main.buttons.length) && score(s) > score(best.s)) best = { f, s };
  }
  active.set(page, best.f);
  // a message in an alert box is the portal saying what's wrong: treat it as an error on the page
  const said = page.dialogs?.() ?? [];
  if (said.length) recentDialogs.set(page, said);
  const shown = recentDialogs.get(page) ?? [];
  // page-level signals (bot checks, confirmations) count from any frame
  return { ...best.s, captcha, confirmation, title: main.title || best.s.title, ...(shown.length ? { errors: [...(best.s.errors ?? []), ...shown], body: `${shown.join(" ")} ${best.s.body}` } : {}) };
}

// a peoplesoft lookup ("Look Up Country"): its own frame holds a search box and a Look Up button. type the profile's
// value for what's being looked up, search, and press the matching result. false when it can't
async function lookUp(page: Page, deps: EngineDeps, title: string): Promise<boolean> {
  const what = title.replace(/^\s*look ?up\s*/i, "").trim();
  const key = keyForLabel(what) ?? keyForLabel(`${what} *`);
  if (!what || !key) return false;
  for (const f of await page.frames()) {
    const s = await snapFrame(f);
    if (!s) continue;
    const box = s.allFields.find((x) => x.type === "text" && /\b(description|descr|search|name)\b/i.test(`${x.label} ${x.name ?? ""}`));
    const go = s.buttons.find((b) => /^(look ?up|search|find)$/i.test(clean(b.label)));
    if (!box || !go) continue;
    const fill = await deps.fillFromKey!({ ...box, label: what }, key);
    if (!fill || fill.action !== "fill") return false;
    active.set(page, f);
    await fillText(page, box.id, fill.value);
    await click(page, go.id);
    await settle(page);
    const after = await snapFrame(f);
    const want = fill.value.toLowerCase().replace(/\s+/g, " ").trim();
    const label = (b: { label: string }) => clean(b.label).toLowerCase();
    const hit = after?.buttons.find((b) => label(b) === want) ?? after?.buttons.find((b) => label(b).startsWith(want) && label(b).length <= want.length + 20);
    if (!hit) return false;
    await click(page, hit.id);
    await settle(page);
    return true;
  }
  return false;
}

async function click(page: Page, id: string) {
  const sel = `[data-am-id="${id}"]`;
  // "start your application" links often open a new tab: follow them here instead
  const href = await frameOf(page)
    .evaluate((q) => {
      const id = q.match(/data-am-id="([^"]+)"/)?.[1] ?? "";
      const a = ((window as unknown as { __am?: { byId?(i: string): Element | null } }).__am?.byId?.(id) ?? document.querySelector(q)) as HTMLAnchorElement | null;
      return a && a.tagName === "A" && a.target && a.target !== "_self" && /^https?:/.test(a.href) ? a.href : null;
    }, sel)
    .catch(() => null);
  if (href) {
    await page.goto(href, { timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await sleep(1200);
    return;
  }
  try {
    await Promise.all([page.waitForLoadState("domcontentloaded").catch(() => {}), frameOf(page).click(sel, { timeout: 8_000 })]);
  } catch {
    // something overlaps the button (peoplesoft's invisible layers, cookie bars): press it directly
    await frameOf(page).evaluate((i) => (((window as unknown as { __am?: { byId?(x: string): Element | null } }).__am?.byId?.(i) ?? document.querySelector(`[data-am-id="${i}"]`)) as HTMLElement | null)?.click(), id);
  }
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await sleep(1200);
}

// a box the page redrew away while typing (peoplesoft, salesforce re-render on every change) isn't a failed run:
// the next pass finds it again. anything else is still an error
async function fillText(page: Page, id: string, value: string) {
  try {
    await frameOf(page).fill(`[data-am-id="${id}"]`, value, { timeout: 10_000 });
  } catch (e) {
    if (/detached|Timeout \d+ms exceeded|not attached|not visible/i.test(String((e as Error)?.message ?? e))) throw new Redrawn();
    throw e;
  }
}
// identity providers: their sign-in and recovery pages are never part of a school application here
export const IDP_HOST = /(^|\.)(login\.microsoftonline\.com|login\.live\.com|account\.live\.com|account\.microsoft\.com|accounts\.google\.com|myaccount\.google\.com|appleid\.apple\.com|idmsa\.apple\.com|login\.yahoo\.com|facebook\.com|linkedin\.com|okta\.com|auth0\.com)$/i;
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
};

// the portal ended the session: the page is a dead end, not a step to work on
export const DEAD_END = /an error has occurred that has stopped this transaction|(your |the )?session (has )?(timed out|expired)|has timed out due to inactivity|this page has expired|page (is )?no longer (valid|available)/i;

// "this eID is already taken", "username not available" (not an email that's registered already: that account exists)
// a refused sign-in, in the words portals use ("Unknown user ID or password": hec montréal's peoplesoft)
export const LOGIN_REFUSED = /\b(invalid|incorrect|wrong|not recogni[sz]ed|unrecogni[sz]ed|unknown (user|login|e-?mail|account|username|id)|failed|does not exist|doesn't exist|no account|not match|identifiant (inconnu|invalide)|mot de passe (invalide|incorrect))/i;

// the sign-up said the email has an account already (not "Already have an account? Sign in", which every sign-up shows)
export const EMAIL_EXISTS = /\b(e-?mail|email address|courriel)\b[^.!?]{0,80}\b(is |has )?(already )(been )?(registered|in use|used|taken|assigned|associated|linked|on file|exists?)\b|\b(an )?account (with|for|using) (this|that|the) e-?mail( address)? (already )?exists|\b(e-?mail|courriel)\b[^.!?]{0,60}\bdéjà (utilisé|associé|enregistré)/i;

// "too many attempts, try again in 30 minutes", "account temporarily locked" (brandeis)
export const LOCKED = /\b(temporarily (blocked|locked|disabled|suspended)|too many (failed |unsuccessful |login |sign-?in )?(attempts|tries|requests)|account (has been |is )?(temporarily )?(locked|blocked)|try again (in|after) \d+\s*(min|hour)|rate limit(ed)?)\b/i;
export function lockMinutes(text: string): number {
  const m = text.match(/(?:in|after)\s+(\d+)\s*(min|minute|hour|hr)/i);
  if (!m) return 30;
  const n = Number(m[1]) * (/^h/i.test(m[2]) ? 60 : 1);
  return Math.min(Math.max(n + 2, 5), 24 * 60);
}
// the portal is down for maintenance or erroring for everyone: come back later
export const DOWN = /\b(scheduled maintenance|undergoing maintenance|down for maintenance|temporarily unavailable|service unavailable|503 service|502 bad gateway|504 gateway|site is currently (down|offline|unavailable)|system is (currently )?(unavailable|offline|down))\b/i;
// the intake is closed, or not open yet: nothing the agents can do on the portal until it opens
export const CLOSED = /\b(applications? (are|is) (now )?closed|(application )?deadline (has )?passed|no longer (accepting|taking) applications|not (currently |yet )?(accepting|open for) applications|applications? (will )?(open|opens) (on|in)\b|this (term|intake|program(me)?) is (closed|not available))/i;
// the portal says it already has this application
export const ALREADY_SUBMITTED = /\b(you have already submitted|application (has )?already been submitted|already submitted (an|this|your) application)\b/i;
// an upload box that only takes PDF, said in words
export const PDF_ONLY = /\b(only pdf|pdf (files? )?only|must be (in )?(a )?pdf|upload (a |your )?pdf|accepted (file )?(format|type)s?:? pdf\b(?!\s*,)|file type (is )?not (allowed|supported|accepted)|invalid file (type|format))/i;
// a name the portal's file check will take: plain letters, numbers, dots, dashes; at most 60 characters
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 6) : "";
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^[_.]+|[_.]+$/g, "");
  return `${(base || "document").slice(0, 60 - ext.length)}${ext}`;
}
// "Add another qualification", "Save and add another job": a repeating section asks for its next entry
export const ADD_ANOTHER = /^(add|save and add|add (an)?other|add new|\+)\s*(another|more|new|an?)?\s*(education|qualification|school|institution|degree|academic|employment|work|job|experience|position|employer)\b|^add another$/i;
const entryKind = (label: string): "edu" | "work" | null => (/(education|qualification|school|institution|degree|academic)/i.test(label) ? "edu" : /(employment|work|job|experience|position|employer)/i.test(label) ? "work" : null);

export const USERNAME_TAKEN = /^(?!.*e-?mail).*((user ?name|e-?id|user ?id|login( ?id| ?name)?|account name)\b.{0,60}\b(already (been )?(taken|exists?|in use|registered|used)|(is )?(not available|unavailable|taken))|already (taken|in use))/i;

// the box that holds the username on a sign-up form
function usernameBox(s: Snapshot) {
  return s.allFields.find((f) => f.type !== "password" && f.type !== "email" && !/e-?mail/i.test(f.label) && /\b(user ?name|e-?id|user ?id|login ?(id|name))\b/i.test(`${f.label} ${f.name ?? ""}`));
}

async function valueOf(page: Page, id: string): Promise<string> {
  return frameOf(page)
    .evaluate((i: string) => String(((window as unknown as { __am?: { byId?(x: string): Element | null } }).__am?.byId?.(i) as HTMLInputElement | null)?.value ?? ""), id)
    .catch(() => "");
}

// "samson.ogunfuwa" -> "samson2.ogunfuwa" (the number before the last name), "samsono" -> "samsono2"
export function withNumber(name: string, n: number): string {
  const dot = name.lastIndexOf(".");
  if (dot > 0) return `${name.slice(0, dot).replace(/\d+$/, "")}${n}${name.slice(dot)}`;
  return `${name.replace(/\d+$/, "")}${n}`;
}

class Redrawn extends Error {
  constructor() {
    super("the page redrew the box while it was being filled");
  }
}

// bilingual portals label buttons "Log in / Ouvrez une session": match on the first language
const clean = (l: string) => l.replace(/[\u2190-\u21ff\u2794-\u27bf›»<>←→]+/g, " ").split(/\s+\/\s+|\s+\|\s+/)[0].replace(/\s+/g, " ").trim();
// a link back to the page we're on ("Apply Now" in the menu of the apply page) goes nowhere: skip it
const here = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "");
const goesSomewhere = (s: Snapshot, b: { href?: string }) => !b.href || /^javascript:/i.test(b.href) ? true : here(b.href) !== here(s.url);
const find = (s: Snapshot, re: RegExp, linksOnly = false) => s.buttons.find((b) => re.test(clean(b.label)) && (!linksOnly || b.link) && goesSomewhere(s, b));

// "Create account" is often a tab or a link back to the same page (href="#", a javascript toggle): those count
// here, unlike in the general finder, which skips links that go nowhere
const findCreate = (s: Snapshot) => s.buttons.find((b) => CREATE.test(clean(b.label)));
const findForgot = (s: Snapshot) => s.buttons.find((b) => clean(b.label).length <= 60 && FORGOT.test(clean(b.label)));

// the best link toward starting an application on a school or program page, or nothing worth following
export function bestApply(s: Snapshot, visited: string[] = []): Snapshot["buttons"][number] | undefined {
  let best: { b: Snapshot["buttons"][number]; score: number } | undefined;
  for (const b of s.buttons) {
    const l = clean(b.label);
    if (!l || l.length > 70 || !goesSomewhere(s, b)) continue;
    if (b.href && visited.includes(here(b.href))) continue;
    let score = APPLY_STRONG.test(l) ? 10 : START.test(l) ? 9 : APPLY_WEAK.test(l) ? 3 : 0;
    if (!score) continue;
    if (NOT_APPLY.test(l)) score -= 8;
    if (b.href && /(^|[./])(apply|applygrad|gradapply|admissions?|application|portal|slate|ucas|enligne|register)[./-]/i.test(b.href.replace(/^https?:\/\//, ""))) score += 3;
    if (!best || score > best.score) best = { b, score };
  }
  return best && best.score >= 3 ? best.b : undefined;
}

// a button the page's own text tells the applicant to press ('Remember to "Save Education"', 'click "Add"'),
// visible and not pressed yet on this page
const ASKED_BUTTON = /\b(?:remember to|please|you must|make sure (?:you|to)|click|press|select|use)\s+(?:the\s+)?["“'‘]([^"”'’]{3,40})["”'’]/gi;
export function namedButton(s: Snapshot, state: EngineState): Snapshot["buttons"][number] | undefined {
  const text = s.body.slice(0, 8000) + " " + (s.errors ?? []).join(" ");
  const asked = [...text.matchAll(ASKED_BUTTON)].map((m) => m[1].trim().toLowerCase());
  // "ADDRESS1 is required" with an "Add Address" link on the page: the address is entered through that link
  for (const m of text.matchAll(/\b([a-z]+?)\d*\s+(?:is|are)\s+required\b/gi)) {
    const word = m[1].toLowerCase();
    if (word.length < 4) continue;
    const add = s.buttons.find((b) => new RegExp(`^(add|enter|update|edit)( an?| your| new)? ${word}`, "i").test(clean(b.label)));
    if (add) asked.push(clean(add.label).toLowerCase());
  }
  if (!asked.length) return undefined;
  // once per page, and again after something else was chosen on it: ut dallas asks for "Next" once an existing
  // application is picked, and "Next" pressed before the pick had used up the one press
  const key = `${(state.lastFingerprint ?? "").slice(0, 60)}#${state.navClicks ?? 0}`;
  const done = new Set(state.pressedAsked ?? []);
  const b = s.buttons.find((x) => asked.includes(clean(x.label).toLowerCase()) && !done.has(`${key}|${clean(x.label).toLowerCase()}`) && !DANGEROUS.test(x.label) && !FINAL.test(clean(x.label)));
  if (b) state.pressedAsked = [...done, `${key}|${clean(b.label).toLowerCase()}`].slice(-30);
  return b;
}

const SEC_Q = /\b(security|secret|memorable|challenge)?\s*question\b/i;
const SEC_A = /\b(security|secret|memorable|challenge)?\s*answer\b/i;
// fill a sign-up form's security questions: pick a different question in each list, type the made-up answers.
// returns the ids it filled
// a box for a security answer. "Your answer: Enter your answer to question 3" (calgary) names a question too: it's
// still an answer box, as long as "answer" comes before "question"
export const isSecAnswer = (label: string) => SEC_A.test(label) && (!SEC_Q.test(label) || /\banswer\b[\s\S]*\bquestion\b/i.test(label));

export async function securityQuestions(page: Page, fields: PageField[], login: Login): Promise<string[]> {
  const qs = fields.filter((f) => f.type === "select" && SEC_Q.test(f.label) && (f.options?.length ?? 0) > 1);
  const as = fields.filter((f) => (f.type === "text" || f.type === "password") && isSecAnswer(f.label));
  if ((!as.length && !qs.length) || !login.answers?.length) return [];
  const done: string[] = [];
  const used = new Set<string>();
  for (const [i, q] of qs.entries()) {
    // "Question 3" takes the third real option, so questions chosen on different passes (the form reloads after
    // each choice) never repeat one another
    const real = (q.options ?? []).filter((o) => o.trim() && !/^(select|choose|please|--|-)/i.test(o.trim()));
    const n = Number((q.label.match(/\d+/) ?? [])[0]);
    const want = Number.isFinite(n) && n > 0 ? n - 1 : i;
    const pick = [...real.slice(want % Math.max(real.length, 1)), ...real].find((o) => !used.has(o));
    if (!pick) continue;
    used.add(pick);
    if (await frameOf(page).evaluate((x) => (window as unknown as { __am: { apply(f: unknown): boolean } }).__am.apply(x), { id: q.id, action: "choose", option: pick, source: "security" }).catch(() => false)) done.push(q.id);
  }
  // choosing a question reloads the form on some portals (peoplesoft): find the answer boxes again once it settles
  if (done.length) {
    await sleep(2500);
    const again = (await snap(page)).fields.filter((f) => (f.type === "text" || f.type === "password") && isSecAnswer(f.label));
    as.splice(0, as.length, ...again);
  }
  for (const [i, a] of as.entries()) {
    // "Answer 3" gets the third answer whichever boxes are still empty, so the list under Your portal login matches
    const n = Number((a.label.match(/\d+/) ?? [])[0]);
    const k = Number.isFinite(n) && n > 0 ? n - 1 : i;
    // a box that disappears mid-fill (the page redrew again) is picked up on the next pass, not a failed run
    if (await fillText(page, a.id, login.answers[k % login.answers.length]).then(() => true, () => false)) done.push(a.id);
  }
  return done;
}

const DOC_TYPES: [RegExp, (key: string) => boolean][] = [
  [/\b(cv|curriculum vitae|r[eé]sum[eé])\b/i, (k) => k === "cv"],
  [/\btranscript|academic record|marks? sheet/i, (k) => k === "transcript"],
  [/\bdegree (certificate|award)|\bcertificate\b|\bdiploma\b/i, (k) => k === "degree_cert"],
  [/\b(english|ielts|toefl|pte|duolingo|test (score|result))/i, (k) => k === "test_score"],
  [/\b(personal statement|statement of purpose|supporting statement|motivation|research proposal)/i, (k) => k.startsWith("essay:")],
];
const UPLOAD_GO = /^(go|upload|add|attach|upload (file|document)|add (file|document)|save document)$/i;
// one document through a "choose the type, pick the file, press Go" area (stirling and many SITS portals).
// returns 1 when it uploaded one, 0 when the page has no such area or every document it can send went in
export async function uploadByType(page: Page, deps: EngineDeps, s: Snapshot, state: EngineState): Promise<number> {
  const box = s.allFields.find((f) => f.type === "file");
  const go = s.buttons.find((b) => UPLOAD_GO.test(clean(b.label)));
  const list = s.fields.find((f) => f.type === "select" && (f.options ?? []).filter((o) => DOC_TYPES.some(([re]) => re.test(o))).length >= 2);
  const keys = deps.files?.() ?? [];
  if (!box || !go || !list || !keys.length) return 0;
  const host = (() => {
    try {
      return new URL(s.url).hostname;
    } catch {
      return "";
    }
  })();
  const done = new Set(state.typedUploads ?? []);
  for (const [re, fits] of DOC_TYPES) {
    const key = keys.find((k) => fits(k) && !done.has(`${host}|${k}`));
    const option = (list.options ?? []).find((o) => re.test(o));
    if (!key || !option) continue;
    state.typedUploads = [...done, `${host}|${key}`].slice(-40);
    await deps.progress(`uploading your ${option.toLowerCase()}`);
    await frameOf(page).evaluate((x) => (window as unknown as { __am: { apply(f: unknown): boolean } }).__am.apply(x), { id: list.id, action: "choose", option, source: key }).catch(() => false);
    await sleep(800);
    // choosing a type can redraw the area: look again for the file box and the button
    const after = await snap(page);
    const box2 = after.allFields.find((f) => f.type === "file") ?? box;
    const go2 = after.buttons.find((b) => UPLOAD_GO.test(clean(b.label))) ?? go;
    await frameOf(page).setInputFiles(`[data-am-id="${box2.id}"]`, await deps.file(key));
    await sleep(500);
    await click(page, go2.id);
    await sleep(2500);
    return 1;
  }
  return 0;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// "2000-12-31" in the format the page asks for: a format written out (dd/mm/yyyy, MM-DD-YYYY), or an example date
// whose first number can't be a month ("Example date: 12/31/2000" is month first; "31/12/2000" is day first)
export function dateAs(iso: string, context: string): string {
  const [y, m, d] = iso.split("-");
  const spelled = context.match(/\b(dd|mm|yyyy)([\/.\- ])(dd|mm)\2(yyyy|yy|dd)\b/i);
  if (spelled) {
    const parts = [spelled[1], spelled[3], spelled[4]].map((p) => p.toLowerCase());
    const val = (p: string) => (p === "dd" ? d : p === "mm" ? m : p === "yy" ? y.slice(2) : y);
    return parts.map(val).join(spelled[2]);
  }
  const ex = context.match(/\b(?:example|e\.g\.|eg|format|for example)[^0-9]{0,20}(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4})\b/i);
  if (ex) {
    const first = Number(ex[1]);
    const second = Number(ex[3]);
    if (second > 12) return [m, d, y].join(ex[2]);
    if (first > 12) return [d, m, y].join(ex[2]);
  }
  // peoplesoft (urls with /psc/ or /psp/) reads dates as 12/31/2000 unless the page says otherwise, and checks
  // every box on each of its reloads, so a date in another format errors before the form is even sent
  if (/\/ps[cp]\//i.test(context)) return [m, d, y].join("/");
  return iso;
}

// the page says it couldn't read a date ("does not understand the date you entered. Example date: 12/31/2000"):
// the date boxes that already hold one get typed again, now that the page shows its format
const DATE_COMPLAINT = /(does not understand the date|invalid date|not a valid date|enter a valid date|date (is )?(invalid|in the wrong format)|date format)/i;
function dateRedo(s: Snapshot, already: PageField[]): PageField[] {
  if (!DATE_COMPLAINT.test(`${s.body.slice(0, 4000)} ${(s.errors ?? []).join(" ")}`)) return [];
  const have = new Set(already.map((f) => f.id));
  return s.allFields.filter((f) => f.type === "text" && /\b(date|birth|dob)\b/i.test(f.label) && !have.has(f.id)) as PageField[];
}

// true (and noted) the first time an application is started in this portal; false after that
function markNewApp(state: EngineState, label: string): boolean {
  if ((state.createClicks ?? []).some((c) => NEW_APP.test(c.split("|").pop() ?? ""))) return false;
  state.createClicks = [...(state.createClicks ?? []), `${(state.lastFingerprint ?? "").slice(0, 60)}|${label}`].slice(-30);
  return true;
}

export const VISION_BUDGET = 60; // screenshot steps per run
const VISION_KEYS = new Set(["Enter", "Tab", "Shift+Tab", "Escape", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Space", "Backspace", "Delete", "PageDown", "PageUp", "Home", "End"]);
type AM = { __am: { marks(draw: boolean): Mark[]; clearMarks(): void; sig(): string; at(x: number, y: number): { label: string; tag?: string } | null; selectAt(x: number, y: number, v: string): { chose?: string; options?: string[] } | null } };

// the eyes and hands: look at the page as a person would (with numbered marks on everything clickable) and take up
// to `max` small steps toward `goal`. what's typed comes from the fill sheet only; clicks are checked against what's
// under the pointer; after each step the engine notes whether the screen changed, so the next look can adapt.
async function visionLoop(page: Page, deps: EngineDeps, state: EngineState, goal: string, empty: string[], max = 10): Promise<{ acted: boolean; outcome?: Outcome }> {
  if (!deps.see || !page.screenshot || !page.mouseClick) return { acted: false };
  let acted = false;
  let idle = 0; // steps in a row that changed nothing
  const log = (t: string) => (state.visionHistory = [...(state.visionHistory ?? []), t].slice(-14));
  const main = page.mainFrame();
  const sig = () => main.evaluate(() => (window as unknown as AM).__am.sig(), undefined).catch(() => "");
  for (let i = 0; i < max && (state.visionCalls ?? 0) < VISION_BUDGET && idle < 3; i++) {
    if (deps.shouldStop?.()) break;
    state.visionCalls = (state.visionCalls ?? 0) + 1;
    await main.helper().catch(() => {});
    const marks = await main.evaluate(() => (window as unknown as AM).__am.marks(true), undefined).catch(() => [] as Mark[]);
    const image = await page.screenshot().catch(() => null);
    await main.evaluate(() => (window as unknown as AM).__am.clearMarks(), undefined).catch(() => {});
    if (!image) break;
    const a = await deps.see({ image, goal, url: await page.url(), history: (state.visionHistory ?? []).slice(-10), empty, marks, files: deps.files?.() ?? [] }).catch(orOutage(null));
    if (!a || a.action === "done") break;
    if (a.action === "handoff") {
      log(`handoff: ${a.note}`);
      const reason = /cloudflare|just a moment|security (check|verification)/i.test(a.note) ? "blocked" : /captcha|robot|human|bot check/i.test(a.note) ? "captcha" : /\b(pay|payment|fee|card)\b/i.test(a.note) ? "payment" : "stuck";
      return { acted, outcome: { kind: "needs_you", reason, note: a.note.slice(0, 280) } };
    }
    const m = a.mark ? marks.find((x) => x.n === a.mark) : undefined;
    const x = m ? m.x : a.x;
    const y = m ? m.y : a.y;
    const what = m ? `${m.type} "${m.label.slice(0, 40)}"` : `${Math.round(x)},${Math.round(y)}`;
    const before = await sig();
    if (["click", "double_click", "type", "clear", "upload", "hover"].includes(a.action)) {
      if (!m && !(x > 0 && y > 0)) {
        log(`no target for ${a.action}`);
        idle++;
        continue;
      }
      const under = await main.evaluate((p: { x: number; y: number }) => (window as unknown as AM).__am.at(p.x, p.y), { x, y }).catch(() => null);
      const label = clean(under?.label || m?.label || "");
      if ((a.action === "click" || a.action === "double_click") && DANGEROUS.test(label)) {
        log(`refused "${label}"`);
        return { acted, outcome: { kind: "needs_you", reason: /pay|checkout/i.test(label) ? "payment" : "stuck", note: /pay|checkout/i.test(label) ? "payment step: pay the application fee yourself; the agents confirm the submission after" : `the next step is "${label}", which the agents never press for you` } };
      }
      if ((a.action === "click" || a.action === "double_click") && (FINAL.test(label) || /^submit\b/i.test(label) || (deps.finalButton?.test(label) ?? false))) {
        state.reachedSubmit = true;
        const d = await deps.canSubmit();
        if (!d.allowed) return { acted, outcome: { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` } };
        state.submitClicked = true;
      }
      // a button that starts or creates something (or an unlabelled submit) is pressed once per page: pressing
      // "Start application" twice creates two applications
      if ((a.action === "click" || a.action === "double_click") && (/\b(start|create|begin|register|sign ?up|new application)\b/i.test(label) || (!label && /submit/i.test(m?.type ?? "")))) {
        // the same page (by its title and first heading), whatever the button is called this time
        const pageKey = (state.lastFingerprint ?? "").slice(0, 60);
        const k = `${pageKey}|${label || m?.type}`;
        if ((state.createClicks ?? []).some((c) => c.startsWith(`${pageKey}|`))) {
          log(`didn't press "${label || "submit"}" again: it was pressed already`);
          idle++;
          continue;
        }
        state.createClicks = [...(state.createClicks ?? []), k].slice(-30);
      }
      if (a.action === "click") await page.mouseClick(x, y);
      else if (a.action === "double_click") await (page.doubleClick ?? page.mouseClick)(x, y);
      else if (a.action === "hover") await page.hover?.(x, y);
      else if (a.action === "clear") {
        await page.mouseClick(x, y);
        await page.pressKey?.("Control+A");
        await page.pressKey?.("Backspace");
      } else if (a.action === "upload") {
        if (!a.file || !(deps.files?.() ?? []).includes(a.file) || !page.uploadAt) {
          log(`can't upload ${a.file || "?"}`);
          idle++;
          continue;
        }
        const ok = await page.uploadAt(x, y, await deps.file(a.file)).catch(() => false);
        log(ok ? `uploaded ${a.file} at ${what}` : `upload of ${a.file} didn't take`);
      } else {
        // type: the value of a fill-sheet key, or a shorter piece of it to search a long list. nothing else.
        const v = deps.sheetValue?.(a.sheet_key) ?? null;
        const piece = a.text.trim();
        const typed = v && piece && v.toLowerCase().includes(piece.toLowerCase()) ? piece : v;
        if (!typed || NEVER_FILL.test(label) || m?.type === "password") {
          log(`nothing to type for ${a.sheet_key || "?"}`);
          idle++;
          continue;
        }
        // a native dropdown: pick the matching option directly (its list never appears in a screenshot)
        if (/select/i.test(m?.type ?? "") || under?.tag === "select") {
          const r = (await main.evaluate((p: { x: number; y: number; v: string }) => (window as unknown as AM).__am.selectAt(p.x, p.y, p.v), { x, y, v: v! }).catch(() => null)) as { chose?: string; options?: string[] } | null;
          if (r?.chose) {
            log(`chose "${r.chose.slice(0, 40)}" for ${a.sheet_key} in ${what}`);
            continue;
          }
        }
        await page.mouseClick(x, y);
        await page.pressKey?.("Control+A");
        await page.typeText?.(typed);
        log(`typed ${a.sheet_key}${typed !== v ? ` ("${typed}")` : ""} into ${what}`);
      }
      if (a.action === "click" || a.action === "double_click" || a.action === "hover") log(`${a.action.replace("_", " ")} ${what}${a.note ? ` (${a.note.slice(0, 50)})` : ""}`);
    } else if (a.action === "key") {
      if (!VISION_KEYS.has(a.key)) {
        log(`key ${a.key} not allowed`);
        idle++;
        continue;
      }
      await page.pressKey?.(a.key === "Space" ? " " : a.key);
      log(`pressed ${a.key}`);
    } else if (a.action === "scroll") {
      const dy = /up/i.test(a.direction) ? -650 : 650;
      await page.scrollBy?.(dy, m?.x, m?.y);
      log(`scrolled ${dy < 0 ? "up" : "down"}${m ? ` in ${what}` : ""}`);
    } else if (a.action === "back") {
      await page.goBack?.();
      log("went back");
    } else if (a.action === "wait") {
      await sleep(2500);
      log("waited");
    }
    acted = true;
    await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
    await sleep(900);
    const after = await sig();
    if (after && after === before && a.action !== "wait") {
      idle++;
      state.visionHistory = [...(state.visionHistory ?? []).slice(0, -1), `${(state.visionHistory ?? []).at(-1) ?? a.action} → nothing changed`].slice(-14);
    } else idle = 0;
  }
  return { acted };
}

// required fields the rules couldn't answer: one considered look by the model before asking the applicant
async function decidePass(page: Page, deps: EngineDeps, s: Snapshot, fields: PageField[], state: EngineState): Promise<number> {
  if (!deps.decide) return 0;
  const key = (f: PageField) => cleanLabel(f.label, f.options).toLowerCase().slice(0, 80);
  // the portal complaining is new information: everything gets another look
  const seen = new Set((s.errors ?? []).length ? [] : (state.decided ?? []));
  const todo = fields.filter((f) => !seen.has(key(f)) && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`) && f.type !== "password");
  if (!todo.length) return 0;
  state.decided = [...seen, ...todo.map(key)].slice(-120);
  const fills = await deps.decide(todo, { url: s.url, title: s.title, body: s.body.slice(0, 2000), errors: s.errors ?? [] }).catch(orOutage([] as Fill[]));
  return applyList(page, deps, todo, fills, state);
}

// everything a form page gets before the applicant is asked: rules, a model's second look, then the screen
async function fillHard(page: Page, deps: EngineDeps, state: EngineState): Promise<{ filled: number; empty: PageField[]; outcome?: Outcome }> {
  let filled = 0;
  let now = await snap(page);
  // with the portal showing errors, a field it complains about may not be marked required: look at every blank one
  const blank = (x: Snapshot) => x.fields.filter((f) => (f.required || ((x.errors ?? []).length > 0 && f.type !== "checkbox" && f.type !== "file")) && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
  let empty = blank(now);
  if (empty.length) {
    filled += await decidePass(page, deps, now, empty, state);
    now = await snap(page);
    empty = blank(now);
  }
  if (empty.length && deps.see && page.screenshot) {
    const labels = empty.map((f) => cleanLabel(f.label, f.options).slice(0, 80));
    const v = await visionLoop(page, deps, state, `fill in these required questions with the applicant's information, opening dropdowns and choosing the matching option: ${labels.join("; ")}`, labels);
    if (v.outcome) return { filled, empty, outcome: v.outcome };
    if (v.acted) filled += 1;
    if (v.acted) {
      now = await snap(page);
      empty = now.fields.filter((f) => f.required && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
    }
  }
  // the portal's error messages only refresh when the section is saved again: press its save/continue button once
  // after fixing what it complained about, so a stale "X is required" doesn't look like a field that won't fill
  if (filled > 0 && (now.errors ?? []).length) {
    const save = now.buttons.find((b) => SECTION_SAVE.test(clean(b.label))) ?? find(now, NEXT);
    if (save) {
      await click(page, save.id);
      await sleep(1200);
      now = await snap(page);
      empty = now.fields.filter((f) => f.required && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
    }
  }
  return { filled, empty };
}

const SECTION_SAVE = /^save( (my|this|the))?( [a-z]+){0,3}$|^(update|save changes|save section)$/i;

// stopped because the application already on the portal is for another program (ut dallas: an MS/MBA application,
// 480 stops). the agents never start a second one by themselves: they ask once, and a yes lets them start it
export const WRONG_PROGRAM = /\b(is for|for the|belongs to)\b.{0,80}\b(not|rather than|instead of)\b|\b(wrong|different|another|other) (program|programme|degree|course|application)\b|\bnot (the|for) (right|correct|same) (program|programme|degree|course)\b/i;
const NEW_APP_QUESTION = "The application already started on this portal looks like it's for a different program. Should the agents start a new application for the program you're applying to?";
function askAboutNewApp(r: { outcome: Outcome; state: EngineState; filled: number }) {
  const st = r.state;
  if (r.outcome.kind !== "needs_you" || r.outcome.reason === "question" || !st.newAppBlocked || st.newAppAllowedUsed) return r;
  if (!WRONG_PROGRAM.test(`${r.outcome.note} ${(st.navHistory ?? []).slice(-4).join(" ")}`)) return r;
  ask(st, { id: "new-application", label: NEW_APP_QUESTION, type: "radio", options: ["Yes", "No"] } as PageField, "start_new_application");
  return { ...r, outcome: { kind: "needs_you" as const, reason: "question" as const, note: "the application already on this portal seems to be for another program: answer whether the agents should start a new one" } };
}

export async function runEngine(page: Page, deps: EngineDeps, state: EngineState, budgetMs: number): Promise<{ outcome: Outcome; state: EngineState; filled: number }> {
  const end = Date.now() + budgetMs;
  // a page that redraws a box mid-fill starts the pass again from a fresh look, a few times at most
  for (let i = 0; i < 8; i++) {
    try {
      const r = await runPass(page, deps, state, Math.max(0, end - Date.now()));
      return askAboutNewApp(r);
    } catch (e) {
      if (!(e instanceof Redrawn) || Date.now() >= end) throw e;
      state.navHistory = [...(state.navHistory ?? []), "the page redrew while filling; looking again"].slice(-12);
      await sleep(1500);
    }
  }
  return { outcome: { kind: "continue", note: "continuing" }, state, filled: 0 };
}

async function runPass(page: Page, deps: EngineDeps, state: EngineState, budgetMs: number): Promise<{ outcome: Outcome; state: EngineState; filled: number }> {
  const end = Date.now() + budgetMs;
  let filled = 0;
  while (Date.now() < end) {
    if (deps.shouldStop?.()) return { outcome: { kind: "continue", note: "paused" }, state, filled };
    state.steps += 1;
    state.totalSteps = (state.totalSteps ?? 0) + 1;
    // one run ends at 150 steps and the next carries on straight away; only a portal that never ends stops for good
    if (state.steps > 150) return { outcome: { kind: "continue", note: "continuing on the next pages" }, state, filled };
    if (state.totalSteps > 1500) return { outcome: { kind: "needs_you", reason: "stuck", note: "the agents have been through this portal hundreds of pages without finishing; please check where it stands" }, state, filled };
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await sleep(800);
    let s = await snap(page);
    if (isBlockPage(s)) {
      // give an interstitial a moment to clear on its own
      await sleep(8000);
      s = await snap(page);
      if (isBlockPage(s)) return { outcome: { kind: "needs_you", reason: "blocked", note: "this portal blocks the browser the agents are using" }, state, filled };
    }

    // peoplesoft's "Look Up Country" search over the form (manchester, hec): search for the profile's value and pick it
    const lookTitle = [s.title, (s.fingerprint ?? "").split("|")[0]].find((t) => /^\s*look ?up\s+\S/i.test(t ?? "")) ?? "";
    if (lookTitle && (state.lookups ?? 0) < 6 && deps.fillFromKey) {
      state.lookups = (state.lookups ?? 0) + 1;
      if (await lookUp(page, deps, lookTitle)) {
        state.samePageCount = 0;
        continue;
      }
    }

    const said = `${(s.errors ?? []).join(" ")} ${s.body}`;
    const kind0 = classify(s);
    // too many attempts / temporarily locked: wait it out (what the page says, or 30 minutes), three times at most
    if ((kind0 === "login" || kind0 === "signup") && LOCKED.test(said)) {
      state.lockWaits = (state.lockWaits ?? 0) + 1;
      if (state.lockWaits > 3) return { outcome: { kind: "needs_you", reason: "login", note: "the portal keeps the account locked after several waits. Reset the password on the portal, or wait a day and choose Try again" }, state, filled };
      const min = lockMinutes(said);
      return { outcome: { kind: "wait", seconds: min * 60, note: `the portal locked sign-ins for a while: trying again in ${min} minutes` }, state, filled };
    }
    // the whole portal is down (maintenance, 503): come back in half an hour, four times at most
    if (said.length < 3000 && DOWN.test(said) && !insideForm(s)) {
      state.downWaits = (state.downWaits ?? 0) + 1;
      if (state.downWaits > 4) return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal has been down for maintenance for hours; the agents will try again when you choose Try again" }, state, filled };
      return { outcome: { kind: "wait", seconds: 30 * 60, note: "the portal is down for maintenance: trying again in 30 minutes" }, state, filled };
    }
    // the intake is closed or not open yet, and there's no way into a form from here
    if (CLOSED.test(said) && !insideForm(s) && !find(s, START) && !find(s, NEXT)) {
      const line = (said.match(new RegExp(`[^.!?]{0,120}${CLOSED.source}[^.!?]{0,120}`, "i"))?.[0] ?? "").trim();
      return { outcome: { kind: "needs_you", reason: "closed", note: `the portal says applications aren't open${line ? `: "${line.slice(0, 200)}"` : ""}. Check the intake, or choose another program` }, state, filled };
    }
    if (ALREADY_SUBMITTED.test(said)) {
      return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal says this application was already submitted. Check the portal, then mark it submitted in Ivyward" }, state, filled };
    }
    if (PDF_ONLY.test(said)) state.pdfOnly = true;
    // a button that unlocks only once the terms box is scrolled to the end: scroll every scrolling box down once
    if (state.samePageCount === 1) {
      await frameOf(page)
        .evaluate(() => {
          for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) if (el.scrollHeight > el.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight;
          window.scrollTo(0, document.body.scrollHeight);
          return true;
        }, undefined)
        .catch(() => false);
    }

    // loop guard: the same page three times in a row means the portal won't take what we gave it
    if (s.fingerprint !== state.lastFingerprint) recentDialogs.delete(page);
    const alertText = (recentDialogs.get(page) ?? []).join(" | ");
    if (alertText && !(state.navHistory ?? []).at(-1)?.startsWith("the page said:")) state.navHistory = [...(state.navHistory ?? []), `the page said: ${alertText.slice(0, 200)}`].slice(-12);
    state.samePageCount = s.fingerprint === state.lastFingerprint ? (state.samePageCount ?? 0) + 1 : 0;
    state.lastFingerprint = s.fingerprint;
    // a sign-up form that won't move even though everything is filled: the portal blocks automated sign-ups.
    // the applicant creates the account once (with our generated password); we sign in from then on.
    if (REGISTER_PAGE.test(s.url) && /^(forbidden|access denied|403|request blocked)/i.test(s.title.trim() || s.body.trim().slice(0, 40))) {
      return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
    }
    // not when the form says what's wrong (a validation message, an empty required box): that's ours to fix
    // (pop-up messages and error boxes count: peoplesoft says "All the fields marked with * are mandatory" in an alert)
    const formComplains = /(invalid|do(es)? not exist|already (exists|registered|in use)|not (be )?found|error|please (enter|select|provide|choose|complete)|is required|are mandatory|is mandatory|required field|must (be|contain|match|include)|do(es)? not match|too (short|long))/i.test(`${s.body} ${alertText} ${(s.errors ?? []).join(" ")}`);
    const blankRequired = s.fields.some((f) => f.required && f.type !== "checkbox"); // s.fields holds the boxes still empty
    // a password change isn't a sign-up (hec montréal's "Change Password" page)
    const changingPassword = s.allFields.some((f) => f.type === "password" && /\b(current|old|existing|temporary)\b/i.test(`${f.label} ${f.name ?? ""}`)) || CHANGE_PW.test(s.body.slice(0, 1500));
    // only after the sign-up was really sent three times with nothing said (the sign-up step counts its sends): a
    // page that merely looked the same twice (manchester's address page, hec's password change) isn't a block, and
    // calling it one moved those portals to chrome for nothing
    if ((state.signupTries ?? 0) >= 3 && state.samePageCount >= 2 && REGISTER_PAGE.test(`${s.url} ${s.title}`) && !(state.missing ?? []).length && !formComplains && !blankRequired && !changingPassword) {
      return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
    }
    // "this email is already registered / assigned to a user": the applicant has an account here already. never a
    // second one: sign in instead (the saved login, the one the portal emailed, or a reset from their inbox).
    // hec montréal kept creating accounts and looping on "already assigned to user ID 25000282"
    if (!state.accountExists && ["signup", "form", "login"].includes(classify(s)) && EMAIL_EXISTS.test(`${(s.errors ?? []).join(" ")} ${alertText} ${s.body}`)) {
      state.accountExists = true;
      state.triedCreate = true;
      state.wentBackToCreate = true;
      state.createNext = false;
      state.navHistory = [...(state.navHistory ?? []), "the portal says this email has an account already: signing in instead"].slice(-12);
      await deps.progress("you have an account here already: signing in instead");
      const way = find(s, LOGIN_LINK) ?? findBy(s, isSignIn);
      if (way) {
        await click(page, way.id);
        continue;
      }
      if (deps.portalUrl) {
        await page.goto(deps.portalUrl, { timeout: 45_000 }).catch(() => {});
        continue;
      }
    }
    // a message box over the form ("Message: The system does not understand the date… [OK]", peoplesoft's
    // modal): close it so the form underneath works again, once per page
    const okBox = find(s, /^(ok|okay)$/i);
    if (okBox && /\b(message|error|warning|alert)\b/i.test(s.body.slice(0, 300)) && !(state.pressedAsked ?? []).includes(`${(s.fingerprint ?? "").slice(0, 60)}|ok`)) {
      state.pressedAsked = [...(state.pressedAsked ?? []), `${(s.fingerprint ?? "").slice(0, 60)}|ok`].slice(-30);
      await click(page, okBox.id);
      continue;
    }
    // the page names the button it's waiting for ('Remember to "Save Education" below'): press it, once per page
    if (state.samePageCount >= 2) {
      const named = namedButton(s, state);
      if (named) {
        state.navHistory = [...(state.navHistory ?? []), `pressed "${clean(named.label)}", which the page asked for`].slice(-12);
        await deps.progress(`pressing "${clean(named.label)}", which the portal asks for`);
        await click(page, named.id);
        // a new move on this page: give the usual steps (fill, next) a fresh try after it
        state.samePageCount = 0;
        state.lastFingerprint = undefined;
        continue;
      }
    }
    if (state.samePageCount >= 3 && s.fields.some((f) => f.required)) {
      // the same page won't move: take a harder look at what's still blank before asking anyone
      const h = await fillHard(page, deps, state);
      filled += h.filled;
      if (h.outcome) return { outcome: h.outcome, state, filled };
      s = await snap(page);
    }
    if (state.samePageCount >= 3) {
      const req = s.fields.filter((f) => f.required && f.type !== "checkbox").map((f) => cleanLabel(f.label, f.options).slice(0, 80));
      // required boxes still empty after three tries: the profile doesn't answer them, so ask the applicant
      let stillEmpty = s.fields.filter((x) => x.required && x.type !== "checkbox" && !NEVER_FILL.test(`${x.label} ${x.name ?? ""}`));
      // the hard look may have opened a new section: fill what the profile answers there before asking anything
      if (stillEmpty.length) {
        const fills = await deps.map(stillEmpty).catch(orOutage([] as Fill[]));
        const n = await applyList(page, deps, stillEmpty, fills, state);
        if (n) {
          filled += n;
          state.samePageCount = 0;
          await sleep(500);
          s = await snap(page);
          stillEmpty = s.fields.filter((x) => x.required && x.type !== "checkbox" && !NEVER_FILL.test(`${x.label} ${x.name ?? ""}`));
          if (!stillEmpty.length) continue;
        }
      }
      // password boxes a reload wiped (peoplesoft): the login's password goes back in, never a question
      const pwBoxes = s.allFields.filter((f) => f.type === "password");
      const pwKey = `${(s.fingerprint ?? "").slice(0, 60)}|pw`;
      if (s.fields.some((f) => f.type === "password") && pwBoxes.length && !(state.pressedAsked ?? []).includes(pwKey)) {
        const login = await deps.existingLogin();
        if (login) {
          state.pressedAsked = [...(state.pressedAsked ?? []), pwKey].slice(-30);
          for (const p of pwBoxes) await fillText(page, p.id, login.password);
          filled += pwBoxes.length;
          state.samePageCount = 0;
          continue;
        }
      }
      // security questions on an account page are never the applicant's to answer: the login's made-up answers go in
      if (stillEmpty.some((f) => SEC_A.test(f.label) || SEC_Q.test(f.label))) {
        const login = await deps.existingLogin();
        const sec = login ? await securityQuestions(page, stillEmpty, login) : [];
        if (sec.length) {
          filled += sec.length;
          state.samePageCount = 0;
          continue;
        }
      }
      // a field the profile has a value for isn't a question for the applicant: the portal just didn't take it
      const notTaken = stillEmpty.filter((f) => deps.hasValue?.(f.label));
      stillEmpty = stillEmpty.filter((f) => !notTaken.includes(f));
      if (notTaken.length && !stillEmpty.length && state.samePageCount < 6) {
        const o = await stuckStep(page, deps, s, state, `these fields have the applicant's details but the page didn't keep them (they may be locked until an earlier section is finished, or need a different control): ${notTaken.map((f) => cleanLabel(f.label, f.options).slice(0, 40)).join("; ")}`, { kind: "needs_you", reason: "stuck", note: `the portal won't take ${notTaken.map((f) => cleanLabel(f.label, f.options).slice(0, 30)).slice(0, 3).join(", ")} yet; it may need an earlier section finished first` });
        if (o) return { outcome: o, state, filled };
        continue;
      }
      for (const f of stillEmpty) if (!notAQuestion(state, f)) ask(state, f);
      if (state.missingDocs?.length) return { outcome: { kind: "needs_you", reason: "documents", note: `the portal needs what your packet doesn't have yet: ${state.missingDocs.slice(0, 6).join("; ")}. Add documents under Documents in Ivyward (or shorten the essay), then choose Try again` }, state, filled };
      const fix = (state.missing ?? []).length || stillEmpty.length ? questionNote(state) : "";
      const err = (s.errors ?? []).join("; ").slice(0, 160);
      const stop: Outcome = { kind: "needs_you", reason: fix ? "question" : "stuck", note: fix || (err ? `the portal says: ${err}` : req.length ? `the portal wants: ${req.slice(0, 3).join("; ")}` : "the portal didn't accept this page") };
      if (fix || state.samePageCount >= 6) return { outcome: stop, state, filled };
      // the usual moves aren't working on this page: let the navigator look at it
      const o = await stuckStep(page, deps, s, state, `the same page came back ${state.samePageCount} times after the usual steps${err ? `; the portal shows: ${err}` : ""}`, stop);
      if (o) return { outcome: o, state, filled };
      continue;
    }

    // a third party's own sign-in or account recovery (microsoft, google, apple…): never the applicant's way into a
    // school portal here. hec montréal's "LOG IN" for hec email holders led to microsoft's account recovery, where
    // the agents were about to type the email. turn back to the school's portal; stop if it keeps happening
    if (IDP_HOST.test(hostOf(s.url)) && !(deps.portalUrl && hostOf(deps.portalUrl) === hostOf(s.url))) {
      state.idpBacks = (state.idpBacks ?? 0) + 1;
      state.navHistory = [...(state.navHistory ?? []), `left ${hostOf(s.url)} (another company's sign-in): back to the school's portal`].slice(-20);
      if (state.idpBacks > 2 || !deps.portalUrl) return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal kept sending the agents to another company's sign-in page (Microsoft, Google or similar). Open the portal and sign in with the school's own account option" }, state, filled };
      await page.goto(deps.portalUrl, { timeout: 45_000 }).catch(() => null);
      continue;
    }

    // a page that ends the session ("An error has occurred that has stopped this transaction", "your session has
    // expired"): nothing on it can be filled or pressed. start again from the portal's front door, twice a run at most
    if (deps.portalUrl && DEAD_END.test(s.body.slice(0, 2000)) && s.fields.length === 0 && (state.restarts ?? 0) < 2) {
      state.restarts = (state.restarts ?? 0) + 1;
      state.navHistory = [...(state.navHistory ?? []), `the portal ended the session ("${(s.body.match(DEAD_END)?.[0] ?? "").slice(0, 60)}"): started again from the portal`].slice(-20);
      await page.goto(deps.portalUrl, { timeout: 45_000 }).catch(() => null);
      state.samePageCount = 0;
      continue;
    }

    // an enquiry, brochure or newsletter form collects leads, it isn't the application: go back to the portal
    if (!deps.goal && deps.portalUrl && LEAD_PAGE.test(`${s.url} ${s.title}`) && !LEAD_PAGE.test(deps.portalUrl) && (state.leadBacks ?? 0) < 3) {
      state.leadBacks = (state.leadBacks ?? 0) + 1;
      state.navHistory = [...(state.navHistory ?? []), `left an enquiry form (${s.title.slice(0, 40)}) for the application portal`].slice(-20);
      await page.goto(deps.portalUrl, { timeout: 45_000 }).catch(() => null);
      state.samePageCount = 0;
      continue;
    }

    // the portal has started the application and emailed a link to carry on with it: that link is the way back in.
    // only from outside the form: stirling prints "you should have received an email containing a link" above every
    // page of the application itself, and leaving a half-filled page for that link threw the work away each time
    if (EMAILED_LINK.test(s.body.slice(0, 6000)) && !insideForm(s) && deps.resumeLink && (state.resumeLinkTries ?? 0) < 3 && Date.now() - (state.resumeLinkAt ?? 0) > 10 * 60_000) {
      state.resumeLinkAt = Date.now();
      state.resumeLinkTries = (state.resumeLinkTries ?? 0) + 1;
      const link = await deps.resumeLink().catch(() => null);
      if (link) {
        await deps.progress("opening the link the school emailed to continue the application");
        state.navHistory = [...(state.navHistory ?? []), "followed the school's emailed link"].slice(-20);
        await page.goto(link, { timeout: 45_000 }).catch(() => null);
        state.samePageCount = 0;
        state.createClicks = [];
        continue;
      }
    }

    if (deps.isDone?.(s) && (state.submitClicked || state.reachedSubmit)) return { outcome: { kind: "submitted", note: "done: the page confirmed it" }, state, filled };

    const kind = classify(s);

    if (kind === "confirmation") {
      if (state.submitClicked || state.reachedSubmit) return { outcome: { kind: "submitted", note: "portal showed a confirmation" }, state, filled };
      // an "application complete" page we didn't cause: don't claim it
    }
    if (kind === "captcha") return { outcome: { kind: "needs_you", reason: "captcha", note: "the portal is showing a bot check. open the live view and complete it; the runner continues on its own" }, state, filled };
    if (kind === "payment") {
      state.reachedSubmit = true;
      return { outcome: { kind: "needs_you", reason: "payment", note: "payment page: open the live view and pay the fee; the runner confirms the submission after" }, state, filled };
    }

    // a password reset in progress takes the page first
    if (state.reset) {
      const r = await resetStep(page, deps, s, state);
      if (r === "continue") continue;
      if (r) return { outcome: r, state, filled };
    }

    if (kind === "login") {
      // sent back here to create the account: press "Create account" rather than signing in again
      if (state.createNext && !state.triedCreate) {
        const create = find(s, CREATE) ?? findCreate(s);
        state.createNext = false;
        if (create) {
          state.triedCreate = true;
          state.accountAt = Date.now();
          await deps.progress("creating your portal account");
          await click(page, create.id);
          continue;
        }
      }
      let login = await deps.existingLogin();
      if (login && deps.signInYourself?.()) return { outcome: { kind: "needs_you", reason: "login", note: "sign in to the portal yourself (your password manager can fill it in); the agents carry on once you're in" }, state, filled };
      // never create a second account: first look for a login this portal already emailed
      if (!login && deps.loginFromMail) login = await deps.loginFromMail(Date.now() - 60 * 86_400_000);
      if (!login) {
        const create = find(s, CREATE) ?? findCreate(s);
        if (create && !state.triedCreate) {
          await deps.progress("creating your portal account");
          state.accountAt = Date.now();
          state.triedCreate = true;
          await click(page, create.id);
          continue;
        }
        // the way in isn't a recognisable button: ask the navigator, then look at the screen
        const fallback: Outcome = { kind: "needs_you", reason: "login", note: "couldn't find where to create an account on this portal. Create it where the school says and add it under Portal logins; the agents sign in with it and carry on" };
        const o = await stuckStep(page, deps, s, state, "this is a sign-in page and there's no login on file yet: find how to create a new account (register, sign up, new applicant, create account, first-time user)", fallback);
        if (o) return { outcome: o, state, filled };
        continue;
      }
      const pw = s.allFields.find((f) => f.type === "password")!;
      const user = s.allFields.find((f) => f.type !== "password" && f.type !== "checkbox" && /(e-?mail|user|login|account)/i.test(`${f.label} ${f.autocomplete ?? ""}`)) ?? s.allFields.find((f) => f.type === "email" || f.type === "text");
      // "user id" boxes get the user id we registered with (the email's local part), email boxes get the email
      const isIdBox = /user\s*(id|name)|login\s*(id|name)|identifiant|oprid/i.test(`${user?.label ?? ""} ${user?.name ?? ""}`) && !/e-?mail/i.test(user?.label ?? "");
      if (user) await fillText(page, user.id, !login.login_email.includes("@") || !isIdBox ? login.login_email : login.login_email.split("@")[0].replace(/[^a-z0-9._-]/gi, "").slice(0, 30));
      await fillText(page, pw.id, login.password);
      const go = find(s, SIGNIN) ?? findBy(s, isSignIn);
      await deps.progress("signing in to the portal");
      // no recognisable button: pressing enter in the password box submits the sign-in form on almost every portal
      if (go) await click(page, go.id);
      else await frameOf(page).press(`[data-am-id="${pw.id}"]`, "Enter").catch(() => {});
      const after = await snap(page);
      if (classify(after) === "login" && LOGIN_REFUSED.test(`${after.body} ${(after.errors ?? []).join(" ")}`)) {
        // a login that has never worked on this application: the applicant hasn't created the account yet
        // the portal may have issued its own login by email (we pressed "create account" earlier, or you did)
        if (!state.triedMailLogin && deps.loginFromMail) {
          state.triedMailLogin = true;
          const issued = await deps.loginFromMail(Date.now() - 60 * 86_400_000);
          if (issued && (issued.password !== login.password || issued.login_email !== login.login_email)) {
            await deps.progress("found the login the portal emailed you; signing in");
            continue;
          }
        }
        // never signed in with it: the account may not exist yet. create it (same password) if the page offers that
        if (!state.signedIn && !state.triedCreate) {
          const create = find(after, CREATE) ?? findCreate(after);
          if (create) {
            state.triedCreate = true;
            state.accountAt = Date.now();
            await deps.progress("creating your portal account");
            await click(page, create.id);
            continue;
          }
          // the error page has no way to create one (hec montréal sends a refused sign-in to a bare peoplesoft
          // page): go back to the portal's front page, which has "Create account", and press that instead
          // slate (bu, auburn, brandeis, rochester…) sends a refused sign-in to /account/login, which has no way to
          // register: its registration page is /account/register on the same site. slate turns away a second account
          // for the same email itself, so this is safe even if one was started before
          const here = await page.url();
          // only for a login the agents made and never got to use ("created"): one that failed may have worked before
          if (/\/account\/login\b/i.test(here) && login.status === "created" && !state.wentBackToCreate) {
            state.wentBackToCreate = true;
            state.createNext = false;
            const u = new URL(here);
            const back = u.searchParams.get("r");
            state.navHistory = [...(state.navHistory ?? []), "the saved login has never worked here: opened the portal's account registration"].slice(-12);
            await page.goto(`${u.origin}/account/register${back ? `?r=${encodeURIComponent(back)}` : ""}`, { timeout: 45_000 }).catch(() => null);
            continue;
          }
          // never when an account may exist already: the login worked once, or the agents created one here before
          // (hec montréal emails its own user id and password on creation: that's a login to find, not a second account)
          if (deps.portalUrl && !state.wentBackToCreate && login.status === "created" && !state.accountAt && (await page.url()) !== deps.portalUrl) {
            state.createNext = true;
            state.wentBackToCreate = true;
            state.navHistory = [...(state.navHistory ?? []), "the saved login has never worked here: back to the portal's front page to create the account"].slice(-12);
            await page.goto(deps.portalUrl, { timeout: 45_000 }).catch(() => null);
            continue;
          }
        }
        // reset the password through the portal's own "forgot password", read the email, set a new one, save it
        const forgot = findForgot(after);
        const canReset = deps.canReadMail && deps.resetLink && deps.rotatePassword && (state.reset?.tries ?? 0) < 2;
        if (forgot && canReset) {
          state.reset = { stage: "requested", at: Date.now(), tries: (state.reset?.tries ?? 0) + 1 };
          await deps.progress("the portal rejected the saved password, so the agents are resetting it");
          await click(page, forgot.id);
          continue;
        }
        // no link the rules recognise ("Need help?", an icon, a link in a menu): look at the page for one
        if (!forgot && canReset && !state.lookedForReset) {
          state.lookedForReset = true;
          const reset = { stage: "requested" as const, at: Date.now(), tries: (state.reset?.tries ?? 0) + 1 };
          const o = await stuckStep(page, deps, after, state, "the portal rejected the saved password. find and press the link to reset or recover the password (it may be called forgot password, reset password, need help signing in, or trouble logging in). do not type anything", { kind: "needs_you", reason: "login", note: "" });
          if (!o) {
            state.reset = reset;
            await deps.progress("the portal rejected the saved password, so the agents are resetting it");
            continue;
          }
        }
        if (!state.signedIn) return { outcome: { kind: "needs_you", reason: "account", note: "waiting for you to create the portal account" }, state, filled };
        return { outcome: { kind: "needs_you", reason: "login", note: deps.canReadMail ? "the portal rejected the saved password and has no reset link the agents could use. Reset it on the portal, save the new one under Portal logins, and the agents sign in again by themselves" : "the portal rejected the saved password. Connect Gmail so the agents can reset it themselves, or reset it on the portal and save the new one under Portal logins" }, state, filled };
      }
      // only count it as signed in once the sign-in form has actually gone away
      if (classify(after) !== "login") state.signedIn = true;
      continue;
    }

    // a password change the portal requires (hec montréal on first sign-in with the login it emailed): current
    // password in its box, a new one everywhere else, saved first. a sign-up form has no "current password"
    const pwBoxes = s.allFields.filter((f) => f.type === "password");
    const currentBox = pwBoxes.find((f) => /\b(current|old|existing|temporary|present|actuel|ancien)\b/i.test(`${f.label} ${f.name ?? ""}`)) ?? (pwBoxes.length === 3 && CHANGE_PW.test(s.body.slice(0, 3000)) ? pwBoxes[0] : undefined);
    if ((kind === "signup" || kind === "form") && pwBoxes.length >= 2 && currentBox && deps.rotatePassword && (state.passwordChanges ?? 0) < 2) {
      const now = await deps.existingLogin();
      if (now) {
        state.passwordChanges = (state.passwordChanges ?? 0) + 1;
        await deps.progress("the portal asked for a new password: setting one and saving it under Portal logins");
        const fresh = await deps.rotatePassword();
        // hec's change form also asks for the user id: the login's own (not the email, when the portal issued one)
        const userBox = s.fields.find((f) => f.type !== "password" && /\b(user\s*(id|name)|login\s*(id|name)?|identifiant|matricule|e-?mail)\b/i.test(`${f.label} ${f.name ?? ""}`));
        if (userBox) await fillText(page, userBox.id, now.login_email);
        await fillText(page, currentBox.id, now.password);
        for (const p of pwBoxes) if (p.id !== currentBox.id) await fillText(page, p.id, fresh.password);
        state.navHistory = [...(state.navHistory ?? []), "changed the portal password as it asked, and saved the new one"].slice(-12);
        const go = s.buttons.find((x) => /^(change|save|submit|update|continue|confirm|ok|modifier|enregistrer|valider)( (my |the )?password)?$/i.test(clean(x.label))) ?? find(s, CREATE_SUBMIT);
        if (go) await click(page, go.id);
        else await page.pressEnter();
        continue;
      }
    }

    if (kind === "signup") {
      // the address goes in through its own "Add Address" page on some sign-ups (manchester): open it first, once
      // a run (it was in the sign-in branch by mistake, so manchester's sign-ups always went without an address)
      const addAddr = s.buttons.find((b) => /^(add|enter|update)( an?| your)?( home| mailing| permanent| contact)? address$/i.test(clean(b.label)));
      const addrKey = `${(s.url.match(/^https?:\/\/[^/]+/) ?? [""])[0]}|address`;
      if (addAddr && !(state.pressedAsked ?? []).includes(addrKey)) {
        state.pressedAsked = [...(state.pressedAsked ?? []), addrKey].slice(-30);
        state.navHistory = [...(state.navHistory ?? []), `opened "${clean(addAddr.label)}" before creating the account`].slice(-12);
        await click(page, addAddr.id);
        continue;
      }
      const login = (await deps.existingLogin()) ?? (await deps.createLogin(deps.accountEmail));
      const said = (s.errors ?? []).join(" ").trim();
      // the portal said why it didn't create the account. a username someone else has: try it with a number
      // ("samson2.ogunfuwa" keeps calgary's ".lastname" rule). anything else, after a few tries: show the applicant
      if (state.signupTries && USERNAME_TAKEN.test(said) && (state.usernameTries ?? 0) < 3) {
        state.usernameTries = (state.usernameTries ?? 0) + 1;
        const box = usernameBox(s);
        const now = box ? await valueOf(page, box.id) : "";
        if (box && now) {
          const next = withNumber(now, state.usernameTries + 1);
          await fillText(page, box.id, next);
          state.navHistory = [...(state.navHistory ?? []), `the portal said the username was taken: trying "${next}"`].slice(-12);
        }
      } else if ((state.signupTries ?? 0) >= 3) {
        return { outcome: { kind: "needs_you", reason: "account", note: said ? `the portal didn't create the account. It said: "${said.slice(0, 200)}"` : "the portal didn't create the account and showed no reason. Open the live view to see the sign-up page" }, state, filled };
      }
      state.signupTries = (state.signupTries ?? 0) + 1;
      await deps.progress("creating your portal account");
      // email (and confirm email) get the applicant's login email; everything else from the fill sheet
      const others = s.fields.filter((f) => f.type !== "password");
      for (const f of others.filter((f) => f.type === "email" || /e-?mail/i.test(f.label))) await fillText(page, f.id, login.login_email);
      let rest = [...others.filter((f) => !(f.type === "email" || /e-?mail/i.test(f.label))), ...dateRedo(s, others)];
      // security questions ("Question 2" / "Answer 2"): a different question each, answered with the login's own
      // made-up answers, never anything about the applicant
      const sec = await securityQuestions(page, rest, login);
      filled += sec.length;
      rest = rest.filter((f) => !sec.includes(f.id));
      filled += await applyFills(page, deps, rest, state);
      // the terms box from a fresh look: earlier choices may have reloaded the form, and on some portals
      // (manchester) ticking it is what makes the create button appear
      await sleep(1000);
      await acceptTerms(page, await snap(page));
      // passwords last: portals that reload the form on every choice (peoplesoft) wipe password boxes each time
      await sleep(1500);
      const ready = await snap(page);
      for (const p of ready.allFields.filter((f) => f.type === "password")) await fillText(page, p.id, login.password);
      state.navHistory = [...(state.navHistory ?? []), "filled the sign-up form"].slice(-12);
      // the button is called many things ("Create eID", "Register now", "Submit registration", "Sign up >")
      const go = find(ready, CREATE_SUBMIT) ?? find(s, CREATE_SUBMIT) ?? s.buttons.find((b) => CREATE_LOOSE.test(clean(b.label)) && !/(sign ?in|log ?in|cancel|back|clear|reset|forgot)/i.test(b.label));
      if (!go) {
        // no recognisable button: look at the page (and the screenshot) before handing it over
        const o = await stuckStep(page, deps, s, state, "the sign-up form is filled in; find and press the button that creates the account (it may be at the bottom, below the terms, or be an image or link)", { kind: "needs_you", reason: "stuck", note: "filled the sign-up form but couldn't find the button that creates the account" });
        if (o) return { outcome: o, state, filled };
        state.accountAt ??= Date.now();
        continue;
      }
      state.accountAt = Date.now();
      state.navHistory = [...(state.navHistory ?? []), `pressed "${clean(go.label)}" to create the account`].slice(-12);
      await click(page, go.id);
      continue;
    }

    if (kind === "verify_code" || kind === "check_email") {
      // no record of when the account was made (an earlier run, or the applicant made it): its email may be days old
      const since = state.accountAt ?? Date.now() - 14 * 86_400_000;
      state.verifyWaitSince ??= Date.now();
      if (!deps.canReadMail) {
        return { outcome: { kind: "needs_you", reason: "verification", note: `the portal sent a verification ${kind === "verify_code" ? "code" : "link"} to your email. open the live view and enter it (connect gmail so the agents can do this for you)` }, state, filled };
      }
      const v = await deps.verification(since);
      if (!v || (!v.code && !v.link)) {
        if (Date.now() - state.verifyWaitSince > 20 * 60_000) return { outcome: { kind: "needs_you", reason: "verification", note: "the portal's verification email hasn't reached the agents after 20 minutes. Connect Gmail, or paste the email under Messages → Paste an email, and they carry on" }, state, filled };
        return { outcome: { kind: "wait", note: "waiting for the portal's verification email", seconds: 60 }, state, filled };
      }
      state.verifyWaitSince = undefined;
      if (kind === "verify_code" && v.code) {
        const box = s.allFields.find((f) => isCodeBox(f));
        if (!box) return { outcome: { kind: "needs_you", reason: "verification", note: "the portal asked for an emailed code but the agents couldn't find where to type it; open the live view" }, state, filled };
        await fillText(page, box.id, v.code);
        const go = find(s, VERIFY_BTN);
        if (go) await click(page, go.id);
        else await page.pressEnter();
        continue;
      }
      if (v.link) {
        await deps.progress("confirming your email with the portal");
        await page.goto(v.link);
        continue;
      }
      return { outcome: { kind: "needs_you", reason: "verification", note: "found the verification email but couldn't use it; open the live view" }, state, filled };
    }

    // an ordinary form page
    // a document area with a "type of document" list, one file box and a Go/Upload button: one document at a time
    if (s.fields.length) {
      const up = await uploadByType(page, deps, s, state);
      if (up) {
        filled += up;
        continue;
      }
    }
    const redo = dateRedo(s, s.fields);
    if (s.fields.length || redo.length) {
      await deps.progress(`filling ${s.fields.length + redo.length} field${s.fields.length + redo.length > 1 ? "s" : ""}`);
      filled += await applyFills(page, deps, [...s.fields, ...redo], state);
      await acceptTerms(page, s);
      await sleep(1500);
      const tried = new Set(s.fields.map((f) => f.id));
      const fresh = (await snap(page)).fields.filter((f) => !tried.has(f.id) || (f.options?.length ?? 0) > (s.fields.find((x) => x.id === f.id)?.options?.length ?? 0));
      if (fresh.length) filled += await applyFills(page, deps, fresh, state);
    }
    let now = await snap(page);
    if (now.fields.some((f) => f.required)) {
      const h = await fillHard(page, deps, state);
      filled += h.filled;
      if (h.outcome) return { outcome: h.outcome, state, filled };
      // only what the profile doesn't have is a question for the applicant. a box the profile has a value for that the
      // page didn't keep (ut dallas's birthdate) is the portal's doing: the loop guard deals with it, nobody is asked
      const unknown = h.empty.filter((f) => !deps.hasValue?.(f.label) && !notAQuestion(state, f));
      if (unknown.length) {
        for (const f of unknown) ask(state, f);
        return { outcome: { kind: "needs_you", reason: "question", note: questionNote(state).slice(0, 290) }, state, filled };
      }
      now = await snap(page);
    }

    if (state.missingDocs?.length) {
      return { outcome: { kind: "needs_you", reason: "documents", note: `the portal needs what your packet doesn't have yet: ${state.missingDocs.slice(0, 6).join("; ")}. Add documents under Documents in Ivyward (or shorten the essay), then choose Try again` }, state, filled };
    }
    const submit = find(now, FINAL) ?? (deps.finalButton ? find(now, deps.finalButton) : undefined);
    if (submit) {
      state.reachedSubmit = true;
      const d = await deps.canSubmit();
      if (!d.allowed) return { outcome: { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` }, state, filled };
      await deps.progress("submitting your signed packet");
      state.submitClicked = true;
      await click(page, submit.id);
      continue;
    }
    // a repeating section with more of the applicant's entries to go ("Add another qualification"): add the next one
    const add = now.buttons.find((b) => ADD_ANOTHER.test(clean(b.label)));
    const addKind = add ? entryKind(clean(add.label)) : null;
    if (add && addKind && deps.fillFromKey) {
      const done = state.entries?.[addKind] ?? 0;
      const probe = await deps.fillFromKey({ id: "probe", label: addKind === "edu" ? "Institution" : "Employer", type: "text" } as PageField, `${addKind}${done + 2}_${addKind === "edu" ? "institution" : "employer"}`);
      const mark = `add|${addKind}|${done + 1}`;
      if (probe && probe.action === "fill" && done < 5 && !(state.pressedAsked ?? []).includes(mark)) {
        state.pressedAsked = [...(state.pressedAsked ?? []), mark].slice(-30);
        state.entries = { ...(state.entries ?? {}), [addKind]: done + 1 };
        await deps.progress(`adding your ${addKind === "edu" ? "education" : "work"} entry ${done + 2}`);
        await click(page, add.id);
        continue;
      }
    }
    // landing pages offer "log in" and "create an account": once there's a login on file, sign in
    const haveLogin = !s.fields.length && !!(await deps.existingLogin());
    const apply = !s.fields.length ? bestApply(now, state.visited) : undefined;
    let next =
      find(now, NEXT) ??
      (!s.fields.length && haveLogin ? find(now, LOGIN_LINK) ?? findBy(now, isSignIn) : undefined) ??
      (apply && (APPLY_STRONG.test(clean(apply.label)) || START.test(clean(apply.label))) ? apply : undefined) ??
      find(now, START) ??
      find(now, CREATE) ??
      (s.fields.length ? find(now, CREATE_SUBMIT) : undefined) ??
      // a small sub-page (an address, a qualification) closes with OK / Done
      (s.fields.length ? find(now, /^(ok|okay|done|update)$/i) : undefined) ??
      apply;
    // "Start a new application" a second time makes a second application: let the navigator choose instead
    if (next && NEW_APP.test(clean(next.label)) && !markNewApp(state, clean(next.label))) {
      if (!state.newAppAllowedUsed && (await deps.allowNewApp?.())) state.newAppAllowedUsed = true;
      else {
        state.newAppBlocked = clean(next.label);
        next = undefined;
      }
    }
    if (next) {
      // a page of the form (filled now, or filled before): not a landing page with a search box
      const formPage = now.allFields.filter((f) => f.type !== "search" && f.type !== "hidden" && !/\bsearch\b/i.test(f.label)).length >= 2;
      if (formPage && deps.beforeNext && !(await deps.beforeNext({ label: clean(next.label), title: now.title, url: now.url }))) {
        return { outcome: { kind: "needs_you", reason: "review", note: "this page is filled in: check it, then approve it in the Ivyward side panel" }, state, filled };
      }
      if (next.href && next === apply) state.visited = [...(state.visited ?? []), here(next.href)].slice(-30);
      await click(page, next.id);
      continue;
    }
    if (kind === "confirmation") return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal says the application is complete, but the runner didn't submit it. check it" }, state, filled };
    const o = await stuckStep(page, deps, now, state, "none of the usual buttons (next, continue, apply, start, sign in, create account) are on this page. if this is a school or program page, find the link that leads to the online application (it may be called apply online, how to apply, start application, or sit in a menu)", { kind: "needs_you", reason: "stuck", note: "can't find the next step on this page; open the portal and move to the next section" });
    if (o) return { outcome: o, state, filled };
  }
  return { outcome: { kind: "continue", note: "continuing" }, state, filled };
}

const DETAIL: Record<string, string> = {
  date_of_birth: "date of birth", dob_month: "date of birth", dob_day: "date of birth", dob_year: "date of birth",
  phone: "phone", address_line1: "address", address_line2: "address", city: "city", state: "state/province",
  postal_code: "postal code", country: "country", gender: "gender", citizenship: "citizenship",
};
export function missingNote(keys: string[]): string {
  const labels = [...new Set(keys.map((k) => DETAIL[k] ?? (k.startsWith("rec") ? "recommenders" : k.startsWith("edu") ? "education history" : k.startsWith("work") ? "work history" : k.replace(/_/g, " "))))];
  return labels.length ? `add your ${labels.slice(0, 4).join(", ")} in Profile, under Details for application forms, then choose Try again` : "";
}

const EMAILED_LINK = /(received|sent you|we('ve| have) sent|check your) (an )?e-?mail (containing|with) a link|link to (allow you to )?(complete|continue|return to|resume|finish) (the|your) (form|application)|resume (your|the) application (from|using) the link/i;
// a page of the application itself (several real questions), not a landing or "resend my link" page
export const insideForm = (s: Pick<Snapshot, "fields">) => s.fields.filter((f) => f.type !== "search" && !/\bsearch\b/i.test(f.label)).length >= 3;
export const NAV_BUDGET = 30; // model-driven steps per run
const NEW_APP = /\b(start|create|begin) (a )?new application\b|\bnew application\b/i;
const DANGEROUS = /\b(pay|payment|checkout|delete|remove|withdraw|cancel (my |the )?application|deactivate|unsubscribe|sign out|log ?out)\b/i;

// ask the navigator for one step and do it. returns null to keep looping, or an outcome to stop with.
async function navStep(page: Page, deps: EngineDeps, s: Snapshot, state: EngineState, why: string, fallback: Outcome): Promise<Outcome | null> {
  if (!deps.navigate || (state.navCalls ?? 0) >= NAV_BUDGET) return fallback;
  state.navCalls = (state.navCalls ?? 0) + 1;
  const history = state.navHistory ?? [];
  const a = await deps.navigate({ why, snapshot: s, history: history.slice(-8), signedIn: !!state.signedIn, haveLogin: !!(await deps.existingLogin()) }).catch(orOutage(null));
  if (!a) return fallback;
  const log = (t: string) => (state.navHistory = [...history, t].slice(-12));
  const root = (u: string) => {
    try {
      return new URL(u).hostname.split(".").slice(-2).join(".");
    } catch {
      return "";
    }
  };

  if (a.action === "handoff") {
    log(`handoff: ${a.note}`);
    return { kind: "needs_you", reason: "stuck", note: a.note.slice(0, 280) || fallback.note };
  }
  if (a.action === "wait_email") {
    log("wait for email");
    return { kind: "wait", note: a.note || "waiting for an email from the portal", seconds: 90 };
  }
  if (a.action === "done") {
    log("done?");
    if (s.confirmation && (state.reachedSubmit || state.submitClicked)) return { kind: "submitted", note: "portal showed a confirmation" };
    return { kind: "needs_you", reason: "stuck", note: `the agents think this application may be finished; please check the portal. ${a.note}`.slice(0, 280) };
  }
  if (a.action === "goto") {
    // only links on this page or pages on the same site
    const onPage = s.buttons.some((b) => b.href === a.url);
    // a same-site address the model typed itself must start like one it has actually seen ("/ApplicantPortal/...",
    // not a misspelt "/ApplicantPotal/...")
    const seg = (u: string) => {
      try {
        return new URL(u).pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
      } catch {
        return "";
      }
    };
    const seen = [s.url, ...s.buttons.map((b) => b.href ?? ""), ...(state.visited ?? []), deps.portalUrl ?? ""].filter(Boolean);
    const plausible = onPage || seen.some((u) => root(u) === root(a.url) && seg(u) === seg(a.url));
    if (!/^https:\/\//.test(a.url) || (!onPage && root(a.url) !== root(s.url)) || !plausible) {
      log(`refused goto ${a.url}`);
      return null;
    }
    log(`goto ${a.url}`);
    await page.goto(a.url, { timeout: 45_000 });
    await sleep(1200);
    return null;
  }
  if (a.action === "fill") {
    const f = s.fields.find((x) => x.id === a.target_id);
    const fill = f && deps.fillFromKey ? await deps.fillFromKey(f, a.sheet_key) : null;
    if (!f || !fill || NEVER_FILL.test(`${f.label} ${f.name ?? ""}`)) {
      log(`couldn't fill ${f?.label ?? a.target_id} from ${a.sheet_key}`);
      return null;
    }
    log(`fill "${f.label.slice(0, 40)}" from ${a.sheet_key}`);
    if (fill.action === "upload") {
      const file = await deps.file(fill.file);
      await frameOf(page).setInputFiles(`[data-am-id="${f.id}"]`, file);
    } else await frameOf(page).evaluate((x) => (window as unknown as { __am: { apply(f: unknown): boolean } }).__am.apply(x), fill);
    return null;
  }
  // click
  const b = s.buttons.find((x) => x.id === a.target_id);
  if (!b) {
    log(`no such button ${a.target_id}`);
    return null;
  }
  const label = clean(b.label);
  if (DANGEROUS.test(label)) {
    log(`refused "${label}"`);
    return { kind: "needs_you", reason: /pay|checkout/i.test(label) ? "payment" : "stuck", note: /pay|checkout/i.test(label) ? "payment step: pay the application fee yourself; the agents confirm the submission after" : `the next step is "${label}", which the agents never press for you` };
  }
  if (FINAL.test(label) || /^submit\b/i.test(label)) {
    state.reachedSubmit = true;
    const d = await deps.canSubmit();
    if (!d.allowed) return { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` };
    state.submitClicked = true;
  }
  // "Start a new application" pressed again makes a second application (seen on ut dallas): once per portal
  if (NEW_APP.test(label) && !markNewApp(state, label)) {
    if (!state.newAppAllowedUsed && (await deps.allowNewApp?.())) state.newAppAllowedUsed = true;
    else {
      state.newAppBlocked = label;
      log(`didn't press "${label}": an application was started already`);
      return null;
    }
  }
  log(`click "${label}"`);
  // a choice made on the page (ut dallas: the existing application's tile) can unlock the button it asks for again
  state.navClicks = (state.navClicks ?? 0) + 1;
  await deps.progress(a.note ? a.note.slice(0, 80) : `pressing "${label}"`);
  await click(page, b.id);
  return null;
}

// the navigator first (cheap, reads the page); if it gives up, look at the screen before handing over
async function stuckStep(page: Page, deps: EngineDeps, s: Snapshot, state: EngineState, why: string, fallback: Outcome): Promise<Outcome | null> {
  const look = (x: Snapshot) => `${x.fingerprint}|${x.url}|${x.fields.length}|${x.buttons.map((b) => b.label).join("/")}`;
  const before = look(s);
  // a bot wall reached by a step (le.ac.uk's course search): that's the portal blocking the cloud browser, not a
  // page to work out, so it goes to the applicant's chrome instead of round in circles
  const walled = async (): Promise<Outcome | null> => (isBlockPage(await snap(page)) ? { kind: "needs_you", reason: "blocked", note: "this portal blocks the browser the agents are using" } : null);
  const o = await navStep(page, deps, s, state, why, fallback);
  if (!o) return await walled();
  if (o.kind === "needs_you" && o.reason === "stuck") {
    const w = await walled();
    if (w) return w;
  }
  // a real stop (payment, a button the agents never press, submit not allowed, waiting for mail) stands
  if (o.kind !== "needs_you" || (o.reason !== "stuck" && o.reason !== "login")) return o;
  const v = await visionLoop(page, deps, state, why, []);
  if (v.outcome) return (await walled()) ?? v.outcome;
  if (!v.acted) return o;
  // the screen changed (a new button appeared, a list closed, a page loaded): carry on from there
  return look(await snap(page)) !== before ? null : o;
}

// one step of a password reset. "continue" = acted, loop again; an outcome = stop; null = not a reset page
async function resetStep(page: Page, deps: EngineDeps, s: Snapshot, state: EngineState): Promise<Outcome | "continue" | null> {
  const r = state.reset!;
  const login = await deps.existingLogin();
  const pw = s.allFields.filter((f) => f.type === "password");
  if (r.stage === "requested") {
    const box = s.allFields.find((f) => f.type !== "password" && f.type !== "checkbox" && f.type !== "hidden" && /(e-?mail|user|login|account|id)/i.test(`${f.label} ${f.name ?? ""} ${f.autocomplete ?? ""}`)) ?? s.allFields.find((f) => f.type === "email" || f.type === "text");
    if (!box || pw.length || !login) {
      // the forgot link didn't lead to a reset form: give up on resetting
      state.reset = undefined;
      return null;
    }
    const isId = /user\s*(id|name)|login\s*(id|name)|identifiant/i.test(`${box.label} ${box.name ?? ""}`) && !/e-?mail/i.test(box.label);
    await fillText(page, box.id, isId && login.login_email.includes("@") ? login.login_email.split("@")[0] : login.login_email);
    const go = s.buttons.find((b) => RESET_BTN.test(clean(b.label)) && !FORGOT.test(clean(b.label)));
    if (go) await click(page, go.id);
    else await frameOf(page).press(`[data-am-id="${box.id}"]`, "Enter").catch(() => {});
    state.reset = { ...r, stage: "sent", at: Date.now() - 30_000 };
    await deps.progress("asked the portal for a password reset email");
    return "continue";
  }
  if (r.stage === "sent") {
    if (NO_ACCOUNT.test(s.body.slice(0, 3000))) {
      state.reset = undefined;
      return { kind: "needs_you", reason: "account", note: "the portal says there's no account for your email yet. Create it on the portal (or let the agents try again from Ivyward), then save the login under Portal logins" };
    }
    const link = await deps.resetLink!(r.at).catch(() => null);
    if (!link) {
      if (Date.now() - r.at > 20 * 60_000) {
        state.reset = undefined;
        return { kind: "needs_you", reason: "login", note: "the portal's password reset email hasn't arrived after 20 minutes. Reset it on the portal and save the new password under Portal logins" };
      }
      return { kind: "wait", note: "waiting for the portal's password reset email", seconds: 60 };
    }
    state.reset = { ...r, stage: "link" };
    await deps.progress("opening the password reset link from your email");
    await page.goto(link, { timeout: 45_000 });
    return "continue";
  }
  // on the page the reset link opened: set a new password, save it to the vault first, then submit
  if (!pw.length) return null;
  const fresh = await deps.rotatePassword!();
  for (const p of pw) await fillText(page, p.id, fresh.password);
  const email = s.allFields.find((f) => f.type === "email" || (f.type === "text" && /e-?mail/i.test(f.label)));
  if (email) await fillText(page, email.id, fresh.login_email).catch(() => {});
  const go = find(s, CREATE_SUBMIT) ?? s.buttons.find((b) => RESET_BTN.test(clean(b.label)));
  if (go) await click(page, go.id);
  else await page.pressEnter();
  state.reset = undefined;
  state.signedIn = false;
  await deps.progress("set a new portal password and saved it under Portal logins");
  return "continue";
}

// a button-dropdown (salesforce lightning) whose list isn't built until it's opened: open it, read the options,
// close it, so the choice is made from what's really there
async function readAriaOptions(page: Page, fields: PageField[]) {
  for (const f of fields.filter((x) => x.aria && !(x.options ?? []).length).slice(0, 12)) {
    try {
      await frameOf(page).click(`[data-am-id="${f.id}"]`, { timeout: 5_000 });
      await sleep(700);
      f.options = await frameOf(page)
        .evaluate((i: string) => (window as unknown as { __am: { openOptions(i: string): string[] } }).__am.openOptions(i), f.id)
        .catch(() => []);
      await page.pressKey?.("Escape").catch(() => {});
      await sleep(200);
    } catch {
      /* left without options: the mapper answers it as text, matched when chosen */
    }
  }
}

// choose in a button-dropdown: open it, click the option that matches
async function chooseAria(page: Page, id: string, option: string): Promise<boolean> {
  await frameOf(page).click(`[data-am-id="${id}"]`, { timeout: 8_000 });
  await sleep(700);
  const picked = await frameOf(page)
    .evaluate((v: string) => (window as unknown as { __am: { pickOption(v: string): string | null } }).__am.pickOption(v), option)
    .catch(() => null);
  if (!picked) await page.pressKey?.("Escape").catch(() => {});
  return !!picked;
}

const DATE_BOX = /\b(date|birth|birthdate|dob|d\.o\.b)\b/i;
const DATE_VALUE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|[A-Za-z]{3,9}\.? \d{1,2},? \d{4}|\d{1,2} [A-Za-z]{3,9}\.? \d{4})$/;

async function applyFills(page: Page, deps: EngineDeps, fields: PageField[], state?: EngineState): Promise<number> {
  const safe = fields.filter((f) => !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
  if (!safe.length) return 0;
  await readAriaOptions(page, safe);
  return applyList(page, deps, safe, await deps.map(safe), state);
}

// put a list of decisions on the page. search-as-you-type boxes get typed into, then the match is picked.
async function applyList(page: Page, deps: EngineDeps, safe: PageField[], fills: Fill[], state?: EngineState): Promise<number> {
  let n = 0;
  // a user id the page wants as first.last (calgary's eID): the name-built one instead of the email's first half
  if (fills.some((f) => f.action === "fill" && f.source === "username")) {
    const hint = await frameOf(page)
      .evaluate((n: number) => (document.body?.innerText ?? "").slice(0, n), 20000)
      .catch(() => "");
    if (/\bfirst(name)?\s*\.\s*last(name)?\b|first name\s*\.\s*last name|firstname\.lastname/i.test(hint)) {
      for (const f of fills) {
        const field = safe.find((x) => x.id === f.id);
        if (f.action !== "fill" || f.source !== "username" || !field) continue;
        const alt = deps.fillFromKey ? await deps.fillFromKey(field, "username_first_last") : null;
        if (alt && alt.action === "fill") f.value = alt.value;
      }
    }
  }
  // dates are kept as 2000-12-31; a text box on a page that shows its own format gets that format instead
  if (fills.some((f) => f.action === "fill" && ISO_DATE.test(f.value) && safe.find((x) => x.id === f.id)?.type !== "date")) {
    const hint = await frameOf(page)
      .evaluate((n: number) => (document.body?.innerText ?? "").slice(0, n), 20000)
      .catch(() => "");
    for (const f of fills) {
      const field = safe.find((x) => x.id === f.id);
      if (f.action === "fill" && ISO_DATE.test(f.value) && field?.type !== "date") f.value = dateAs(f.value, `${field?.label ?? ""} ${hint} ${await page.url()}`);
    }
  }
  // a repeating section's second, third… entry: the rules map its boxes to edu1_/work1_ every time; move them on to
  // the entry this one is (edu2_, edu3_…). nothing left to enter: those boxes are left alone
  for (const kind of ["edu", "work"] as const) {
    const done = state?.entries?.[kind] ?? 0;
    if (!done || !deps.fillFromKey) continue;
    for (const f of fills) {
      if (f.action === "skip" || !("source" in f) || !new RegExp(`^${kind}1_`).test(f.source)) continue;
      const field = safe.find((x) => x.id === f.id);
      const next = field ? await deps.fillFromKey(field, f.source.replace(`${kind}1_`, `${kind}${done + 1}_`)) : null;
      if (next) Object.assign(f, next);
      else Object.assign(f, { action: "skip", reason: `no ${kind} entry ${done + 1}` });
    }
  }
  // a box that takes fewer characters than the answer: cut short lines at a word; never an essay (it's flagged)
  for (const f of fills) {
    const field = safe.find((x) => x.id === f.id);
    if (f.action !== "fill" || !field?.maxLength || f.value.length <= field.maxLength) continue;
    if (f.source.startsWith("essay:")) {
      if (state) state.missingDocs = [...new Set([...(state.missingDocs ?? []), `a shorter "${cleanLabel(field.label, field.options).slice(0, 50)}" (the box takes ${field.maxLength} characters; yours has ${f.value.length})`])];
      Object.assign(f, { action: "skip", reason: "too long" });
      continue;
    }
    const cut = f.value.slice(0, field.maxLength);
    f.value = (cut.lastIndexOf(" ") > field.maxLength * 0.6 ? cut.slice(0, cut.lastIndexOf(" ")) : cut).trim();
  }
  for (const f of fills) {
    const n0 = n;
    try {
      if (f.action === "skip") {
        const field = safe.find((x) => x.id === f.id);
        // a required upload the packet has no file for: a document to add, not a question to answer
        if (state && field?.type === "file" && field.required) {
          state.missingDocs = [...new Set([...(state.missingDocs ?? []), cleanLabel(field.label, field.options).slice(0, 80) || "a required document"])];
          continue;
        }
        if (state && f.reason.startsWith("missing:") && field?.required) {
          state.missing = [...new Set([...(state.missing ?? []), f.reason.slice(8)])];
          ask(state, field, f.reason.slice(8));
        }
        continue;
      }
      if (f.action === "upload") {
        // PDF when the box (its accept list) or the page says so: Word files are converted on the way
        const accept = await frameOf(page)
          .evaluate((id: string) => String(((window as unknown as { __am?: { byId?(i: string): Element | null } }).__am?.byId?.(id) as HTMLInputElement | null)?.accept ?? ""), f.id)
          .catch(() => "");
        const pdf = !!state?.pdfOnly || (/pdf/i.test(accept) && !/(doc|word|officedocument|\*)/i.test(accept));
        const file = await deps.file(f.file, { pdf });
        await frameOf(page).setInputFiles(`[data-am-id="${f.id}"]`, { ...file, name: safeFileName(file.name) });
        n++;
        // uploads often finish in the background (a progress bar): let it end before the next step
        await sleep(1500);
        await settle(page);
        continue;
      }
      const field = safe.find((x) => x.id === f.id);
      if (field?.aria && (f.action === "choose" || f.action === "fill")) {
        if (await chooseAria(page, f.id, f.action === "choose" ? f.option : f.value)) {
          n++;
          await settle(page);
        }
        continue;
      }
      if (field?.combo && f.action === "fill") {
        const sel = `[data-am-id="${f.id}"]`;
        await frameOf(page).fill(sel, f.value, { timeout: 8_000 });
        await sleep(900);
        const picked = await frameOf(page).evaluate((v: string) => (window as unknown as { __am: { pickOption(v: string): string | null } }).__am.pickOption(v), f.value).catch(() => null);
        if (picked) n++;
        continue;
      }
      // a date in a plain text box: typed key by key and tabbed out of. salesforce lightning's date box ignores a value
      // set by script and says "Birthdate is required" on Next (ut dallas)
      const fr = frameOf(page);
      if (f.action === "fill" && fr.typeKeys && field && (field.type === "text" || field.type === "tel") && DATE_BOX.test(`${field.label} ${field.name ?? ""}`) && DATE_VALUE.test(f.value.trim())) {
        try {
          await fr.typeKeys(`[data-am-id="${f.id}"]`, f.value);
          n++;
          await settle(page);
          continue;
        } catch {
          /* the usual way below */
        }
      }
      const ok = await fr.evaluate((x) => (window as unknown as { __am: { apply(f: unknown): boolean } }).__am.apply(x), f);
      if (ok) n++;
      // a list or tick box that sends the form to the server as soon as it changes (peoplesoft's
      // submitAction): wait for the reply, or it redraws the form over what gets typed next
      if (ok && (f.action === "choose" || f.action === "check")) await settle(page);
    } catch {
      /* a field we couldn't set stays empty and is reported as a question */
    } finally {
      if (n > n0 && deps.onFilled && f.action !== "skip") {
        const label = safe.find((x) => x.id === f.id)?.label ?? "";
        const value = f.action === "fill" ? f.value : f.action === "choose" ? f.option : f.action === "upload" ? f.file : "ticked";
        try {
          deps.onFilled({ id: f.id, label, action: f.action, value, source: f.source });
        } catch {
          /* display only */
        }
      }
    }
  }
  return n;
}

// wait until the page stops changing: no DOM changes for 700ms (5s at most). a form that posts back on every
// choice redraws itself a moment later, and typing before that is lost
async function settle(page: Page) {
  await sleep(300);
  await frameOf(page)
    .evaluate(
      (max: number) =>
        new Promise<boolean>((done) => {
          let last = Date.now();
          const start = last;
          const mo = new MutationObserver(() => (last = Date.now()));
          mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
          const t = setInterval(() => {
            if (Date.now() - last > 700 || Date.now() - start > max) {
              clearInterval(t);
              mo.disconnect();
              done(true);
            }
          }, 100);
        }),
      5000,
    )
    .catch(() => {});
  await page.waitForLoadState("domcontentloaded").catch(() => {});
}

// account terms: covered by the applicant's signed authorization to create the account
async function acceptTerms(page: Page, s: Snapshot) {
  for (const f of s.fields.filter((x) => x.type === "checkbox" && TERMS.test(x.label))) {
    await frameOf(page).evaluate((id) => (window as unknown as { __am: { apply(f: unknown): boolean } }).__am.apply({ id, action: "check" }), f.id).catch(() => {});
  }
}
