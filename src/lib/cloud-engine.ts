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
  allFields: { id: string; label: string; type: string; autocomplete?: string; required?: boolean }[];
  buttons: { id: string; label: string; link: boolean }[];
  errors?: string[];
}

export interface EngineState {
  steps: number;
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
  progress(note: string): Promise<void>;
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
const CREATE = /^(create (an |new |your )?account|register|sign up|new (user|applicant)s?|first.?time (user|applicant)s?.*|create (a )?login)$/i;
const SIGNIN = /^(sign in|log ?in|login|continue|next|submit)$/i;
const CREATE_SUBMIT = /^(create( (an |my )?account)?|register|sign up|continue|submit|next|(set|save|create|update|change|choose) (my |your |a )?password|save|activate( (my )?account)?|finish|complete( registration)?|confirm)$/i;
const VERIFY_BTN = /^(verify|confirm|submit|continue|next|activate|log ?in|login|sign in)$/i;
const SIGNUP_WORDS = /(create (an |your )?account|register|sign up|new user|confirm password|re-?enter password)/i;
const CHECK_EMAIL = /(check your (e-?mail|inbox)|verify your e-?mail|we('ve| have) sent (you )?(an? )?(e-?mail|code|link)|activation (link|e-?mail)|confirm your e-?mail)/i;
const CODE_LABEL = /(verification|security|confirmation|access|one.?time|activation)?\s*(code|pin|otp|passcode)\b/i;
const REGISTER_PAGE = /(regist|create.?(an.?)?account|sign.?up|new.?user)/i;
const LOGIN_LINK = /^(log ?in|login|sign ?in)( here| now)?$|^returning (users?|applicants?)/i;
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

async function snap(page: Page): Promise<Snapshot> {
  const main = (await snapFrame(page.mainFrame()))!;
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
const find = (s: Snapshot, re: RegExp, linksOnly = false) => s.buttons.find((b) => re.test(clean(b.label)) && (!linksOnly || b.link));

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
    if (state.samePageCount >= 2 && REGISTER_PAGE.test(`${s.url} ${s.title}`) && !(state.missing ?? []).length && !/(invalid|do(es)? not exist|already (exists|registered|in use)|not (be )?found|error)/i.test(s.body)) {
      return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
    }
    if (state.samePageCount >= 3) {
      const req = s.fields.map((f) => f.label.slice(0, 50));
      const fix = missingNote(state.missing ?? []);
      const err = (s.errors ?? []).join("; ").slice(0, 160);
      return { outcome: { kind: "needs_you", reason: "stuck", note: fix || (err ? `the portal says: ${err}` : req.length ? `the portal wants: ${req.slice(0, 3).join("; ")}` : "the portal didn't accept this page") }, state, filled };
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
      const login = await deps.existingLogin();
      if (!login) {
        const create = find(s, CREATE);
        if (create) {
          await deps.progress("creating your portal account");
          await click(page, create.id);
          continue;
        }
        return { outcome: { kind: "needs_you", reason: "login", note: "the portal asks you to sign in and there's no way to create an account here. sign in once in the live view" }, state, filled };
      }
      const pw = s.allFields.find((f) => f.type === "password")!;
      const user = s.allFields.find((f) => f.type !== "password" && f.type !== "checkbox" && /(e-?mail|user|login|account)/i.test(`${f.label} ${f.autocomplete ?? ""}`)) ?? s.allFields.find((f) => f.type === "email" || f.type === "text");
      // "user id" boxes get the user id we registered with (the email's local part), email boxes get the email
      if (user) await fillText(page, user.id, /user\s*(id|name)|login\s*(id|name)|identifiant/i.test(user.label) && !/e-?mail/i.test(user.label) ? login.login_email.split("@")[0].replace(/[^a-z0-9._-]/gi, "").slice(0, 30) : login.login_email);
      await fillText(page, pw.id, login.password);
      const go = find(s, SIGNIN);
      if (!go) return { outcome: { kind: "needs_you", reason: "login", note: "couldn't find the sign-in button" }, state, filled };
      await deps.progress("signing in to the portal");
      await click(page, go.id);
      const after = await snap(page);
      if (classify(after) === "login" && /(invalid|incorrect|wrong|not recogni[sz]ed|failed|does not exist|no account)/i.test(after.body)) {
        // a login that has never worked on this application: the applicant hasn't created the account yet
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
    const next = find(now, NEXT) ?? (!s.fields.length && haveLogin ? find(now, LOGIN_LINK) : undefined) ?? find(now, START) ?? find(now, CREATE) ?? (s.fields.length ? find(now, CREATE_SUBMIT) : undefined);
    if (next) {
      await click(page, next.id);
      continue;
    }
    if (kind === "confirmation") return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal says the application is complete, but the runner didn't submit it. check it" }, state, filled };
    return { outcome: { kind: "needs_you", reason: "stuck", note: "can't find the next step on this page; open the live view and move to the next section" }, state, filled };
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
  return labels.length ? `add your ${labels.slice(0, 4).join(", ")} under profile → details for application forms, then press try again` : "";
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
