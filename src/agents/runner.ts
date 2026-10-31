import "server-only";
import { keyForLabel } from "@/lib/fillsheet";
import { cleanLabel } from "@/lib/labels";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent, recordOutcome } from "@/lib/events";
import { research } from "@/lib/research";
import { runStructured } from "@/lib/llm";
import { decideFields, loadApp, loadSheet, looseSheet, mapFields, sheetFile, submitDecision, type MapMemory } from "@/lib/runner";
import { bareLink, fieldHints, host as hostOf, knownApplyUrl, learn, learnWaiver, portalNeedsChrome } from "@/lib/school-memory";
import { createLogin, getLogin, markLogin, rotatePassword, saveIssuedLogin } from "@/lib/vault";
import { canReadMail, recentMail } from "@/lib/gmail";
import { extractCredentials, extractVerification, hostRoot } from "@/lib/verify-mail";
import { decrypt, encrypt } from "@/lib/crypto";
import type { StorageState } from "@/lib/browser";
import { runEngine, type EngineDeps, type EngineState, type NavInput } from "@/lib/cloud-engine";
import { fromPlaywright } from "@/lib/engine-page";
import { recordQuestions } from "@/lib/portal-questions";
import { resolve, keyMenu } from "@/lib/runner-map";
import type { FillSheet } from "@/lib/fillsheet";
import { looksLikePortal, normalizeUrl } from "@/lib/portal-url";
import { crawlForApply } from "@/lib/apply-crawl";
import { hostRoot as rootOf } from "@/lib/verify-mail";
import { notify } from "@/lib/notify";
import { askToPay, paymentNeeded } from "@/lib/billing";
import { say } from "@/lib/followups";
const sentenceCase = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

// the cloud runner: finds the portal, creates the applicant's account, fills, uploads and submits
// the signed packet from our servers. nothing to install for the applicant.

// as long as the hosting plan lets one run go (300s), leaving time to save its place; when time runs out the next
// run starts at once from the same page with the same browser session, so the work carries on until it's done
const RUN_BUDGET_MS = 255_000;
// every recurring check on the platform runs every 5 minutes
export const RECHECK_MINUTES = 5;
const RECHECKS = 16; // after a handoff (bot check, payment), look again this many times, 5 min apart (about 80 minutes)

const NavOut = z.object({
  action: z.enum(["click", "fill", "goto", "wait_email", "handoff", "done"]),
  target_id: z.string(),
  sheet_key: z.string(),
  url: z.string(),
  note: z.string(),
});

const NAV_SYSTEM = `you drive a university application portal in a browser for an applicant who has reviewed and signed their application packet, and authorised the agents to create their portal account and complete the application.
goal: get the application for the named program filled in and submitted. work like a capable person at a keyboard: read the page, then take ONE next step.
actions:
- click: press the button/link with target_id (ids from the buttons list). use it to open the application, create an account, sign in, start or continue an application, choose the right program, open the next section, save, or submit.
- fill: put the applicant's answer into the empty field target_id, from sheet_key (a key in the fill sheet). never invent values.
- goto: open url (a link on this page or the same site).
- wait_email: the portal sent an email (code, link, or login) and nothing else can be done until it arrives.
- handoff: ONLY for a bot check (captcha), a payment, or a personal fact the sheet truly doesn't have. note says exactly what the applicant must do, in one plain sentence.
- done: the application is already submitted.
how to find your way:
- school and program pages: the application is always linked somewhere. look for apply online, apply now, start your application, online application, how to apply, application portal, apply via (ucas, slate, the school's system), admissions, or a menu. follow it.
- sign-in pages: if no login is on file, look for create account, register, sign up, new user, new applicant, first-time applicant, or a tab for registering. it is usually there.
- program names on portals rarely match exactly ("MSc Finance" vs "Finance (MSc) - Full time"): pick the closest match for the same subject and level. that is never a reason to hand off.
- lists of applications or programs: choose the one matching the program. dashboards: open the application in progress, or start a new one.
- prefer the main application flow over news, events, fees or other programs.
rules: never press pay/checkout/delete/withdraw/sign out. explain your choice in note (short).`;

const SEE_SYSTEM = `you operate a web browser for an applicant, looking at a screenshot of a university application portal (1280x900 css pixels). every clickable or typeable element in view has a red box with a number; the list of marks gives each number's type, label and current value.
the applicant has signed their packet and authorised the agents to complete the application. take ONE small step toward the goal, the way a careful person would.
actions (point at elements with mark; use x, y only for something without a mark):
- click: open a dropdown, pick an option in an open list, tick a box or radio, press a button or link, open a tab or accordion, focus a box, dismiss a cookie banner or popup.
- double_click: select a word, or open something that needs it.
- type: click the box and type the value of sheet_key (a fill-sheet key; the value is typed for you, replacing what's there). to search a long list, put a short part of that value in text (e.g. "Niger" for Nigeria), then click the right suggestion next step.
- clear: empty a box that has a wrong value.
- key: Enter, Tab, Shift+Tab, Escape, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Space, Backspace, Delete, PageDown, PageUp, Home, End. arrow keys move through an open list; Enter picks; Escape closes a stuck popup.
- scroll: direction up or down (with mark, scrolls inside that element, e.g. a long dropdown list).
- hover: reveal a menu that opens on hover.
- upload: put a document (file = one of the document keys) into the file box or "upload" button at mark.
- back: go back a page after a wrong turn.
- wait: the page is loading or a spinner is showing.
- done: the goal is reached, or nothing more can be done on this screen.
- handoff: a bot check, a payment, or a question about the applicant the fill sheet can't answer. note says what the applicant must do.
how to work:
- a plain dropdown (mark type select): use type with the sheet_key; the matching option is chosen for you. clicking it won't work (its list doesn't show in screenshots).
- custom dropdowns (comboboxes, styled lists): click to open, then click the option (scroll the list or type a few letters if it's long). check the value in the marks list afterwards.
- dates: use the date picker or type in the format the box shows. radio and checkbox labels can be clicked instead of the tiny circle.
- match the applicant's sheet values, allowing for wording ("Fall / Automne 2027" is fall-2027; "Nigerian" is Nigeria). never invent facts.
- read the recent steps: if a step "changed nothing", don't repeat it: try a different element, the keyboard, scrolling, or closing whatever is in the way.
- never click pay, delete, withdraw or sign out.`;

const SeeOut = z.object({
  action: z.enum(["click", "double_click", "type", "clear", "key", "scroll", "hover", "upload", "back", "wait", "done", "handoff"]),
  mark: z.number(),
  x: z.number(),
  y: z.number(),
  sheet_key: z.string(),
  text: z.string(),
  key: z.string(),
  file: z.string(),
  direction: z.string(),
  note: z.string(),
});

