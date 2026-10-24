// the cloud runner's brain: looks at a portal page and decides the next move, then does it.
// no db and no network of its own: everything outside the page comes in through deps, so the same
// engine runs on vercel against browserbase and in tests against a local chromium.
import type { Frame, Page } from "playwright-core";
import type { Fill, PageField } from "@/lib/runner-map";
import { NEVER_FILL } from "@/lib/fillsheet";
import { DOM_HELPER } from "@/lib/runner-dom";

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

export interface EngineState {
  steps: number;
  navCalls?: number;
  navHistory?: string[];
  triedMailLogin?: boolean;
  signedIn?: boolean; // a sign-in with the stored login has worked at least once
  missing?: string[]; // fill-sheet keys a portal asked for that the profile doesn't have
  reachedSubmit?: boolean;
  submitClicked?: boolean;
  accountAt?: number; // when we created the portal account (verification emails come after this)
  verifyWaitSince?: number;
  lastFingerprint?: string;
  samePageCount?: number;
}

export interface Login {
  login_email: string;
  password: string;
  status?: string; // "created" until a sign-in has worked once
}

export interface EngineDeps {
  map(fields: PageField[]): Promise<Fill[]>;
  file(key: string): Promise<{ name: string; mime: string; buffer: Buffer }>;
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
  fillFromKey?(field: PageField, key: string): Fill | null;
  // a login this portal emailed to the applicant (peoplesoft-style systems issue their own); saved to the vault
  loginFromMail?(since: number): Promise<Login | null>;
  progress(note: string): Promise<void>;
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
  | { kind: "needs_you"; note: string; reason: "captcha" | "payment" | "question" | "verification" | "stuck" | "login" | "account" }
  | { kind: "wait"; note: string; seconds: number } // try again later (e.g. waiting for the verification email)
  | { kind: "continue"; note: string } // out of time in this run; pick up straight away
  | { kind: "failed"; note: string };

const FINAL = /^(submit( (my|the|your))?( application)?|submit (and|&) pay|sign (and|&) submit|submit now|final submit)$/i;
const NEXT = /^(save (and|&) (continue|next)|next( page| section| step)?|continue( to .{0,30})?|proceed|save (and|&) proceed|go to next|save and go to next|suivant|continuer)\b/i;
const START = /^(start|begin|continue|resume) (my |an |your |a new |new )?application\b.{0,20}$|^apply( now| online| today| here)?( for (this|the) program.{0,30})?$|^start( here| now)?$|^(how to )?apply to (this|the) program$/i;
const CREATE = /^((create|register|sign up)( for| an| a| new| my| your)*( account| profile| login| here| e-?id| user ?id| username| applicant account)?|new (user|applicant)s?|first.?time (user|applicant)s?.*|create (a )?login|(get|request) (an? )?(e-?id|account))[?!.]*$/i;
const SIGNIN = /^(sign in|log ?in|login|continue|next|submit)$/i;
const CREATE_SUBMIT = /^(create( (an |my )?account)?|register|sign up|continue|submit|next|(set|save|create|update|change|choose) (my |your |a )?password|save|activate( (my )?account)?|finish|complete( registration)?|confirm)$/i;
const VERIFY_BTN = /^(verify|confirm|submit|continue|next|activate|log ?in|login|sign in)$/i;
const SIGNUP_WORDS = /(create (an |your )?account|register|sign up|new user|confirm password|re-?enter password)/i;
const CHECK_EMAIL = /(check your (e-?mail|inbox)|verify your e-?mail|we('ve| have) sent (you )?(an? )?(e-?mail|code|link)|activation (link|e-?mail)|confirm your e-?mail)/i;
const CODE_LABEL = /(verification|security|confirmation|access|one.?time|activation)?\s*(code|pin|otp|passcode)\b/i;
const REGISTER_PAGE = /(regist|create.?(an.?)?account|sign.?up|new.?user)/i;
const LOGIN_LINK = /^(log ?in|login|sign ?in)( here| now)?$|^returning (users?|applicants?)/i;

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
const TERMS = /(i (have read and )?(agree|accept)|terms (of use|and conditions|of service)|privacy (policy|notice))/i;

// pure: what kind of page is this?
export function classify(s: Snapshot): "confirmation" | "captcha" | "payment" | "login" | "signup" | "verify_code" | "check_email" | "form" {
  if (s.confirmation) return "confirmation";
  if (s.captcha) return "captcha";
  if (s.payment) return "payment";
  const pw = s.allFields.filter((f) => f.type === "password");
  const code = s.allFields.find((f) => f.type !== "password" && CODE_LABEL.test(f.label) && !/zip|postal|area|country/i.test(f.label));
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
    await f.evaluate(DOM_HELPER);
    return await f.evaluate(() => (window as unknown as { __am: { snapshot(): Snapshot } }).__am.snapshot());
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
  return { url: page.url(), title: "", body: "", captcha: false, payment: false, confirmation: false, fingerprint: `blank:${page.url()}`, fields: [], allFields: [], buttons: [] };
}

async function snap(page: Page): Promise<Snapshot> {
  const main = await snapMain(page);
  let best: { f: Frame; s: Snapshot } = { f: page.mainFrame(), s: main };
  const score = (x: Snapshot) => x.allFields.length * 3 + x.buttons.length;
  let confirmation = main.confirmation;
  let captcha = main.captcha;
  for (const f of page.frames()) {
    if (f === page.mainFrame() || !f.url().startsWith("http")) continue;
    const s = await snapFrame(f);
    if (!s) continue;
    confirmation ||= s.confirmation;
    captcha ||= s.captcha;
    if ((s.allFields.length || s.buttons.length > main.buttons.length) && score(s) > score(best.s)) best = { f, s };
  }
  active.set(page, best.f);
  // page-level signals (bot checks, confirmations) count from any frame
  return { ...best.s, captcha, confirmation, title: main.title || best.s.title };
}

async function click(page: Page, id: string) {
  const sel = `[data-am-id="${id}"]`;
  // "start your application" links often open a new tab: follow them here instead
  const href = await frameOf(page)
    .evaluate((q) => {
      const a = document.querySelector(q) as HTMLAnchorElement | null;
      return a && a.tagName === "A" && a.target && a.target !== "_self" && /^https?:/.test(a.href) ? a.href : null;
    }, sel)
    .catch(() => null);
  if (href) {
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await sleep(1200);
    return;
  }
  try {
    await Promise.all([page.waitForLoadState("domcontentloaded").catch(() => {}), frameOf(page).click(sel, { timeout: 8_000 })]);
  } catch {
    // something overlaps the button (peoplesoft's invisible layers, cookie bars): press it directly
    await frameOf(page).evaluate((s) => (document.querySelector(s) as HTMLElement | null)?.click(), sel);
  }
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await sleep(1200);
}

async function fillText(page: Page, id: string, value: string) {
  await frameOf(page).fill(`[data-am-id="${id}"]`, value, { timeout: 10_000 });
}

// bilingual portals label buttons "Log in / Ouvrez une session": match on the first language
const clean = (l: string) => l.replace(/[\u2190-\u21ff\u2794-\u27bf›»<>←→]+/g, " ").split(/\s+\/\s+|\s+\|\s+/)[0].replace(/\s+/g, " ").trim();
// a link back to the page we're on ("Apply Now" in the menu of the apply page) goes nowhere: skip it
const here = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "");
const goesSomewhere = (s: Snapshot, b: { href?: string }) => !b.href || /^javascript:/i.test(b.href) ? true : here(b.href) !== here(s.url);
const find = (s: Snapshot, re: RegExp, linksOnly = false) => s.buttons.find((b) => re.test(clean(b.label)) && (!linksOnly || b.link) && goesSomewhere(s, b));

export async function runEngine(page: Page, deps: EngineDeps, state: EngineState, budgetMs: number): Promise<{ outcome: Outcome; state: EngineState; filled: number }> {
  const end = Date.now() + budgetMs;
  let filled = 0;
  while (Date.now() < end) {
    state.steps += 1;
    if (state.steps > 60) return { outcome: { kind: "needs_you", reason: "stuck", note: "this portal has more pages than one run allows; take over from here" }, state, filled };
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await sleep(800);
    const s = await snap(page);

    // loop guard: the same page three times in a row means the portal won't take what we gave it
    state.samePageCount = s.fingerprint === state.lastFingerprint ? (state.samePageCount ?? 0) + 1 : 0;
    state.lastFingerprint = s.fingerprint;
    // a sign-up form that won't move even though everything is filled: the portal blocks automated sign-ups.
    // the applicant creates the account once (with our generated password); we sign in from then on.
    if (REGISTER_PAGE.test(s.url) && /^(forbidden|access denied|403|request blocked)/i.test(s.title.trim() || s.body.trim().slice(0, 40))) {
      return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
    }
    if (state.samePageCount >= 2 && REGISTER_PAGE.test(`${s.url} ${s.title}`) && !(state.missing ?? []).length && !/(invalid|do(es)? not exist|already (exists|registered|in use)|not (be )?found|error)/i.test(s.body)) {
      return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
    }
    if (state.samePageCount >= 3) {
      const req = s.fields.map((f) => f.label.slice(0, 50));
      const fix = missingNote(state.missing ?? []);
      const err = (s.errors ?? []).join("; ").slice(0, 160);
      const stop: Outcome = { kind: "needs_you", reason: "stuck", note: fix || (err ? `the portal says: ${err}` : req.length ? `the portal wants: ${req.slice(0, 3).join("; ")}` : "the portal didn't accept this page") };
      if (fix || state.samePageCount >= 6) return { outcome: stop, state, filled };
      // the usual moves aren't working on this page: let the navigator look at it
      const o = await navStep(page, deps, s, state, `the same page came back ${state.samePageCount} times after the usual steps${err ? `; the portal shows: ${err}` : ""}`, stop);
      if (o) return { outcome: o, state, filled };
      continue;
    }

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

    if (kind === "login") {
      let login = await deps.existingLogin();
      // never create a second account: first look for a login this portal already emailed
      if (!login && deps.loginFromMail) login = await deps.loginFromMail(Date.now() - 60 * 86_400_000);
      if (!login) {
        const create = find(s, CREATE);
        if (create) {
          await deps.progress("creating your portal account");
          state.accountAt = Date.now();
          await click(page, create.id);
          continue;
        }
        return { outcome: { kind: "needs_you", reason: "login", note: "this portal only has a sign-in page, with no way to create an account here. Create your account where the school says, then add it under Portal logins; the agents sign in with it and carry on" }, state, filled };
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
      if (classify(after) === "login" && /(invalid|incorrect|wrong|not recogni[sz]ed|failed|does not exist|no account)/i.test(after.body)) {
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
        if (!state.signedIn) return { outcome: { kind: "needs_you", reason: "account", note: "waiting for you to create the portal account" }, state, filled };
        return { outcome: { kind: "needs_you", reason: "login", note: "the portal rejected the saved password. if you changed it, update it in automaster" }, state, filled };
      }
      state.signedIn = true;
      continue;
    }

    if (kind === "signup") {
      const login = (await deps.existingLogin()) ?? (await deps.createLogin(deps.accountEmail));
      await deps.progress("creating your portal account");
      const pws = s.allFields.filter((f) => f.type === "password");
      for (const p of pws) await fillText(page, p.id, login.password);
      // email (and confirm email) get the applicant's login email; everything else from the fill sheet
      const others = s.fields.filter((f) => f.type !== "password");
      for (const f of others.filter((f) => f.type === "email" || /e-?mail/i.test(f.label))) await fillText(page, f.id, login.login_email);
      const rest = others.filter((f) => !(f.type === "email" || /e-?mail/i.test(f.label)));
      filled += await applyFills(page, deps, rest, state);
      await acceptTerms(page, s);
      const go = find(s, CREATE_SUBMIT);
      if (!go) return { outcome: { kind: "needs_you", reason: "stuck", note: "filled the sign-up form but couldn't find the create button" }, state, filled };
      state.accountAt = Date.now();
      await click(page, go.id);
      continue;
    }

    if (kind === "verify_code" || kind === "check_email") {
      const since = state.accountAt ?? state.verifyWaitSince ?? Date.now() - 30 * 60_000;
      state.verifyWaitSince ??= Date.now();
      if (!deps.canReadMail) {
        return { outcome: { kind: "needs_you", reason: "verification", note: `the portal sent a verification ${kind === "verify_code" ? "code" : "link"} to your email. open the live view and enter it (connect gmail so the agents can do this for you)` }, state, filled };
      }
      const v = await deps.verification(since);
      if (!v || (!v.code && !v.link)) {
        if (Date.now() - state.verifyWaitSince > 20 * 60_000) return { outcome: { kind: "needs_you", reason: "verification", note: "the portal's verification email hasn't arrived after 20 minutes" }, state, filled };
        return { outcome: { kind: "wait", note: "waiting for the portal's verification email", seconds: 60 }, state, filled };
      }
      state.verifyWaitSince = undefined;
      if (kind === "verify_code" && v.code) {
        const box = s.allFields.find((f) => CODE_LABEL.test(f.label))!;
        await fillText(page, box.id, v.code);
        const go = find(s, VERIFY_BTN);
        if (go) await click(page, go.id);
        else await page.keyboard.press("Enter");
        continue;
      }
      if (v.link) {
        await deps.progress("confirming your email with the portal");
        await page.goto(v.link, { waitUntil: "domcontentloaded" });
        continue;
      }
      return { outcome: { kind: "needs_you", reason: "verification", note: "found the verification email but couldn't use it; open the live view" }, state, filled };
    }

    // an ordinary form page
    if (s.fields.length) {
      await deps.progress(`filling ${s.fields.length} field${s.fields.length > 1 ? "s" : ""}`);
      filled += await applyFills(page, deps, s.fields, state);
      await acceptTerms(page, s);
      await sleep(1500);
      const tried = new Set(s.fields.map((f) => f.id));
      const fresh = (await snap(page)).fields.filter((f) => !tried.has(f.id) || (f.options?.length ?? 0) > (s.fields.find((x) => x.id === f.id)?.options?.length ?? 0));
      if (fresh.length) filled += await applyFills(page, deps, fresh, state);
    }
    const now = await snap(page);
    const empty = now.fields.filter((f) => f.required).map((f) => f.label.slice(0, 50));
    if (empty.length) {
      const fix = missingNote(state.missing ?? []);
      return { outcome: { kind: "needs_you", reason: "question", note: (fix || `answer ${empty.length} question${empty.length > 1 ? "s" : ""} your profile doesn't cover: ${empty.slice(0, 3).join("; ")}`).slice(0, 290) }, state, filled };
    }

    const submit = find(now, FINAL);
    if (submit) {
      state.reachedSubmit = true;
      const d = await deps.canSubmit();
      if (!d.allowed) return { outcome: { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` }, state, filled };
      await deps.progress("submitting your signed packet");
      state.submitClicked = true;
      await click(page, submit.id);
      continue;
    }
    // landing pages offer "log in" and "create an account": once there's a login on file, sign in
    const haveLogin = !s.fields.length && !!(await deps.existingLogin());
    const next = find(now, NEXT) ?? (!s.fields.length && haveLogin ? find(now, LOGIN_LINK) ?? findBy(now, isSignIn) : undefined) ?? find(now, START) ?? find(now, CREATE) ?? (s.fields.length ? find(now, CREATE_SUBMIT) : undefined);
    if (next) {
      await click(page, next.id);
      continue;
    }
    if (kind === "confirmation") return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal says the application is complete, but the runner didn't submit it. check it" }, state, filled };
    const o = await navStep(page, deps, now, state, "none of the usual buttons (next, continue, start, sign in, create account) are on this page", { kind: "needs_you", reason: "stuck", note: "can't find the next step on this page; open the portal and move to the next section" });
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

const NAV_BUDGET = 12; // model-driven steps per run
const DANGEROUS = /\b(pay|payment|checkout|delete|remove|withdraw|cancel (my |the )?application|deactivate|unsubscribe|sign out|log ?out)\b/i;

// ask the navigator for one step and do it. returns null to keep looping, or an outcome to stop with.
async function navStep(page: Page, deps: EngineDeps, s: Snapshot, state: EngineState, why: string, fallback: Outcome): Promise<Outcome | null> {
  if (!deps.navigate || (state.navCalls ?? 0) >= NAV_BUDGET) return fallback;
  state.navCalls = (state.navCalls ?? 0) + 1;
  const history = state.navHistory ?? [];
  const a = await deps.navigate({ why, snapshot: s, history: history.slice(-8), signedIn: !!state.signedIn, haveLogin: !!(await deps.existingLogin()) }).catch(() => null);
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
    if (!/^https:\/\//.test(a.url) || (!onPage && root(a.url) !== root(s.url))) {
      log(`refused goto ${a.url}`);
      return null;
    }
    log(`goto ${a.url}`);
    await page.goto(a.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await sleep(1200);
    return null;
  }
  if (a.action === "fill") {
    const f = s.fields.find((x) => x.id === a.target_id);
    const fill = f && deps.fillFromKey ? deps.fillFromKey(f, a.sheet_key) : null;
    if (!f || !fill || NEVER_FILL.test(`${f.label} ${f.name ?? ""}`)) {
      log(`couldn't fill ${f?.label ?? a.target_id} from ${a.sheet_key}`);
      return null;
    }
    log(`fill "${f.label.slice(0, 40)}" from ${a.sheet_key}`);
    if (fill.action === "upload") {
      const file = await deps.file(fill.file);
      await frameOf(page).setInputFiles(`[data-am-id="${f.id}"]`, { name: file.name, mimeType: file.mime, buffer: file.buffer });
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
  log(`click "${label}"`);
  await deps.progress(a.note ? a.note.slice(0, 80) : `pressing "${label}"`);
  await click(page, b.id);
  return null;
}

async function applyFills(page: Page, deps: EngineDeps, fields: PageField[], state?: EngineState): Promise<number> {
  const safe = fields.filter((f) => !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
  if (!safe.length) return 0;
  const fills = await deps.map(safe);
  let n = 0;
  for (const f of fills) {
    try {
      if (f.action === "skip") {
        if (state && f.reason.startsWith("missing:") && safe.find((x) => x.id === f.id)?.required) state.missing = [...new Set([...(state.missing ?? []), f.reason.slice(8)])];
        continue;
      }
      if (f.action === "upload") {
        const file = await deps.file(f.file);
        await frameOf(page).setInputFiles(`[data-am-id="${f.id}"]`, { name: file.name, mimeType: file.mime, buffer: file.buffer });
        n++;
        continue;
      }
      const ok = await frameOf(page).evaluate((x) => (window as unknown as { __am: { apply(f: unknown): boolean } }).__am.apply(x), f);
      if (ok) n++;
    } catch {
      /* a field we couldn't set stays empty and is reported as a question */
    }
  }
  return n;
}

// account terms: covered by the applicant's signed authorization to create the account
async function acceptTerms(page: Page, s: Snapshot) {
  for (const f of s.fields.filter((x) => x.type === "checkbox" && TERMS.test(x.label))) {
    await frameOf(page).evaluate((id) => (window as unknown as { __am: { apply(f: unknown): boolean } }).__am.apply({ id, action: "check" }), f.id).catch(() => {});
  }
}