function navPrompt(n: NavInput, sheet: FillSheet, goal?: string) {
  const s = n.snapshot;
  const fields = s.fields.slice(0, 60).map((f) => `${f.id} | ${f.type}${f.required ? " required" : ""} | ${f.label.slice(0, 90)}${f.options?.length ? ` | options: ${f.options.slice(0, 10).join(" / ").slice(0, 160)}` : ""}`);
  const buttons = s.buttons.slice(0, 80).map((b) => `${b.id} | ${b.label.slice(0, 60)}${b.href ? ` | ${b.href.slice(0, 100)}` : ""}`);
  return `${goal ? `task: ${goal}\n` : ""}program: ${sheet.program} at ${sheet.school}
why you're being asked: ${n.why}
signed in: ${n.signedIn ? "yes" : "not yet"}; login on file: ${n.haveLogin ? "yes" : "no"}
recent steps: ${n.history.join(" → ") || "none"}

page: ${s.title} (${s.url})
portal errors: ${(s.errors ?? []).join("; ") || "none"}
page text: ${s.body.slice(0, 1800)}

empty fields:
${fields.join("\n") || "none"}

buttons and links:
${buttons.join("\n") || "none"}`;
}

const CredOut = z.object({ username: z.string(), password: z.string() });

// a login the portal emailed to the applicant, read from their inbox and kept in the vault
async function issuedLogin(userId: string, applicationId: string, jobId: string | null, host: string, since: number) {
  const root = hostRoot(host);
  const mails = await recentMail(userId, `newer_than:60d from:${root} (password OR "user id" OR userid OR username OR identifiant OR "mot de passe" OR account OR compte)`, 6).catch(() => []);
  for (const m of mails.filter((x) => x.at >= since).sort((a, b) => b.at - a.at)) {
    let c = extractCredentials(m);
    if (!c.username || !c.password) {
      // unusual wording: let the cheap model read just this one email
      try {
        const { output } = await runStructured({
          userId,
          agent: "runner",
          jobId: jobId ?? undefined,
          promptVersion: "issued-login-v1",
          tier: "cheap",
          system: "extract the portal login (user id or username, and password) that this email gives the applicant. empty strings if the email doesn't contain one. copy them exactly.",
          prompt: `subject: ${m.subject}\n\n${(m.text || m.html.replace(/<[^>]+>/g, " ")).slice(0, 4000)}`,
          schema: CredOut,
          maxTokens: 200,
        });
        c = { username: output.username || c.username, password: output.password || c.password };
      } catch {
        /* keep what the patterns found */
      }
    }
    if (c.username && c.password) return saveIssuedLogin(userId, applicationId, host, c.username, c.password);
  }
  return null;
}

const PortalOut = z.object({ portal_url: z.string(), account_needed: z.enum(["yes", "no", "unknown"]), notes: z.string() });

export type RunnerState = EngineState & { storage_enc?: string; last_url?: string; rechecks?: number; reason?: string | null; resume_at?: number; paused?: boolean; picks?: Record<string, string> };

export async function setRunner(applicationId: string, patch: Record<string, unknown>) {
  await admin().from("applications").update({ ...patch, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
}

// everything the engine needs from our side (fill sheet, logins vault, inbox, the navigator model). the browser
// is separate: playwright in the cloud, the applicant's chrome through the extension, or a live session.
export interface DepsCtx {
  userId: string;
  applicationId: string;
  jobId: string | null;
  sheet: FillSheet;
  readMail: boolean;
  host: () => string;
  goal?: string; // a follow-up job rather than the application itself
  memory?: MapMemory; // field labels learned on this portal, and the model's picks this run
}
export function serverDeps(c: DepsCtx): EngineDeps {
  let lastNote = "";
  // the applicant can pause or cancel at any time: running engines notice within a few seconds
  let stopped = false;
  let checkedAt = 0;
  const check = async () => {
    checkedAt = Date.now();
    stopped = !!(await userHalted(c.applicationId));
    return stopped;
  };
  return {
    shouldStop: () => {
      if (Date.now() - checkedAt > 6000) void check().catch(() => {});
      return stopped;
    },
    map: (fields) => mapFields(c.userId, c.sheet, fields, c.memory),
    file: (key) => sheetFile(c.userId, c.sheet, key),
    canSubmit: () => submitDecision(c.userId, c.applicationId),
    existingLogin: () => getLogin(c.userId, c.host(), c.applicationId),
    createLogin: async (email) => {
      const l = await createLogin(c.userId, c.applicationId, c.host(), email);
      await logEvent({ userId: c.userId, actor: "agent:runner", action: "runner.account_created", applicationId: c.applicationId, channel: "portal", context: { host: c.host(), email } });
      return l;
    },
    accountEmail: c.sheet.fields.email ?? "",
    canReadMail: c.readMail,
    navigate: async (n) => {
      const { output } = await runStructured({
        userId: c.userId,
        agent: "runner",
        jobId: c.jobId ?? undefined,
        promptVersion: "nav-v1",
        topic: hostOf(`https://${c.host()}`),
        tier: "cheap",
        system: NAV_SYSTEM,
        cachePrefix: `fill sheet keys (fill only from these):\n${keyMenu(c.sheet)}`,
        prompt: navPrompt(n, c.sheet, c.goal),
        schema: NavOut,
        maxTokens: 400,
      });
      return output;
    },
    fillFromKey: (f, key) => resolve(f, key, c.sheet),
    decide: (fields, page) => decideFields(c.userId, c.sheet, fields, page, c.jobId ?? undefined),
    sheetValue: (key) => c.sheet.fields[key] ?? null,
    hasValue: (label) => {
      const k = keyForLabel(cleanLabel(label));
      return !!k && !!c.sheet.fields[k];
    },
    see: async (v) => {
      const { output } = await runStructured({
        userId: c.userId,
        agent: "runner",
        jobId: c.jobId ?? undefined,
        promptVersion: "see-v1",
        topic: hostOf(`https://${c.host()}`),
        tier: "chat",
        system: SEE_SYSTEM,
        cachePrefix: `applying to: ${c.sheet.program} at ${c.sheet.school}\nfill sheet keys (type only these):\n${keyMenu(c.sheet)}`,
        prompt: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(v.image).toString("base64") } },
          {
            type: "text",
            text: `${c.goal ? `the job: ${c.goal}\n` : ""}goal: ${v.goal}\npage: ${v.url}\n${v.empty.length ? `required questions still blank: ${v.empty.join("; ")}\n` : ""}documents you can upload: ${v.files.join(", ") || "none"}\nrecent steps: ${v.history.join(" → ") || "none"}\n\nmarks:\n${v.marks.map((m) => `[${m.n}] ${m.type} "${m.label}"${m.value ? ` = "${m.value}"` : ""}`).join("\n") || "(none)"}`,
          },
        ],
        schema: SeeOut,
        maxTokens: 500,
      });
      return output;
    },
    files: () => c.sheet.files.map((f) => f.key),
    resetLink: c.readMail ? (since) => findResetLink(c.userId, c.host(), since) : undefined,
    resumeLink: c.readMail ? () => findResumeLink(c.userId, c.host()) : undefined,
    portalUrl: c.goal ? null : normalizeUrl(c.sheet.portal_url),
    rotatePassword: async () => {
      const l = await rotatePassword(c.userId, c.host(), c.applicationId, c.sheet.fields.email ?? "");
      await logEvent({ userId: c.userId, actor: "agent:runner", action: "runner.password_reset", applicationId: c.applicationId, channel: "portal", context: { host: c.host() } });
      return l;
    },
    loginFromMail: c.readMail ? (since) => issuedLogin(c.userId, c.applicationId, c.jobId, c.host(), since) : undefined,
    verification: (since) => findVerification(c.userId, c.host(), since),
    progress: async (note) => {
      if (note === lastNote) return;
      lastNote = note;
      if (await check()) return;
      await setRunner(c.applicationId, { runner_note: note });
    },
  };
}

// the password reset email a portal sent after `since`: the first link on the school's site that looks like a reset
export async function findResetLink(userId: string, host: string, since: number): Promise<string | null> {
  const root = hostRoot(host);
  const mails = await recentMail(userId, `newer_than:1d (from:${root} OR subject:(password OR reset OR "mot de passe"))`, 8);
  for (const m of mails.filter((x) => x.at >= since - 60_000).sort((a, b) => b.at - a.at)) {
    const links = [...`${m.html} ${m.text}`.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((x) => x[0].replace(/&amp;/g, "&").replace(/[.,;]+$/, ""));
    const hit = links.find((l) => {
      try {
        const u = new URL(l);
        return hostRoot(u.hostname) === root && /(reset|password|passwd|recover|forgot|token|change|pwd)/i.test(u.pathname + u.search);
      } catch {
        return false;
      }
    });
    if (hit) return hit;
  }
  return null;
}

// "we've emailed you a link to complete your application": the newest such link from the school, to its own portal
export async function findResumeLink(userId: string, host: string): Promise<string | null> {
  const root = hostRoot(host);
  const mails = await recentMail(userId, `newer_than:14d from:${root}`, 10);
  for (const m of mails.sort((a, b) => b.at - a.at)) {
    const links = [...`${m.html} ${m.text}`.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((x) => x[0].replace(/&amp;/g, "&").replace(/[.,;]+$/, ""));
    const hit = links.find((l) => {
      try {
        const u = new URL(l);
        return hostRoot(u.hostname) === root && /(application|apply|applicant|resume|continue|complete|form|portal|token|key|ref)/i.test(u.pathname + u.search) && !/(unsubscribe|privacy|policy|terms|facebook|twitter|instagram|linkedin|youtube)/i.test(l);
      } catch {
        return false;
      }
    });
    if (hit) return hit;
  }
  return null;
}

// the program's official page on the school's own site, for a program whose link was never saved
const PageOut = z.object({ url: z.string() });
async function findProgramPage(userId: string, jobId: string | undefined, p: { name: string; degree: string | null; schools: { name: string } }): Promise<string | null> {
  const found = await research({
    userId,
    agent: "runner",
    jobId,
    system: "you find the official web page of one university program (the course page on the university's own website, or for an online program the official partner page). quote the exact url.",
    prompt: `program: ${p.name}${p.degree ? ` (${p.degree})` : ""} at ${p.schools.name}. find its official course page, the one with entry requirements and an "apply" button.`,
    maxSearches: 2,
    maxFetches: 2,
  });
  const { output } = await runStructured({
    userId,
    agent: "runner",
    jobId,
    tier: "cheap",
    promptVersion: "program-page-v1",
    system: "extract the official program page url from the research. it must be on the university's own site (or the official partner site for an online program), not a rankings, listings or forum site. \"\" if none.",
    prompt: `${found.text}\n\nurls seen: ${found.sources.slice(0, 30).join(" ")}`,
    schema: PageOut,
    maxTokens: 400,
  });
  const u = normalizeUrl(output.url);
  if (!u || /mastersportal|findamasters|topuniversities|timeshighereducation|shiksha|yocket|collegedunia|careers360|studyportals|wikipedia|reddit|gmatclub|linkedin|facebook/i.test(u)) return null;
  return found.text.includes(u.replace(/^https:\/\//, "").slice(0, 30)) || found.sources.some((x) => x.startsWith(new URL(u).origin)) ? u : null;
}

export async function findVerification(userId: string, host: string, since: number) {
  const root = hostRoot(host);
  const mails = await recentMail(userId, `newer_than:1d (from:${root} OR subject:(verify OR verification OR code OR confirm OR activate OR account OR pin))`, 8);
  for (const m of mails.filter((x) => x.at >= since - 60_000).sort((a, b) => b.at - a.at)) {
    const v = extractVerification(m, host);
    if (v.code || v.link) return v;
  }
  return null;
}

// the portal showed a confirmation after we pressed submit
export async function markSubmitted(userId: string, applicationId: string, programId: string | null, note: string, url: string | null, filled: number, via: string) {
  const db = admin();
  const { error } = await db.from("applications").update({ status: "submitted", runner_status: "submitted", runner_note: note, runner_live_url: null, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
  if (error) throw new Error(error.message);
  const eventId = await logEvent({ userId, actor: "agent:runner", action: "runner.submitted", applicationId, programId, channel: "portal", context: { url, filled, via } });
  await logEvent({ userId, actor: "agent:runner", action: "application.submitted", applicationId, programId, channel: "portal" });
  await recordOutcome({ userId, eventId, applicationId, kind: "proxy", label: "submitted", source: "runner" });
  await learnFromSubmission(userId, applicationId, programId).catch(() => {});
  await afterSubmitted(userId, applicationId);
}

// a submission is the strongest evidence there is: the apply link worked, account creation worked, and the field
// mappings the model picked got through every page. shared with the next applicant to this school.
async function learnFromSubmission(userId: string, applicationId: string, programId: string | null) {
  const { data } = await admin().from("applications").select("portal_url, runner_state, programs(school_id)").eq("id", applicationId).maybeSingle();
  const schoolId = (data?.programs as unknown as { school_id: string } | null)?.school_id;
  if (!data || !schoolId) return;
  const st = (data.runner_state ?? {}) as RunnerState;
  const portal = normalizeUrl(data.portal_url);
  if (portal && programId) await learn(userId, schoolId, "apply_url", programId, { url: portal });
  const h = hostOf(portal ?? st.last_url ?? "");
  if (!h) return;
  if (st.accountAt) await learn(userId, schoolId, "portal", `${h}:signup_ok`, {});
  for (const [label, key] of Object.entries(st.picks ?? {}).slice(0, 150)) await learn(userId, schoolId, "field", `${h}|${label}`, { sheet_key: key });
}

// once something goes in: a scholarship is marked applied; a program gets its school's separate scholarship forms checked
export async function afterSubmitted(userId: string, applicationId: string) {
  const db = admin();
  await db.from("user_funding").update({ status: "applied" }).eq("user_id", userId).eq("application_id", applicationId);
  const { data } = await db.from("applications").select("programs(degree)").eq("id", applicationId).maybeSingle();
  if ((data?.programs as unknown as { degree?: string } | null)?.degree === "Scholarship") return;
  await enqueue({ userId, agent: "closer", task: "school_scholarships", payload: { applicationId }, idempotencyKey: `school_scholarships:${applicationId}` }).catch(() => null);
}

// paused or cancelled by the applicant while agents were working: "paused" keeps progress, "cancelled" drops it
export async function userHalted(applicationId: string): Promise<"paused" | "cancelled" | null> {
  const { data } = await admin().from("applications").select("runner_status, runner_state").eq("id", applicationId).maybeSingle();
  if (data?.runner_status !== "idle") return null;
  return (data.runner_state as { paused?: boolean } | null)?.paused ? "paused" : "cancelled";
}

// the applicant's chrome extension has checked in within the last few minutes
export async function extensionOnline(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 4 * 60_000).toISOString();
  const { count } = await admin().from("runner_tokens").select("id", { count: "exact", head: true }).eq("user_id", userId).is("revoked_at", null).gte("last_used_at", since);
  return (count ?? 0) > 0;
}

// the applicant has connected Chrome at some point (the extension can pick work up whenever Chrome is open)
export async function extensionPaired(userId: string): Promise<boolean> {
  const { count } = await admin().from("runner_tokens").select("id", { count: "exact", head: true }).eq("user_id", userId).is("revoked_at", null);
  return (count ?? 0) > 0;
}

// portals that refuse a cloud browser (bot walls, blocked sign-ups) usually accept the applicant's own chrome:
// move the job there. the extension picks it up within a minute.
export const BLOCKED_REASONS = new Set(["captcha", "account", "blocked"]);
export async function handOffToChrome(userId: string, applicationId: string, state: RunnerState, why: string) {
  const online = await extensionOnline(userId);
  await admin()
    .from("applications")
    .update({
      runner_mode: "extension",
      runner_status: "ready",
      runner_note: online ? "moved to your Chrome: this portal blocks cloud browsers. It carries on there within a minute" : "moved to your Chrome: this portal blocks cloud browsers. It carries on as soon as Chrome is open on your computer",
      runner_state: { ...state, reason: null, rechecks: 0, samePageCount: 0, storage_enc: undefined },
      runner_session_id: null,
      runner_live_url: null,
      runner_updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  await logEvent({ userId, actor: "agent:runner", action: "runner.moved_to_chrome", applicationId, channel: "portal", context: { why } });
  if (!online) {
    const { data } = await admin().from("applications").select("programs(schools(name))").eq("id", applicationId).maybeSingle();
    const school = (data?.programs as unknown as { schools: { name: string } } | null)?.schools.name ?? "a school";
    await notify({ userId, key: `chrome:${applicationId}`, kind: "info", title: `Open Chrome to finish ${school}`, body: `${school}'s portal blocks cloud browsers, so the agents will finish it in your Chrome. Open Chrome on the computer where you connected Ivyward and they carry on by themselves.`, href: `/applications/${applicationId}`, actionLabel: "See the application" }).catch(() => {});
  }
}

// a live browser session is open for this application: the cloud runner leaves it alone
async function liveActive(applicationId: string): Promise<boolean> {
  const since = new Date(Date.now() - 90_000).toISOString();
  const { data, error } = await admin().from("live_sessions").select("id").eq("application_id", applicationId).neq("status", "ended").gte("updated_at", since).limit(1);
  return !error && !!data?.length;
}

const FOLLOWUP_GOAL: Record<string, string> = {
  register_event: "register the applicant for this event (webinar, info session, open day) with their details, then confirm the registration. this is not the university application itself",
  claim_fee_waiver: "complete and send this application fee waiver request or claim form with the applicant's details. this is not the university application itself",
  fill_form: "complete and send this short form for the applicant with their details. this is not the university application itself",
  book_interview: "book the earliest available interview slot that is at least two days from today, then confirm it",
  other: "complete what this page asks with the applicant's details and confirm it",
};
const FOLLOWUP_DONE = /(you('re| are) (now )?(registered|signed up|booked|all set)|registration (is )?(complete|confirmed|successful)|thank(s| you) for (registering|signing up|your (registration|request|submission|interest))|(request|form|submission) (has been |was )?(received|submitted|sent)|we('ve| have) received|successfully (registered|submitted|booked)|booking (is )?confirmed|see you (there|soon)|confirmation (email|number))/i;

export const runner: Record<string, Handler> = {
  // a follow-up from a school's email: open its link and complete the form (register, claim the waiver, book a slot)
  "runner.followup": async (job) => {
    const { followupId } = job.payload as { followupId: string };
    const db = admin();
    const { data: f } = await db.from("followups").select("*").eq("id", followupId).eq("user_id", job.user_id).maybeSingle();
    if (!f || !f.url || !["queued", "working"].includes(f.status)) return { skipped: "nothing to do" };
    const st = (f.state ?? {}) as RunnerState & { runs?: number };
    if ((st.runs ?? 0) >= 4) {
      await db.from("followups").update({ status: "needs_you", result_note: "the agents couldn't finish this form after several tries", updated_at: new Date().toISOString() }).eq("id", followupId);
      return { gave_up: true };
    }
    await db.from("followups").update({ status: "working", updated_at: new Date().toISOString() }).eq("id", followupId);
    const sheet = await looseSheet(job.user_id, { id: followupId, school: f.school ?? "the school", applicationId: f.application_id, url: f.url });
    const schoolRoot = (() => {
      try {
        return rootOf(new URL(normalizeUrl(f.url) ?? "").hostname);
      } catch {
        return "";
      }
    })();
    const storage = st.storage_enc ? (JSON.parse(decrypt(st.storage_enc)) as StorageState) : null;
    const { openBrowser } = await import("@/lib/browser");
    const ob = await openBrowser({ storage });
    const school = f.school ?? "The school";
    try {
      const page = ob.page;
      await page.goto(normalizeUrl(st.last_url) ?? f.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const host = () => new URL(page.url()).hostname;
      const readMail = await canReadMail(job.user_id).catch(() => false);
      const base = serverDeps({ userId: job.user_id, applicationId: f.application_id ?? followupId, jobId: job.id, sheet, readMail, host, goal: FOLLOWUP_GOAL[f.kind] ?? FOLLOWUP_GOAL.other });
      const deps: EngineDeps = {
        ...base,
        shouldStop: () => false,
        canSubmit: async () => ({ allowed: true, reason: "a form the agents complete for you from a school's email" }),
        isDone: (s) => FOLLOWUP_DONE.test(s.body.slice(0, 4000)),
        finalButton: /^(register|rsvp|sign me up|reserve|book( (it|now|this slot))?|confirm|submit|request|claim|send|complete|save)\b/i,
        // accounts only on the school's own systems (a portal sign-in to claim a waiver), never on a third-party
        // event platform
        createLogin: async (email) => {
          if (rootOf(host()) !== schoolRoot) throw new Error(`won't create an account on ${host()}`);
          return base.createLogin(email);
        },
        progress: async () => {},
      };
      const { outcome, state: next } = await runEngine(fromPlaywright(page), deps, { ...st, steps: 0, navCalls: 0, visionCalls: 0 }, 200_000);
      const saved = { ...next, runs: (st.runs ?? 0) + 1, last_url: page.url(), storage_enc: encrypt(JSON.stringify(await ob.storage())) };
      if (outcome.kind === "submitted") {
        await db.from("followups").update({ status: "done", result_note: f.kind === "register_event" ? "registered" : f.kind === "book_interview" ? "booked" : "sent", state: saved, updated_at: new Date().toISOString() }).eq("id", followupId);
        const what = f.kind === "register_event" ? `You're registered for ${f.title}` : f.kind === "claim_fee_waiver" ? `Your fee waiver request for ${school} is sent` : f.kind === "book_interview" ? `Your ${school} interview slot is booked` : `Done: ${f.title}`;
        await notify({ userId: job.user_id, key: `followup-done:${followupId}`, kind: "followup", title: what, body: f.unlocks === "fee_waiver" ? "This is what unlocks the application fee waiver. Watch for the confirmation email from the school." : f.why ?? undefined, href: f.application_id ? `/applications/${f.application_id}` : "/messages", actionLabel: "See it" });
        await say(job.user_id, `${what}.${f.event_start ? " It's in your calendar and I'll remind you before it starts." : ""}`);
        await logEvent({ userId: job.user_id, actor: "agent:runner", action: "followup.done", applicationId: f.application_id, context: { kind: f.kind, title: f.title } });
        // a route to the fee waiver that worked: shared with the next applicant to this school
        if ((f.kind === "claim_fee_waiver" || f.unlocks === "fee_waiver") && f.application_id && f.url) {
          const { data: a } = await db.from("applications").select("programs(school_id)").eq("id", f.application_id).maybeSingle();
          const link = bareLink(f.url);
          if (link) await learnWaiver(job.user_id, (a?.programs as unknown as { school_id: string } | null)?.school_id, `link:${link}`, f.kind === "claim_fee_waiver" ? `the fee-waiver form linked in the school's emails (${link})` : `${f.title.slice(0, 120)} (${link})`, false, f.why ?? undefined).catch(() => {});
        }
        return { done: true };
      }
      if (outcome.kind === "wait" || outcome.kind === "continue") {
        await db.from("followups").update({ status: "queued", state: saved, updated_at: new Date().toISOString() }).eq("id", followupId);
        await enqueue({ userId: job.user_id, agent: "runner", task: "followup", payload: { followupId }, runAt: new Date(Date.now() + (outcome.kind === "wait" ? outcome.seconds * 1000 : 0)) });
        return { outcome: outcome.kind };
      }
      const note = outcome.kind === "needs_you" ? outcome.note : outcome.note || "the form didn't go through";
      await db.from("followups").update({ status: "needs_you", result_note: note.slice(0, 300), state: saved, updated_at: new Date().toISOString() }).eq("id", followupId);
      await notify({ userId: job.user_id, key: `followup-help:${followupId}`, kind: "followup", urgent: true, title: `${school}: ${f.title} needs you`, body: `${sentenceCase(note)}. Open the link to finish it: it takes a minute.`, href: f.url, actionLabel: "Open the form" });
      await say(job.user_id, `I couldn't finish "${f.title}" for ${school}: ${note}. The link is in your notifications; it should only take a minute.`);
      return { outcome: "needs_you" };
    } catch (e) {
      await db.from("followups").update({ status: "needs_you", result_note: "the form needs a step only you can do (a sign-in on another site, or something the agents can't read)", updated_at: new Date().toISOString() }).eq("id", followupId);
      await notify({ userId: job.user_id, key: `followup-help:${followupId}`, kind: "followup", urgent: true, title: `${school}: ${f.title} needs you`, body: "The agents couldn't complete this one. Open the link to finish it.", href: f.url, actionLabel: "Open the form" });
      return { error: String(e).slice(0, 200) };
    } finally {
      await ob.close(false);
    }
  },


  // find where the online application for this program starts
  "runner.find_portal": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const app = await loadApp(job.user_id, applicationId);
    if (!app) return { skipped: "gone" };
    const p = app.programs as unknown as { name: string; degree: string | null; url: string | null; school_id: string; schools: { name: string } };
    // another applicant already got through this program's application from this link
    const known = await knownApplyUrl(p.school_id, app.program_id).catch(() => null);
    if (known && known !== normalizeUrl(app.portal_url)) {
      await admin().from("applications").update({ portal_url: known }).eq("id", applicationId);
      await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.portal_found", applicationId, context: { url: known, notes: "the link other Ivyward applicants submitted through" } });
      if ((job.payload as { thenRun?: boolean }).thenRun) await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId, portalChecked: true } });
      return { url: known, via: "school memory" };
    }
    // a saved "portal" on a university system that isn't admissions (accommodation, library...) is a wrong turn
    if (app.portal_url && !looksLikePortal(app.portal_url) && /accommodation|housing|rooms\.|residence|library|alumni|request-?info|enquir|inquir/i.test(app.portal_url)) {
      await admin().from("applications").update({ portal_url: null }).eq("id", applicationId);
      app.portal_url = null;
    }
    // no course page on file: find it first (the "Apply now" button usually lives there), and keep it for everyone
    if (!p.url) {
      const page = await findProgramPage(job.user_id, job.id ?? undefined, p).catch(() => null);
      if (page) {
        await admin().from("programs").update({ url: page }).eq("id", app.program_id);
        p.url = page;
      }
    }
    // first, the way a person does it: open the program page and follow its apply links. free and usually enough.
    const walk = await crawlForApply([app.portal_url, p.url].filter((u): u is string => !!u), 10).catch(() => null);
    if (walk?.portal) {
      await admin().from("applications").update({ portal_url: walk.portal }).eq("id", applicationId);
      await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.portal_found", applicationId, context: { url: walk.portal, notes: `followed "${walk.best?.text ?? "apply"}" from the program page`, pages: walk.visited } });
      if ((job.payload as { thenRun?: boolean }).thenRun) await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId, portalChecked: true } });
      return { url: walk.portal, via: "crawl" };
    }
    const found = await research({
      userId: job.user_id,
      agent: "runner",
      jobId: job.id,
      system: "you find the official online application portal for a university program: the page where an applicant creates an account or signs in to start the application (often slate, apply.*, gradapply.*, or the school's own system). official university pages only. quote the exact url.",
      prompt:
        p.degree === "Scholarship"
          ? `scholarship: ${p.name}, awarded by ${p.schools.name}\nscholarship page: ${p.url ?? "unknown"}\nfind the exact url where the online application for this scholarship starts (its own application portal or form, not a university's program application).`
          : `program: ${p.name}${p.degree ? ` (${p.degree})` : ""} at ${p.schools.name}\nprogram page: ${p.url ?? "unknown"}\nfind the exact url where the online application starts for the next intake (the "apply now" / "start your application" destination).`,
      maxSearches: 3,
      maxFetches: 3,
    });
    const { output } = await runStructured({
      userId: job.user_id,
      agent: "runner",
      jobId: job.id,
      promptVersion: "portal-v2",
      tier: "cheap",
      system: "extract the online application portal url from the research: where an applicant creates an account or signs in to apply. if only the program page is known, return \"\".",
      prompt: `${found.text}\n\nurls seen: ${found.sources.slice(0, 40).join(" ")}`,
      schema: PortalOut,
      maxTokens: 1500,
    });
    // accept it if it came out of the research (text or sources) or sits on the school's own domain
    const cand = normalizeUrl(output.portal_url);
    const schoolRoot = p.url ? rootOf(new URL(normalizeUrl(p.url) ?? "https://x.invalid").hostname) : null;
    const seen = (u: string) => found.text.includes(u.replace(/^https:\/\//, "").slice(0, 40)) || found.sources.some((x) => x.startsWith(new URL(u).origin));
    let url = cand && looksLikePortal(cand) && (seen(cand) || (schoolRoot && rootOf(new URL(cand).hostname) === schoolRoot)) ? cand : null;
    // the model passed: take the first application-site link the search itself turned up
    if (!url) {
      const links = [...found.sources, ...(found.text.match(/https?:\/\/[^\s)"'<>\]]+/g) ?? [])].map((u) => normalizeUrl(u)).filter((u): u is string => !!u);
      // only an application *site* (apply./slate/portal host or login path), never a brochure page that merely mentions applying
      const site = (u: string) => looksLikePortal(u) && /(^|\.)(apply|applygrad|gradapply|slate|portal|applications?|enligne)\.|account\/(login|register)|my\.site\.com|course-application|technolutions/i.test(new URL(u).hostname + new URL(u).pathname);
      // without the school's own domain, the link must at least carry a word from the school's name
      const GENERIC = /^(university|universite|universidad|school|business|college|management|institute|graduate|faculty|of|the|and|de|des|du)$/i;
      const tokens = p.schools.name.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !GENERIC.test(w));
      const ours = (u: string) => (schoolRoot ? rootOf(new URL(u).hostname) === schoolRoot : tokens.some((t) => new URL(u).hostname.includes(t.slice(0, 6))));
      url = links.find((u) => site(u) && ours(u)) ?? null;
    }
    let note = output.notes;
    // the search turned up school pages but no application site: walk those pages for the apply link
    if (!url) {
      const more = await crawlForApply(found.sources.filter((u) => /apply|admission|how-to|study|course|program/i.test(u)).slice(0, 4), 8).catch(() => null);
      if (more?.portal) {
        url = more.portal;
        note = `followed "${more.best?.text ?? "apply"}" from the school's pages`;
      } else {
        // an "apply online" page that isn't obviously a portal is still a better start than the brochure
        const lead = [walk?.best, more?.best].filter((b): b is NonNullable<typeof b> => !!b && b.score >= 10).sort((a, b) => b.score - a.score)[0];
        if (lead) {
          url = lead.url;
          note = `starting from "${lead.text}"`;
        }
      }
    }
    if (!url && p.url) {
      // no portal found: start from the program page and follow its "apply" link
      url = normalizeUrl(p.url);
      note = "starting from the program page";
    }
    if (!url) {
      // no program page on file either: start from the school's own page the search found (how-to-apply pages first);
      // the navigator follows its "apply" links from there
      const GENERIC = /^(university|universite|universidad|school|business|college|management|institute|graduate|faculty|of|the|and|de|des|du)$/i;
      const tokens = p.schools.name.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !GENERIC.test(w));
      const official = found.sources
        .map((u) => normalizeUrl(u))
        .filter((u): u is string => !!u)
        .filter((u) => /\.(edu|ac\.[a-z]{2}|edu\.[a-z]{2})$|\.(fr|ca|de|nl|ch|sg)$/i.test(new URL(u).hostname) && tokens.some((t) => new URL(u).hostname.includes(t.slice(0, 6))))
        .sort((a, b) => Number(/apply|admission|how-to/i.test(b)) - Number(/apply|admission|how-to/i.test(a)));
      if (official[0]) {
        url = official[0];
        note = "starting from the school's admissions page";
      }
    }
    if (!url) {
      await setRunner(applicationId, { runner_status: "needs_you", runner_note: "couldn't find the application portal link. paste it on the application page and press try again" });
      return { found: false };
    }
    await admin().from("applications").update({ portal_url: url }).eq("id", applicationId);
    await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.portal_found", applicationId, context: { url, notes: note } });
    if ((job.payload as { thenRun?: boolean }).thenRun) await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId, portalChecked: true } });
    return { url };
  },

  "runner.run": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const db = admin();
    const app = await loadApp(job.user_id, applicationId);
    const { data: row0 } = await db.from("applications").select("runner_state, runner_mode").eq("id", applicationId).maybeSingle();
    if (!app || app.status !== "packet_approved" || !["ready", "running", "needs_you"].includes(app.runner_status as string)) return { skipped: "not queued" };
    // the applicant's chrome has this one, or they're driving it in the live browser
    if (row0?.runner_mode === "extension") return { skipped: "running in the applicant's chrome" };
    if (await liveActive(applicationId)) return { skipped: "live browser open" };
    const portal = normalizeUrl(app.portal_url);
    const checked = (job.payload as { portalChecked?: boolean }).portalChecked;
    if (!portal || (!looksLikePortal(portal) && !checked && !(row0?.runner_state as RunnerState | null)?.last_url)) {
      await enqueue({ userId: job.user_id, agent: "runner", task: "find_portal", payload: { applicationId, thenRun: true } });
      await setRunner(applicationId, { runner_status: "running", runner_note: "finding the application portal" });
      return { next: "finding the portal" };
    }
    if (portal !== app.portal_url) await db.from("applications").update({ portal_url: portal }).eq("id", applicationId);
    const sheet = await loadSheet(job.user_id, applicationId);
    if (!sheet) return { skipped: "no approved packet" };
    const { data: row } = await db.from("applications").select("runner_state, runner_session_id").eq("id", applicationId).single();
    const state = ((row?.runner_state ?? {}) as RunnerState) || {};
    // per-run counters start fresh each run; the engine keeps a lifetime total as a runaway guard
    state.steps = 0;
    state.navCalls = 0;
    state.visionCalls = 0;
    const storage = state.storage_enc ? (JSON.parse(decrypt(state.storage_enc)) as StorageState) : null;
    const schoolId = (app.programs as unknown as { school_id: string }).school_id;
    const portalHost = hostOf(normalizeUrl(state.last_url) ?? portal);

    // other applicants found this portal blocks automated sign-ups or cloud browsers: go straight to their chrome
    if (!state.signedIn && !state.totalSteps) {
      const why = await portalNeedsChrome(schoolId, portalHost).catch(() => null);
      if (why && (await extensionPaired(job.user_id))) {
        await handOffToChrome(job.user_id, applicationId, state, why);
        return { outcome: "moved_to_chrome", why: "school memory" };
      }
    }
    const memory: MapMemory = { hints: await fieldHints(schoolId, portalHost).catch(() => new Map()), picks: { ...(state.picks ?? {}) } };

    await setRunner(applicationId, { runner_status: "running", runner_note: "working on the portal" });
    state.leadBacks = 0;
    if (!state.steps) await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.started", applicationId, channel: "portal" });

    // loaded only here, so the many routes that share this file don't carry the browser library
    const { openBrowser } = await import("@/lib/browser");
    const ob = await openBrowser({ sessionId: row?.runner_session_id, storage });
    let keep = false;
    try {
      const page = ob.page;
      if (!page.url() || page.url() === "about:blank") await page.goto(normalizeUrl(state.last_url) ?? portal, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const host = () => new URL(page.url()).hostname;
      const readMail = await canReadMail(job.user_id).catch(() => false);
      const { outcome, state: next, filled } = await runEngine(
        fromPlaywright(page),
        serverDeps({ userId: job.user_id, applicationId, jobId: job.id, sheet, readMail, host, memory }),
        state,
        RUN_BUDGET_MS,
      );
      (next as RunnerState).picks = memory.picks;
      // what this run showed about the portal itself (not about the applicant)
      if (outcome.kind === "needs_you" && outcome.reason === "account") await learn(job.user_id, schoolId, "portal", `${hostOf(page.url())}:signup_blocked`, {}).catch(() => {});
      if (outcome.kind === "needs_you" && (outcome.reason === "captcha" || outcome.reason === "blocked")) await learn(job.user_id, schoolId, "portal", `${hostOf(page.url())}:cloud_blocked`, {}).catch(() => {});
      if (next.signedIn && next.accountAt && !state.signedIn) await learn(job.user_id, schoolId, "portal", `${hostOf(page.url())}:signup_ok`, {}).catch(() => {});

      const halted = await userHalted(applicationId);
      if (halted) {
        // paused: keep where it got to (page, cookies) for Resume. cancelled: nothing to keep
        if (halted === "paused") await db.from("applications").update({ runner_state: { ...next, paused: true, last_url: page.url(), storage_enc: encrypt(JSON.stringify(await ob.storage())) }, runner_session_id: null }).eq("id", applicationId);
        return { halted };
      }

      const saved: RunnerState & { debug?: unknown } = {
        ...next,
        last_url: page.url(),
        storage_enc: encrypt(JSON.stringify(await ob.storage())),
        // what the last page looked like, for fixing the runner (no values, labels only)
        debug: await (async () => {
          const one = (f: import("playwright-core").Frame) => f
          .evaluate(() => {
            const t = (e: Element | null) => (e?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
            return {
              title: document.title.slice(0, 80),
              fields: [...document.querySelectorAll("input:not([type=hidden]), select, textarea")].slice(0, 30).map((e) => `${(e as HTMLInputElement).type || e.tagName}:${(e as HTMLInputElement).name}:${e.getAttribute("aria-label") ?? ""}`),
              buttons: [...document.querySelectorAll("button, input[type=submit], a")].slice(0, 40).map(t).filter(Boolean),
              values: [...document.querySelectorAll("input:not([type=hidden]):not([type=password]), select")].slice(0, 30).map((e) => `${(e as HTMLInputElement).name}=${(e as HTMLInputElement).value ? "set" : "empty"}`),
              errors: [...document.querySelectorAll(".error, .errors, [role=alert], .invalid, .validation, .form_error, .message, .notification, .alert")].map(t).filter(Boolean).slice(0, 8),
              captcha: !!document.querySelector("iframe[src*=recaptcha], iframe[src*=hcaptcha], iframe[src*=turnstile], [data-sitekey], .grecaptcha-badge"),
              body: (document.body?.innerText ?? "").replace(/\s+/g, " ").slice(0, 700),
            };
          })
          .catch(() => null);
          const all = (await Promise.all(page.frames().map(one))).filter(Boolean) as { fields: string[] }[];
          return all.sort((a, b) => b.fields.length - a.fields.length)[0] ?? null;
        })(),
      };
      const login = await getLogin(job.user_id, host(), applicationId).catch(() => null);
      if (login && login.status !== "verified" && (outcome.kind === "submitted" || next.signedIn)) await markLogin(login.id, "verified");

      if (outcome.kind === "submitted") {
        await db.from("applications").update({ runner_state: saved, runner_session_id: null }).eq("id", applicationId);
        await markSubmitted(job.user_id, applicationId, app.program_id, outcome.note, page.url(), filled, "cloud");
        return { submitted: true, filled };
      }

      if (outcome.kind === "wait" || outcome.kind === "continue") {
        keep = true;
        await db.from("applications").update({ runner_state: saved, runner_session_id: ob.sessionId }).eq("id", applicationId);
        await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId }, runAt: new Date(Date.now() + (outcome.kind === "wait" ? outcome.seconds * 1000 : 0)) });
        return { outcome: outcome.kind, note: outcome.note, filled };
      }

      if (outcome.kind === "needs_you" && BLOCKED_REASONS.has(outcome.reason) && (await extensionPaired(job.user_id))) {
        // the portal won't take a cloud browser: the applicant's own chrome takes over from here
        await handOffToChrome(job.user_id, applicationId, saved, outcome.note);
        return { outcome: "moved_to_chrome", reason: outcome.reason, filled };
      }

      // every page filled and the submit button in reach, waiting on payment: say so once, and wait for it
      // (the payment restarts the agents straight away)
      if (outcome.kind === "needs_you" && next.reachedSubmit) {
        const need = await paymentNeeded(job.user_id, applicationId).catch(() => null);
        if (need) {
          await db.from("applications").update({ runner_state: { ...saved, reason: "unpaid", samePageCount: 0, rechecks: 0 }, runner_session_id: null, runner_status: "needs_you", runner_note: need.note.replace(/^ready to submit: /, "Ready to submit: "), runner_live_url: null, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
          await askToPay(job.user_id, applicationId, need, sheet.school);
          // over pro's monthly allowance: carry on by itself when the month turns
          if (need.kind === "limit" && need.resumeAt) await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId }, runAt: new Date(need.resumeAt), idempotencyKey: `limit:${applicationId}:${need.resumeAt.slice(0, 7)}` });
          return { outcome: "waiting_for_payment" };
        }
      }
      if (outcome.kind === "needs_you" && outcome.reason === "question") await recordQuestions(job.user_id, applicationId, next.questions).catch(() => 0);
      // a portal that blocks cloud browsers and no Chrome connected yet: say how to fix it once
      if (outcome.kind === "needs_you" && BLOCKED_REASONS.has(outcome.reason)) {
        await notify({ userId: job.user_id, key: "connect-chrome", kind: "setup", urgent: true, title: "Connect Chrome so the agents can finish blocked portals", body: `${sheet.school}'s portal blocks cloud browsers. With Ivyward connected to your Chrome, the agents finish portals like this one there, on their own.`, href: "/connect-chrome", actionLabel: "Connect Chrome" }).catch(() => {});
      }

      if (outcome.kind === "needs_you") {
        // bot checks and payments: the applicant finishes that step (live view, or their own browser with the
        // login we show them). we look again every 5 minutes and carry on once it's done.
        const liveView = !!ob.sessionId;
        // a bot check only clears in the browser that saw it: without a live view, hand the portal over instead of looping
        if (outcome.reason === "account") {
          // generate the password now so the applicant creates the account with it; we sign in with it after
          const login = await createLogin(job.user_id, applicationId, new URL(page.url()).hostname, sheet.fields.email ?? "");
          outcome.note = `this portal blocks automated sign-ups. Create the account yourself at ${portal} with ${login.login_email} and the password shown under "Your portal login" on this application. Already made it? Check the password matches. The agents sign in and finish the rest within 5 minutes.`;
          saved.last_url = portal; // start again from the landing page, which has the "log in" link
          saved.samePageCount = 0;
        }
        const recheck = (outcome.reason === "payment" || outcome.reason === "verification" || outcome.reason === "account" || (outcome.reason === "captcha" && liveView)) && (state.rechecks ?? 0) < (outcome.reason === "account" ? 72 : RECHECKS); // about six hours to create an account
        keep = recheck;
        const live = liveView ? await ob.liveUrl() : null;
        if (!liveView) {
          const login = await getLogin(job.user_id, new URL(page.url()).hostname, applicationId).catch(() => null);
          const signIn = login ? " sign in with the login shown below," : "";
          if (outcome.reason === "captcha" || outcome.reason === "blocked") outcome.note = "this portal blocks cloud browsers. Open the live browser to get past the check yourself, or let it run in your Chrome";
          if (outcome.reason === "payment") outcome.note = `payment page: open the portal,${signIn} and pay the fee. the agents check back every 5 minutes and confirm the submission`;
          if (outcome.reason === "verification") outcome.note = outcome.note.replace("open the live view and enter it", "enter it on the portal");
          outcome.note = outcome.note.replace(/open the live view and /g, "open the portal and ");
        }
        await db
          .from("applications")
          .update({
            runner_state: { ...saved, reason: outcome.reason, rechecks: recheck ? (state.rechecks ?? 0) + 1 : 0, samePageCount: 0 },
            runner_session_id: recheck ? ob.sessionId : null,
            runner_status: "needs_you",
            runner_note: outcome.note,
            runner_live_url: live,
            runner_updated_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
        if (app.runner_status !== "needs_you") await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.needs_you", applicationId, channel: "portal", context: { reason: outcome.reason, note: outcome.note } });
        if (recheck) await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId }, runAt: new Date(Date.now() + RECHECK_MINUTES * 60_000) });
        return { outcome: "needs_you", reason: outcome.reason, filled };
      }

      await db.from("applications").update({ runner_state: saved, runner_session_id: null, runner_status: "failed", runner_note: outcome.note }).eq("id", applicationId);
      return { outcome: "failed" };
    } catch (e) {
      if (await userHalted(applicationId).catch(() => null)) return { halted: true };
      await setRunner(applicationId, { runner_status: "failed", runner_note: "something went wrong while working on the portal. Choose Try again; if it keeps happening, open the portal and finish that step yourself." }); // the raw error stays on the job for the operator view
      throw e;
    } finally {
      await ob.close(keep);
    }
  },
};

// called when a packet is signed (and from "send to runner")
// queue the portal agent again. it keeps everything it learned on the portal (where it got to, its session
// cookies, the account it made, the fields it matched), so "Try again" carries on instead of starting over.
// only the per-run counters and the reason it last stopped are cleared. fresh: start from the portal link.
export function carryOver(st: RunnerState, fresh = false): RunnerState {
  return {
    ...st,
    ...(fresh ? { last_url: undefined, lastFingerprint: undefined, visited: [] } : {}),
    steps: 0,
    navCalls: 0,
    visionCalls: 0,
    samePageCount: 0,
    rechecks: 0,
    reason: null,
    paused: false,
    resume_at: undefined,
    reset: undefined,
    missing: [],
    questions: [],
    decided: [], // new answers in the profile: every field gets a fresh look
    navHistory: (st.navHistory ?? []).slice(-8),
  };
}

export async function queueRunner(userId: string, applicationId: string, opts: { fresh?: boolean; note?: string } = {}) {
  const db = admin();
  const { data } = await db.from("applications").select("runner_state, runner_mode").eq("id", applicationId).maybeSingle();
  const st = carryOver((data?.runner_state ?? {}) as RunnerState, opts.fresh);
  const extension = data?.runner_mode === "extension";
  await db
    .from("applications")
    .update({ runner_status: "ready", runner_note: opts.note ?? (extension ? "queued for your Chrome" : st.last_url ? "carrying on where it stopped" : "queued"), runner_state: st, runner_live_url: null, runner_updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (!extension) await enqueue({ userId, agent: "runner", task: "run", payload: { applicationId } });
}
