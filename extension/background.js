// Ivyward runner: built from extension/src by scripts/build-extension.mjs. don't edit by hand.
"use strict";
(() => {
  // src/lib/labels.ts
  function stripMarkers(label) {
    return label.replace(/\(\s*(required|optional)\s*\)/gi, " ").replace(/\s[-–—]\s*(required|optional)\s*$/i, "").replace(/^\s*(required|optional)\s*[:*-]?\s+/i, "").replace(/\s+(required|optional)\s*\**\s*$/i, "").replace(/\s+/g, " ").trim();
  }
  var MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";
  function stripOptionRuns(label) {
    return label.replace(new RegExp(`\\b(month\\s+)?((${MONTHS})\\b[\\s,/]*){4,}(\\w{1,3}\\s*$)?`, "gi"), " ").replace(/\b(day|year)?\s*(\b\d{1,4}\b[\s,/]*){6,}/gi, " ").replace(/\b(month|day|year|select|choose)\b(\s+\b(month|day|year|select|choose)\b)*\s*$/i, " ").replace(/\s+/g, " ").trim();
  }
  function cleanLabel(label, options = []) {
    let l = stripOptionRuns(stripMarkers(label.replace(/\s+/g, " ")));
    const tails = [...options, "select", "select one", "choose", "choose one", "please select", "-- select --"].map((o) => o.trim().toLowerCase()).filter(Boolean).sort((a, b) => b.length - a.length);
    for (let guard = 0; guard < 60; guard++) {
      const low = l.toLowerCase();
      const t = tails.find((o) => low.endsWith(` ${o}`) && low.length > o.length + 3);
      if (!t) break;
      l = l.slice(0, l.length - t.length).trim();
    }
    return l.replace(/\s*[*:]+\s*$/, "").trim();
  }

  // src/lib/never-fill.ts
  var NEVER_FILL = /passport|national\s*id|\bnin\b|\bssn\b|social\s*security|tax\s*id|\bbvn\b|password|passcode|\bpin\b|security\s*(question|answer)|card\s*(number|holder)|\bcvv\b|\bcvc\b|expir|iban|account\s*number|routing|signature/i;

  // src/lib/cloud-engine.ts
  var orOutage = (fallback) => (e) => {
    const msg = String(e?.message ?? e);
    if (e?.name === "AiUnavailable" || /AI is paused until|credit balance is too low|insufficient.?credit|invalid x-api-key|authentication_error/i.test(msg)) throw e;
    return fallback;
  };
  function ask(state, f, key) {
    const label = cleanLabel(f.label, f.options).slice(0, 200);
    if (!label) return;
    const list = state.questions ?? [];
    const i = list.findIndex((q2) => q2.label.toLowerCase() === label.toLowerCase());
    const q = { label, type: f.type, ...f.options?.length ? { options: f.options.filter((o) => o && !/^(select|choose|please|--)/i.test(o.trim())).slice(0, 40) } : {}, ...key ? { key } : {} };
    if (i >= 0) list[i] = { ...list[i], ...q, key: key ?? list[i].key };
    else list.push(q);
    state.questions = list.slice(-12);
  }
  function questionNote(state) {
    const qs = state.questions ?? [];
    if (!qs.length) return missingNote(state.missing ?? []);
    return `the portal asks ${qs.length === 1 ? "something" : `${qs.length} things`} your profile doesn't answer yet: ${qs.slice(0, 3).map((q) => q.label.slice(0, 60)).join("; ")}. Ivyward AI will ask you, and the agents carry on once you answer`;
  }
  var FINAL = /^(submit( (my|the|your))?( application)?|submit (and|&) pay|sign (and|&) submit|submit now|final submit)$/i;
  var NEXT = /^(save (and|&) (continue|next)|next( page| section| step)?|continue( to .{0,30})?|proceed|save (and|&) proceed|go to next|save and go to next|suivant|continuer)\b/i;
  var START = /^(start|begin|continue|resume) (my |an |your |a new |new )?application\b.{0,20}$|^apply( now| online| today| here)?( for (this|the) program.{0,30})?$|^start( here| now)?$|^(how to )?apply to (this|the) program$/i;
  var CREATE = /^((create|register|sign up)( for| an| a| new| my| your)*( account| profile| login| here| e-?id| user ?id| username| applicant account)?|new (user|applicant)s?|first.?time (user|applicant)s?.*|create (a )?login|(get|request) (an? )?(e-?id|account))[?!.]*$/i;
  var SIGNIN = /^(sign in|log ?in|login|continue|next|submit)$/i;
  var CREATE_SUBMIT = /^(create( (an |my )?account)?|register|sign up|continue|submit|next|(set|save|create|update|change|choose) (my |your |a )?password|save|activate( (my )?account)?|finish|complete( registration)?|confirm)$/i;
  var LEAD_PAGE = /request[-_ ]?(more[-_ ])?info(rmation)?|\b(rfi|inquiry|enquiry|enquire|inquire|brochure|newsletter|subscribe|contact[-_ ]us|stay[-_ ]in[-_ ]touch|keep[-_ ]me[-_ ]informed)\b/i;
  var CREATE_LOOSE = /^(create|register|sign ?up|submit|continue|next|proceed|save|activate|finish|complete|confirm|get started|join|request)\b.{0,40}$|\b(create|register)\b.{0,20}\b(account|e-?id|profile|login|user)\b/i;
  var VERIFY_BTN = /^(verify|confirm|submit|continue|next|activate|log ?in|login|sign in)$/i;
  var CHANGE_PW = /(change (your )?password|must change|password (has )?expired|choose a new password|changer (votre )?mot de passe|nouveau mot de passe)/i;
  var SIGNUP_WORDS = /(create (an |your )?account|register|sign up|new user|confirm password|re-?enter password)/i;
  var CHECK_EMAIL = /(check your (e-?mail|inbox)|verify your e-?mail|we('ve| have) sent (you )?(an? )?(e-?mail|code|link)|activation (link|e-?mail)|confirm your e-?mail)/i;
  var CODE_LABEL = /(verification|security|confirmation|access|one.?time|activation)?\s*(code|pin|otp|passcode)\b/i;
  var REGISTER_PAGE = /(regist|create.?(an.?)?account|sign.?up|new.?user)/i;
  var LOGIN_LINK = /^(log ?in|login|sign ?in)( here| now)?$|^returning (users?|applicants?)/i;
  var FORGOT = /(forgot|forgotten|reset|lost|recover|change)\b.{0,25}(password|login|details|credentials|pin)|(password|login) (reset|recovery|help)|trouble (signing|logging) in|can'?t (sign|log) ?in/i;
  var RESET_BTN = /^(send|reset|submit|continue|next|request|email me|recover|go|ok|confirm)\b/i;
  var NO_ACCOUNT = /(no (account|user|record)s? (was |were )?(found|exists?|matches|associated)|(not|isn'?t) (found|registered|recogni[sz]ed)|does(n'?t| not) (exist|match)|unknown (user|email|account))/i;
  var APPLY_STRONG = /^(apply( now| online| today| here| directly)?( for (this|the) (program(me)?|course|degree))?|start (my |an |your |a new |new |the )?application|begin (my |an |your )?application|online application( form| portal| system)?|application (portal|form|system)|apply (via|through|using) .{2,30}|submit (an|your) application|apply to (this|the) (program(me)?|course)|(go to|access) (the )?(online )?application( portal)?)\b/i;
  var APPLY_WEAK = /\b(how to apply|apply|applying|application process|admissions? process|ready to apply)\b/i;
  var NOT_APPLY = /\b(news|events?|blog|podcast|webinars?|open days?|visit|tour|chat|faq|request (info|information|a prospectus)|brochure|prospectus|fees?|funding|accommodation|housing|jobs?|careers?|vacanc|staff|alumni|donate|giving|search|menu|cookies?|privacy)\b/i;
  var SIGN_WORDS = /\b(log ?-?in|login|log ?on|logon|sign ?-?in)\b|^(returning|existing) (users?|applicants?|accounts?)\b|already (have|registered|created)( an)? account|access (my|your) (application|account|portal)/i;
  var NOT_MINE = /\b(sign ?-?up|register|create|new (user|applicant)|log ?out|sign ?out|faculty|staff|employees?|recommend(er|ers|ation)|referees?|reviewers?|admin(istrator)?|current students?|alumni|partners?|agents?|counsell?ors?|google|facebook|linkedin|apple|microsoft|github|forgot|reset|help|trouble)\b/i;
  function isSignIn(label) {
    const l = label.replace(/\s+/g, " ").trim();
    return l.length > 0 && l.length <= 48 && SIGN_WORDS.test(l) && !NOT_MINE.test(l);
  }
  var findBy = (s, ok) => s.buttons.find((b) => ok(clean(b.label)) && goesSomewhere(s, b));
  var BLOCK_TITLE = /^(access denied|forbidden|403\b|request (blocked|rejected)|attention required|just a moment|pardon our interruption|are you a (robot|human)|you have been blocked|blocked)/i;
  var BLOCK_BODY = /(unusual traffic from your|automated (requests|queries|access)|request (was|has been) (blocked|rejected)|verify (that )?you are (a )?human|checking (if the site connection is secure|your browser before)|enable javascript and cookies to continue|performing security verification|verif(y|ies) (that )?you are not a bot|security service to protect against malicious bots)/i;
  var isBlockPage = (s) => BLOCK_TITLE.test(s.title.trim()) || BLOCK_BODY.test(s.body.slice(0, 800));
  var TERMS = /(i (have read and )?(agree|accept)|i confirm (that )?i have read|accept to continue|terms (of use|and conditions|of service)|privacy (policy|notice)|data protection (statement|policy|notice))/i;
  function isCodeBox(f) {
    return /^(text|tel|number|search|)$/.test(f.type) && CODE_LABEL.test(f.label) && !/zip|postal|area|country|permanent|course|program|programme|subject|school|institution|promo|discount|coupon|referral|invite|tax|sort|swift|bank|do you have|have you/i.test(f.label);
  }
  function classify(s) {
    if (s.confirmation) return "confirmation";
    if (s.captcha || /error generating captcha token|captcha (verification|validation) failed|recaptcha (verification )?failed/i.test(`${s.body.slice(0, 4e3)} ${(s.errors ?? []).join(" ")}`)) return "captcha";
    if (s.payment) return "payment";
    const pw = s.allFields.filter((f) => f.type === "password");
    const code = s.allFields.find((f) => isCodeBox(f));
    if (pw.length >= 2 || pw.length === 1 && SIGNUP_WORDS.test(s.body.slice(0, 3e3)) && s.allFields.length >= 4) return "signup";
    if (pw.length === 1) return "login";
    if (code && s.allFields.length <= 3) return "verify_code";
    if (CHECK_EMAIL.test(s.body) && s.fields.length <= 1) return "check_email";
    return "form";
  }
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  var active = /* @__PURE__ */ new WeakMap();
  var frameOf = (page) => active.get(page) ?? page.mainFrame();
  async function snapFrame(f) {
    try {
      await f.helper();
      return await f.evaluate(() => window.__am.snapshot(), void 0);
    } catch {
      return null;
    }
  }
  async function snapMain(page) {
    for (let i = 0; i < 3; i++) {
      const s = await snapFrame(page.mainFrame());
      if (s) return s;
      await page.waitForLoadState("domcontentloaded", { timeout: 1e4 }).catch(() => {
      });
      await sleep(800);
    }
    const url = await page.url();
    return { url, title: "", body: "", captcha: false, payment: false, confirmation: false, fingerprint: `blank:${url}`, fields: [], allFields: [], buttons: [] };
  }
  var recentDialogs = /* @__PURE__ */ new WeakMap();
  async function snap(page) {
    const main = await snapMain(page);
    let best = { f: page.mainFrame(), s: main };
    const score = (x) => x.allFields.length * 3 + x.buttons.length;
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
    const said = page.dialogs?.() ?? [];
    if (said.length) recentDialogs.set(page, said);
    const shown = recentDialogs.get(page) ?? [];
    return { ...best.s, captcha, confirmation, title: main.title || best.s.title, ...shown.length ? { errors: [...best.s.errors ?? [], ...shown], body: `${shown.join(" ")} ${best.s.body}` } : {} };
  }
  async function click(page, id) {
    const sel = `[data-am-id="${id}"]`;
    const href = await frameOf(page).evaluate((q) => {
      const id2 = q.match(/data-am-id="([^"]+)"/)?.[1] ?? "";
      const a = window.__am?.byId?.(id2) ?? document.querySelector(q);
      return a && a.tagName === "A" && a.target && a.target !== "_self" && /^https?:/.test(a.href) ? a.href : null;
    }, sel).catch(() => null);
    if (href) {
      await page.goto(href, { timeout: 45e3 });
      await page.waitForLoadState("networkidle", { timeout: 15e3 }).catch(() => {
      });
      await sleep(1200);
      return;
    }
    try {
      await Promise.all([page.waitForLoadState("domcontentloaded").catch(() => {
      }), frameOf(page).click(sel, { timeout: 8e3 })]);
    } catch {
      await frameOf(page).evaluate((i) => (window.__am?.byId?.(i) ?? document.querySelector(`[data-am-id="${i}"]`))?.click(), id);
    }
    await page.waitForLoadState("networkidle", { timeout: 15e3 }).catch(() => {
    });
    await sleep(1200);
  }
  async function fillText(page, id, value) {
    try {
      await frameOf(page).fill(`[data-am-id="${id}"]`, value, { timeout: 1e4 });
    } catch (e) {
      if (/detached|Timeout \d+ms exceeded|not attached|not visible/i.test(String(e?.message ?? e))) throw new Redrawn();
      throw e;
    }
  }
  var IDP_HOST = /(^|\.)(login\.microsoftonline\.com|login\.live\.com|account\.live\.com|account\.microsoft\.com|accounts\.google\.com|myaccount\.google\.com|appleid\.apple\.com|idmsa\.apple\.com|login\.yahoo\.com|facebook\.com|linkedin\.com|okta\.com|auth0\.com)$/i;
  var hostOf = (u) => {
    try {
      return new URL(u).hostname.toLowerCase();
    } catch {
      return "";
    }
  };
  var DEAD_END = /an error has occurred that has stopped this transaction|(your |the )?session (has )?(timed out|expired)|has timed out due to inactivity|this page has expired|page (is )?no longer (valid|available)/i;
  var LOGIN_REFUSED = /\b(invalid|incorrect|wrong|not recogni[sz]ed|unrecogni[sz]ed|unknown (user|login|e-?mail|account|username|id)|failed|does not exist|doesn't exist|no account|not match|identifiant (inconnu|invalide)|mot de passe (invalide|incorrect))/i;
  var USERNAME_TAKEN = /^(?!.*e-?mail).*((user ?name|e-?id|user ?id|login( ?id| ?name)?|account name)\b.{0,60}\b(already (been )?(taken|exists?|in use|registered|used)|(is )?(not available|unavailable|taken))|already (taken|in use))/i;
  function usernameBox(s) {
    return s.allFields.find((f) => f.type !== "password" && f.type !== "email" && !/e-?mail/i.test(f.label) && /\b(user ?name|e-?id|user ?id|login ?(id|name))\b/i.test(`${f.label} ${f.name ?? ""}`));
  }
  async function valueOf(page, id) {
    return frameOf(page).evaluate((i) => String(window.__am?.byId?.(i)?.value ?? ""), id).catch(() => "");
  }
  function withNumber(name, n) {
    const dot = name.lastIndexOf(".");
    if (dot > 0) return `${name.slice(0, dot).replace(/\d+$/, "")}${n}${name.slice(dot)}`;
    return `${name.replace(/\d+$/, "")}${n}`;
  }
  var Redrawn = class extends Error {
    constructor() {
      super("the page redrew the box while it was being filled");
    }
  };
  var clean = (l) => l.replace(/[\u2190-\u21ff\u2794-\u27bf›»<>←→]+/g, " ").split(/\s+\/\s+|\s+\|\s+/)[0].replace(/\s+/g, " ").trim();
  var here = (u) => u.replace(/#.*$/, "").replace(/\/$/, "");
  var goesSomewhere = (s, b) => !b.href || /^javascript:/i.test(b.href) ? true : here(b.href) !== here(s.url);
  var find = (s, re, linksOnly = false) => s.buttons.find((b) => re.test(clean(b.label)) && (!linksOnly || b.link) && goesSomewhere(s, b));
  var findCreate = (s) => s.buttons.find((b) => CREATE.test(clean(b.label)));
  var findForgot = (s) => s.buttons.find((b) => clean(b.label).length <= 60 && FORGOT.test(clean(b.label)));
  function bestApply(s, visited = []) {
    let best;
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
    return best && best.score >= 3 ? best.b : void 0;
  }
  var ASKED_BUTTON = /\b(?:remember to|please|you must|make sure (?:you|to)|click|press|select|use)\s+(?:the\s+)?["“'‘]([^"”'’]{3,40})["”'’]/gi;
  function namedButton(s, state) {
    const text = s.body.slice(0, 8e3) + " " + (s.errors ?? []).join(" ");
    const asked = [...text.matchAll(ASKED_BUTTON)].map((m) => m[1].trim().toLowerCase());
    for (const m of text.matchAll(/\b([a-z]+?)\d*\s+(?:is|are)\s+required\b/gi)) {
      const word = m[1].toLowerCase();
      if (word.length < 4) continue;
      const add = s.buttons.find((b2) => new RegExp(`^(add|enter|update|edit)( an?| your| new)? ${word}`, "i").test(clean(b2.label)));
      if (add) asked.push(clean(add.label).toLowerCase());
    }
    if (!asked.length) return void 0;
    const key = `${(state.lastFingerprint ?? "").slice(0, 60)}#${state.navClicks ?? 0}`;
    const done = new Set(state.pressedAsked ?? []);
    const b = s.buttons.find((x) => asked.includes(clean(x.label).toLowerCase()) && !done.has(`${key}|${clean(x.label).toLowerCase()}`) && !DANGEROUS.test(x.label) && !FINAL.test(clean(x.label)));
    if (b) state.pressedAsked = [...done, `${key}|${clean(b.label).toLowerCase()}`].slice(-30);
    return b;
  }
  var SEC_Q = /\b(security|secret|memorable|challenge)?\s*question\b/i;
  var SEC_A = /\b(security|secret|memorable|challenge)?\s*answer\b/i;
  var isSecAnswer = (label) => SEC_A.test(label) && (!SEC_Q.test(label) || /\banswer\b[\s\S]*\bquestion\b/i.test(label));
  async function securityQuestions(page, fields, login) {
    const qs = fields.filter((f) => f.type === "select" && SEC_Q.test(f.label) && (f.options?.length ?? 0) > 1);
    const as = fields.filter((f) => (f.type === "text" || f.type === "password") && isSecAnswer(f.label));
    if (!as.length && !qs.length || !login.answers?.length) return [];
    const done = [];
    const used = /* @__PURE__ */ new Set();
    for (const [i, q] of qs.entries()) {
      const real = (q.options ?? []).filter((o) => o.trim() && !/^(select|choose|please|--|-)/i.test(o.trim()));
      const n = Number((q.label.match(/\d+/) ?? [])[0]);
      const want = Number.isFinite(n) && n > 0 ? n - 1 : i;
      const pick = [...real.slice(want % Math.max(real.length, 1)), ...real].find((o) => !used.has(o));
      if (!pick) continue;
      used.add(pick);
      if (await frameOf(page).evaluate((x) => window.__am.apply(x), { id: q.id, action: "choose", option: pick, source: "security" }).catch(() => false)) done.push(q.id);
    }
    if (done.length) {
      await sleep(2500);
      const again = (await snap(page)).fields.filter((f) => (f.type === "text" || f.type === "password") && isSecAnswer(f.label));
      as.splice(0, as.length, ...again);
    }
    for (const [i, a] of as.entries()) {
      const n = Number((a.label.match(/\d+/) ?? [])[0]);
      const k = Number.isFinite(n) && n > 0 ? n - 1 : i;
      if (await fillText(page, a.id, login.answers[k % login.answers.length]).then(() => true, () => false)) done.push(a.id);
    }
    return done;
  }
  var DOC_TYPES = [
    [/\b(cv|curriculum vitae|r[eé]sum[eé])\b/i, (k) => k === "cv"],
    [/\btranscript|academic record|marks? sheet/i, (k) => k === "transcript"],
    [/\bdegree (certificate|award)|\bcertificate\b|\bdiploma\b/i, (k) => k === "degree_cert"],
    [/\b(english|ielts|toefl|pte|duolingo|test (score|result))/i, (k) => k === "test_score"],
    [/\b(personal statement|statement of purpose|supporting statement|motivation|research proposal)/i, (k) => k.startsWith("essay:")]
  ];
  var UPLOAD_GO = /^(go|upload|add|attach|upload (file|document)|add (file|document)|save document)$/i;
  async function uploadByType(page, deps2, s, state) {
    const box = s.allFields.find((f) => f.type === "file");
    const go = s.buttons.find((b) => UPLOAD_GO.test(clean(b.label)));
    const list = s.fields.find((f) => f.type === "select" && (f.options ?? []).filter((o) => DOC_TYPES.some(([re]) => re.test(o))).length >= 2);
    const keys = deps2.files?.() ?? [];
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
      await deps2.progress(`uploading your ${option.toLowerCase()}`);
      await frameOf(page).evaluate((x) => window.__am.apply(x), { id: list.id, action: "choose", option, source: key }).catch(() => false);
      await sleep(800);
      const after = await snap(page);
      const box2 = after.allFields.find((f) => f.type === "file") ?? box;
      const go2 = after.buttons.find((b) => UPLOAD_GO.test(clean(b.label))) ?? go;
      await frameOf(page).setInputFiles(`[data-am-id="${box2.id}"]`, await deps2.file(key));
      await sleep(500);
      await click(page, go2.id);
      await sleep(2500);
      return 1;
    }
    return 0;
  }
  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  function dateAs(iso, context) {
    const [y, m, d] = iso.split("-");
    const spelled = context.match(/\b(dd|mm|yyyy)([\/.\- ])(dd|mm)\2(yyyy|yy|dd)\b/i);
    if (spelled) {
      const parts = [spelled[1], spelled[3], spelled[4]].map((p) => p.toLowerCase());
      const val = (p) => p === "dd" ? d : p === "mm" ? m : p === "yy" ? y.slice(2) : y;
      return parts.map(val).join(spelled[2]);
    }
    const ex = context.match(/\b(?:example|e\.g\.|eg|format|for example)[^0-9]{0,20}(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4})\b/i);
    if (ex) {
      const first = Number(ex[1]);
      const second = Number(ex[3]);
      if (second > 12) return [m, d, y].join(ex[2]);
      if (first > 12) return [d, m, y].join(ex[2]);
    }
    if (/\/ps[cp]\//i.test(context)) return [m, d, y].join("/");
    return iso;
  }
  var DATE_COMPLAINT = /(does not understand the date|invalid date|not a valid date|enter a valid date|date (is )?(invalid|in the wrong format)|date format)/i;
  function dateRedo(s, already) {
    if (!DATE_COMPLAINT.test(`${s.body.slice(0, 4e3)} ${(s.errors ?? []).join(" ")}`)) return [];
    const have = new Set(already.map((f) => f.id));
    return s.allFields.filter((f) => f.type === "text" && /\b(date|birth|dob)\b/i.test(f.label) && !have.has(f.id));
  }
  function markNewApp(state, label) {
    if ((state.createClicks ?? []).some((c) => NEW_APP.test(c.split("|").pop() ?? ""))) return false;
    state.createClicks = [...state.createClicks ?? [], `${(state.lastFingerprint ?? "").slice(0, 60)}|${label}`].slice(-30);
    return true;
  }
  var VISION_BUDGET = 60;
  var VISION_KEYS = /* @__PURE__ */ new Set(["Enter", "Tab", "Shift+Tab", "Escape", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Space", "Backspace", "Delete", "PageDown", "PageUp", "Home", "End"]);
  async function visionLoop(page, deps2, state, goal, empty, max = 10) {
    if (!deps2.see || !page.screenshot || !page.mouseClick) return { acted: false };
    let acted = false;
    let idle = 0;
    const log = (t) => state.visionHistory = [...state.visionHistory ?? [], t].slice(-14);
    const main = page.mainFrame();
    const sig = () => main.evaluate(() => window.__am.sig(), void 0).catch(() => "");
    for (let i = 0; i < max && (state.visionCalls ?? 0) < VISION_BUDGET && idle < 3; i++) {
      if (deps2.shouldStop?.()) break;
      state.visionCalls = (state.visionCalls ?? 0) + 1;
      await main.helper().catch(() => {
      });
      const marks = await main.evaluate(() => window.__am.marks(true), void 0).catch(() => []);
      const image = await page.screenshot().catch(() => null);
      await main.evaluate(() => window.__am.clearMarks(), void 0).catch(() => {
      });
      if (!image) break;
      const a = await deps2.see({ image, goal, url: await page.url(), history: (state.visionHistory ?? []).slice(-10), empty, marks, files: deps2.files?.() ?? [] }).catch(orOutage(null));
      if (!a || a.action === "done") break;
      if (a.action === "handoff") {
        log(`handoff: ${a.note}`);
        const reason = /cloudflare|just a moment|security (check|verification)/i.test(a.note) ? "blocked" : /captcha|robot|human|bot check/i.test(a.note) ? "captcha" : /\b(pay|payment|fee|card)\b/i.test(a.note) ? "payment" : "stuck";
        return { acted, outcome: { kind: "needs_you", reason, note: a.note.slice(0, 280) } };
      }
      const m = a.mark ? marks.find((x2) => x2.n === a.mark) : void 0;
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
        const under = await main.evaluate((p) => window.__am.at(p.x, p.y), { x, y }).catch(() => null);
        const label = clean(under?.label || m?.label || "");
        if ((a.action === "click" || a.action === "double_click") && DANGEROUS.test(label)) {
          log(`refused "${label}"`);
          return { acted, outcome: { kind: "needs_you", reason: /pay|checkout/i.test(label) ? "payment" : "stuck", note: /pay|checkout/i.test(label) ? "payment step: pay the application fee yourself; the agents confirm the submission after" : `the next step is "${label}", which the agents never press for you` } };
        }
        if ((a.action === "click" || a.action === "double_click") && (FINAL.test(label) || /^submit\b/i.test(label) || (deps2.finalButton?.test(label) ?? false))) {
          state.reachedSubmit = true;
          const d = await deps2.canSubmit();
          if (!d.allowed) return { acted, outcome: { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` } };
          state.submitClicked = true;
        }
        if ((a.action === "click" || a.action === "double_click") && (/\b(start|create|begin|register|sign ?up|new application)\b/i.test(label) || !label && /submit/i.test(m?.type ?? ""))) {
          const pageKey = (state.lastFingerprint ?? "").slice(0, 60);
          const k = `${pageKey}|${label || m?.type}`;
          if ((state.createClicks ?? []).some((c) => c.startsWith(`${pageKey}|`))) {
            log(`didn't press "${label || "submit"}" again: it was pressed already`);
            idle++;
            continue;
          }
          state.createClicks = [...state.createClicks ?? [], k].slice(-30);
        }
        if (a.action === "click") await page.mouseClick(x, y);
        else if (a.action === "double_click") await (page.doubleClick ?? page.mouseClick)(x, y);
        else if (a.action === "hover") await page.hover?.(x, y);
        else if (a.action === "clear") {
          await page.mouseClick(x, y);
          await page.pressKey?.("Control+A");
          await page.pressKey?.("Backspace");
        } else if (a.action === "upload") {
          if (!a.file || !(deps2.files?.() ?? []).includes(a.file) || !page.uploadAt) {
            log(`can't upload ${a.file || "?"}`);
            idle++;
            continue;
          }
          const ok = await page.uploadAt(x, y, await deps2.file(a.file)).catch(() => false);
          log(ok ? `uploaded ${a.file} at ${what}` : `upload of ${a.file} didn't take`);
        } else {
          const v = deps2.sheetValue?.(a.sheet_key) ?? null;
          const piece = a.text.trim();
          const typed = v && piece && v.toLowerCase().includes(piece.toLowerCase()) ? piece : v;
          if (!typed || NEVER_FILL.test(label) || m?.type === "password") {
            log(`nothing to type for ${a.sheet_key || "?"}`);
            idle++;
            continue;
          }
          if (/select/i.test(m?.type ?? "") || under?.tag === "select") {
            const r = await main.evaluate((p) => window.__am.selectAt(p.x, p.y, p.v), { x, y, v }).catch(() => null);
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
      await page.waitForLoadState("domcontentloaded", { timeout: 8e3 }).catch(() => {
      });
      await sleep(900);
      const after = await sig();
      if (after && after === before && a.action !== "wait") {
        idle++;
        state.visionHistory = [...(state.visionHistory ?? []).slice(0, -1), `${(state.visionHistory ?? []).at(-1) ?? a.action} \u2192 nothing changed`].slice(-14);
      } else idle = 0;
    }
    return { acted };
  }
  async function decidePass(page, deps2, s, fields, state) {
    if (!deps2.decide) return 0;
    const key = (f) => cleanLabel(f.label, f.options).toLowerCase().slice(0, 80);
    const seen = new Set((s.errors ?? []).length ? [] : state.decided ?? []);
    const todo = fields.filter((f) => !seen.has(key(f)) && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`) && f.type !== "password");
    if (!todo.length) return 0;
    state.decided = [...seen, ...todo.map(key)].slice(-120);
    const fills = await deps2.decide(todo, { url: s.url, title: s.title, body: s.body.slice(0, 2e3), errors: s.errors ?? [] }).catch(orOutage([]));
    return applyList(page, deps2, todo, fills, state);
  }
  async function fillHard(page, deps2, state) {
    let filled = 0;
    let now = await snap(page);
    const blank = (x) => x.fields.filter((f) => (f.required || (x.errors ?? []).length > 0 && f.type !== "checkbox" && f.type !== "file") && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
    let empty = blank(now);
    if (empty.length) {
      filled += await decidePass(page, deps2, now, empty, state);
      now = await snap(page);
      empty = blank(now);
    }
    if (empty.length && deps2.see && page.screenshot) {
      const labels = empty.map((f) => cleanLabel(f.label, f.options).slice(0, 80));
      const v = await visionLoop(page, deps2, state, `fill in these required questions with the applicant's information, opening dropdowns and choosing the matching option: ${labels.join("; ")}`, labels);
      if (v.outcome) return { filled, empty, outcome: v.outcome };
      if (v.acted) filled += 1;
      if (v.acted) {
        now = await snap(page);
        empty = now.fields.filter((f) => f.required && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
      }
    }
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
  var SECTION_SAVE = /^save( (my|this|the))?( [a-z]+){0,3}$|^(update|save changes|save section)$/i;
  async function runEngine(page, deps2, state, budgetMs) {
    const end = Date.now() + budgetMs;
    for (let i = 0; i < 8; i++) {
      try {
        return await runPass(page, deps2, state, Math.max(0, end - Date.now()));
      } catch (e) {
        if (!(e instanceof Redrawn) || Date.now() >= end) throw e;
        state.navHistory = [...state.navHistory ?? [], "the page redrew while filling; looking again"].slice(-12);
        await sleep(1500);
      }
    }
    return { outcome: { kind: "continue", note: "continuing" }, state, filled: 0 };
  }
  async function runPass(page, deps2, state, budgetMs) {
    const end = Date.now() + budgetMs;
    let filled = 0;
    while (Date.now() < end) {
      if (deps2.shouldStop?.()) return { outcome: { kind: "continue", note: "paused" }, state, filled };
      state.steps += 1;
      state.totalSteps = (state.totalSteps ?? 0) + 1;
      if (state.steps > 150) return { outcome: { kind: "continue", note: "continuing on the next pages" }, state, filled };
      if (state.totalSteps > 1500) return { outcome: { kind: "needs_you", reason: "stuck", note: "the agents have been through this portal hundreds of pages without finishing; please check where it stands" }, state, filled };
      await page.waitForLoadState("domcontentloaded").catch(() => {
      });
      await sleep(800);
      let s = await snap(page);
      if (isBlockPage(s)) {
        await sleep(8e3);
        s = await snap(page);
        if (isBlockPage(s)) return { outcome: { kind: "needs_you", reason: "blocked", note: "this portal blocks the browser the agents are using" }, state, filled };
      }
      if (s.fingerprint !== state.lastFingerprint) recentDialogs.delete(page);
      const alertText = (recentDialogs.get(page) ?? []).join(" | ");
      if (alertText && !(state.navHistory ?? []).at(-1)?.startsWith("the page said:")) state.navHistory = [...state.navHistory ?? [], `the page said: ${alertText.slice(0, 200)}`].slice(-12);
      state.samePageCount = s.fingerprint === state.lastFingerprint ? (state.samePageCount ?? 0) + 1 : 0;
      state.lastFingerprint = s.fingerprint;
      if (REGISTER_PAGE.test(s.url) && /^(forbidden|access denied|403|request blocked)/i.test(s.title.trim() || s.body.trim().slice(0, 40))) {
        return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
      }
      const formComplains = /(invalid|do(es)? not exist|already (exists|registered|in use)|not (be )?found|error|please (enter|select|provide|choose|complete)|is required|are mandatory|is mandatory|required field|must (be|contain|match|include)|do(es)? not match|too (short|long))/i.test(`${s.body} ${alertText} ${(s.errors ?? []).join(" ")}`);
      const blankRequired = s.fields.some((f) => f.required && f.type !== "checkbox");
      const changingPassword = s.allFields.some((f) => f.type === "password" && /\b(current|old|existing|temporary)\b/i.test(`${f.label} ${f.name ?? ""}`)) || CHANGE_PW.test(s.body.slice(0, 1500));
      if ((state.signupTries ?? 0) >= 3 && state.samePageCount >= 2 && REGISTER_PAGE.test(`${s.url} ${s.title}`) && !(state.missing ?? []).length && !formComplains && !blankRequired && !changingPassword) {
        return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
      }
      const okBox = find(s, /^(ok|okay)$/i);
      if (okBox && /\b(message|error|warning|alert)\b/i.test(s.body.slice(0, 300)) && !(state.pressedAsked ?? []).includes(`${(s.fingerprint ?? "").slice(0, 60)}|ok`)) {
        state.pressedAsked = [...state.pressedAsked ?? [], `${(s.fingerprint ?? "").slice(0, 60)}|ok`].slice(-30);
        await click(page, okBox.id);
        continue;
      }
      if (state.samePageCount >= 2) {
        const named = namedButton(s, state);
        if (named) {
          state.navHistory = [...state.navHistory ?? [], `pressed "${clean(named.label)}", which the page asked for`].slice(-12);
          await deps2.progress(`pressing "${clean(named.label)}", which the portal asks for`);
          await click(page, named.id);
          state.samePageCount = 0;
          state.lastFingerprint = void 0;
          continue;
        }
      }
      if (state.samePageCount >= 3 && s.fields.some((f) => f.required)) {
        const h = await fillHard(page, deps2, state);
        filled += h.filled;
        if (h.outcome) return { outcome: h.outcome, state, filled };
        s = await snap(page);
      }
      if (state.samePageCount >= 3) {
        const req = s.fields.filter((f) => f.required && f.type !== "checkbox").map((f) => cleanLabel(f.label, f.options).slice(0, 80));
        let stillEmpty = s.fields.filter((x) => x.required && x.type !== "checkbox" && !NEVER_FILL.test(`${x.label} ${x.name ?? ""}`));
        if (stillEmpty.length) {
          const fills = await deps2.map(stillEmpty).catch(orOutage([]));
          const n = await applyList(page, deps2, stillEmpty, fills, state);
          if (n) {
            filled += n;
            state.samePageCount = 0;
            await sleep(500);
            s = await snap(page);
            stillEmpty = s.fields.filter((x) => x.required && x.type !== "checkbox" && !NEVER_FILL.test(`${x.label} ${x.name ?? ""}`));
            if (!stillEmpty.length) continue;
          }
        }
        const pwBoxes2 = s.allFields.filter((f) => f.type === "password");
        const pwKey = `${(s.fingerprint ?? "").slice(0, 60)}|pw`;
        if (s.fields.some((f) => f.type === "password") && pwBoxes2.length && !(state.pressedAsked ?? []).includes(pwKey)) {
          const login = await deps2.existingLogin();
          if (login) {
            state.pressedAsked = [...state.pressedAsked ?? [], pwKey].slice(-30);
            for (const p of pwBoxes2) await fillText(page, p.id, login.password);
            filled += pwBoxes2.length;
            state.samePageCount = 0;
            continue;
          }
        }
        if (stillEmpty.some((f) => SEC_A.test(f.label) || SEC_Q.test(f.label))) {
          const login = await deps2.existingLogin();
          const sec = login ? await securityQuestions(page, stillEmpty, login) : [];
          if (sec.length) {
            filled += sec.length;
            state.samePageCount = 0;
            continue;
          }
        }
        const notTaken = stillEmpty.filter((f) => deps2.hasValue?.(f.label));
        stillEmpty = stillEmpty.filter((f) => !notTaken.includes(f));
        if (notTaken.length && !stillEmpty.length && state.samePageCount < 6) {
          const o3 = await stuckStep(page, deps2, s, state, `these fields have the applicant's details but the page didn't keep them (they may be locked until an earlier section is finished, or need a different control): ${notTaken.map((f) => cleanLabel(f.label, f.options).slice(0, 40)).join("; ")}`, { kind: "needs_you", reason: "stuck", note: `the portal won't take ${notTaken.map((f) => cleanLabel(f.label, f.options).slice(0, 30)).slice(0, 3).join(", ")} yet; it may need an earlier section finished first` });
          if (o3) return { outcome: o3, state, filled };
          continue;
        }
        for (const f of stillEmpty) ask(state, f);
        const fix = (state.missing ?? []).length || stillEmpty.length ? questionNote(state) : "";
        const err = (s.errors ?? []).join("; ").slice(0, 160);
        const stop = { kind: "needs_you", reason: fix ? "question" : "stuck", note: fix || (err ? `the portal says: ${err}` : req.length ? `the portal wants: ${req.slice(0, 3).join("; ")}` : "the portal didn't accept this page") };
        if (fix || state.samePageCount >= 6) return { outcome: stop, state, filled };
        const o2 = await stuckStep(page, deps2, s, state, `the same page came back ${state.samePageCount} times after the usual steps${err ? `; the portal shows: ${err}` : ""}`, stop);
        if (o2) return { outcome: o2, state, filled };
        continue;
      }
      if (IDP_HOST.test(hostOf(s.url)) && !(deps2.portalUrl && hostOf(deps2.portalUrl) === hostOf(s.url))) {
        state.idpBacks = (state.idpBacks ?? 0) + 1;
        state.navHistory = [...state.navHistory ?? [], `left ${hostOf(s.url)} (another company's sign-in): back to the school's portal`].slice(-20);
        if (state.idpBacks > 2 || !deps2.portalUrl) return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal kept sending the agents to another company's sign-in page (Microsoft, Google or similar). Open the portal and sign in with the school's own account option" }, state, filled };
        await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => null);
        continue;
      }
      if (deps2.portalUrl && DEAD_END.test(s.body.slice(0, 2e3)) && s.fields.length === 0 && (state.restarts ?? 0) < 2) {
        state.restarts = (state.restarts ?? 0) + 1;
        state.navHistory = [...state.navHistory ?? [], `the portal ended the session ("${(s.body.match(DEAD_END)?.[0] ?? "").slice(0, 60)}"): started again from the portal`].slice(-20);
        await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => null);
        state.samePageCount = 0;
        continue;
      }
      if (!deps2.goal && deps2.portalUrl && LEAD_PAGE.test(`${s.url} ${s.title}`) && !LEAD_PAGE.test(deps2.portalUrl) && (state.leadBacks ?? 0) < 3) {
        state.leadBacks = (state.leadBacks ?? 0) + 1;
        state.navHistory = [...state.navHistory ?? [], `left an enquiry form (${s.title.slice(0, 40)}) for the application portal`].slice(-20);
        await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => null);
        state.samePageCount = 0;
        continue;
      }
      if (EMAILED_LINK.test(s.body.slice(0, 6e3)) && !insideForm(s) && deps2.resumeLink && (state.resumeLinkTries ?? 0) < 3 && Date.now() - (state.resumeLinkAt ?? 0) > 10 * 6e4) {
        state.resumeLinkAt = Date.now();
        state.resumeLinkTries = (state.resumeLinkTries ?? 0) + 1;
        const link = await deps2.resumeLink().catch(() => null);
        if (link) {
          await deps2.progress("opening the link the school emailed to continue the application");
          state.navHistory = [...state.navHistory ?? [], "followed the school's emailed link"].slice(-20);
          await page.goto(link, { timeout: 45e3 }).catch(() => null);
          state.samePageCount = 0;
          state.createClicks = [];
          continue;
        }
      }
      if (deps2.isDone?.(s) && (state.submitClicked || state.reachedSubmit)) return { outcome: { kind: "submitted", note: "done: the page confirmed it" }, state, filled };
      const kind = classify(s);
      if (kind === "confirmation") {
        if (state.submitClicked || state.reachedSubmit) return { outcome: { kind: "submitted", note: "portal showed a confirmation" }, state, filled };
      }
      if (kind === "captcha") return { outcome: { kind: "needs_you", reason: "captcha", note: "the portal is showing a bot check. open the live view and complete it; the runner continues on its own" }, state, filled };
      if (kind === "payment") {
        state.reachedSubmit = true;
        return { outcome: { kind: "needs_you", reason: "payment", note: "payment page: open the live view and pay the fee; the runner confirms the submission after" }, state, filled };
      }
      if (state.reset) {
        const r = await resetStep(page, deps2, s, state);
        if (r === "continue") continue;
        if (r) return { outcome: r, state, filled };
      }
      if (kind === "login") {
        if (state.createNext && !state.triedCreate) {
          const create = find(s, CREATE) ?? findCreate(s);
          state.createNext = false;
          if (create) {
            state.triedCreate = true;
            state.accountAt = Date.now();
            await deps2.progress("creating your portal account");
            await click(page, create.id);
            continue;
          }
        }
        let login = await deps2.existingLogin();
        if (login && deps2.signInYourself?.()) return { outcome: { kind: "needs_you", reason: "login", note: "sign in to the portal yourself (your password manager can fill it in); the agents carry on once you're in" }, state, filled };
        if (!login && deps2.loginFromMail) login = await deps2.loginFromMail(Date.now() - 60 * 864e5);
        if (!login) {
          const create = find(s, CREATE) ?? findCreate(s);
          if (create && !state.triedCreate) {
            await deps2.progress("creating your portal account");
            state.accountAt = Date.now();
            state.triedCreate = true;
            await click(page, create.id);
            continue;
          }
          const fallback = { kind: "needs_you", reason: "login", note: "couldn't find where to create an account on this portal. Create it where the school says and add it under Portal logins; the agents sign in with it and carry on" };
          const o2 = await stuckStep(page, deps2, s, state, "this is a sign-in page and there's no login on file yet: find how to create a new account (register, sign up, new applicant, create account, first-time user)", fallback);
          if (o2) return { outcome: o2, state, filled };
          continue;
        }
        const pw = s.allFields.find((f) => f.type === "password");
        const user = s.allFields.find((f) => f.type !== "password" && f.type !== "checkbox" && /(e-?mail|user|login|account)/i.test(`${f.label} ${f.autocomplete ?? ""}`)) ?? s.allFields.find((f) => f.type === "email" || f.type === "text");
        const isIdBox = /user\s*(id|name)|login\s*(id|name)|identifiant|oprid/i.test(`${user?.label ?? ""} ${user?.name ?? ""}`) && !/e-?mail/i.test(user?.label ?? "");
        if (user) await fillText(page, user.id, !login.login_email.includes("@") || !isIdBox ? login.login_email : login.login_email.split("@")[0].replace(/[^a-z0-9._-]/gi, "").slice(0, 30));
        await fillText(page, pw.id, login.password);
        const go = find(s, SIGNIN) ?? findBy(s, isSignIn);
        await deps2.progress("signing in to the portal");
        if (go) await click(page, go.id);
        else await frameOf(page).press(`[data-am-id="${pw.id}"]`, "Enter").catch(() => {
        });
        const after = await snap(page);
        if (classify(after) === "login" && LOGIN_REFUSED.test(`${after.body} ${(after.errors ?? []).join(" ")}`)) {
          if (!state.triedMailLogin && deps2.loginFromMail) {
            state.triedMailLogin = true;
            const issued = await deps2.loginFromMail(Date.now() - 60 * 864e5);
            if (issued && (issued.password !== login.password || issued.login_email !== login.login_email)) {
              await deps2.progress("found the login the portal emailed you; signing in");
              continue;
            }
          }
          if (!state.signedIn && !state.triedCreate) {
            const create = find(after, CREATE) ?? findCreate(after);
            if (create) {
              state.triedCreate = true;
              state.accountAt = Date.now();
              await deps2.progress("creating your portal account");
              await click(page, create.id);
              continue;
            }
            const here2 = await page.url();
            if (/\/account\/login\b/i.test(here2) && login.status === "created" && !state.wentBackToCreate) {
              state.wentBackToCreate = true;
              state.createNext = false;
              const u = new URL(here2);
              const back = u.searchParams.get("r");
              state.navHistory = [...state.navHistory ?? [], "the saved login has never worked here: opened the portal's account registration"].slice(-12);
              await page.goto(`${u.origin}/account/register${back ? `?r=${encodeURIComponent(back)}` : ""}`, { timeout: 45e3 }).catch(() => null);
              continue;
            }
            if (deps2.portalUrl && !state.wentBackToCreate && login.status === "created" && !state.accountAt && await page.url() !== deps2.portalUrl) {
              state.createNext = true;
              state.wentBackToCreate = true;
              state.navHistory = [...state.navHistory ?? [], "the saved login has never worked here: back to the portal's front page to create the account"].slice(-12);
              await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => null);
              continue;
            }
          }
          const forgot = findForgot(after);
          const canReset = deps2.canReadMail && deps2.resetLink && deps2.rotatePassword && (state.reset?.tries ?? 0) < 2;
          if (forgot && canReset) {
            state.reset = { stage: "requested", at: Date.now(), tries: (state.reset?.tries ?? 0) + 1 };
            await deps2.progress("the portal rejected the saved password, so the agents are resetting it");
            await click(page, forgot.id);
            continue;
          }
          if (!forgot && canReset && !state.lookedForReset) {
            state.lookedForReset = true;
            const reset = { stage: "requested", at: Date.now(), tries: (state.reset?.tries ?? 0) + 1 };
            const o2 = await stuckStep(page, deps2, after, state, "the portal rejected the saved password. find and press the link to reset or recover the password (it may be called forgot password, reset password, need help signing in, or trouble logging in). do not type anything", { kind: "needs_you", reason: "login", note: "" });
            if (!o2) {
              state.reset = reset;
              await deps2.progress("the portal rejected the saved password, so the agents are resetting it");
              continue;
            }
          }
          if (!state.signedIn) return { outcome: { kind: "needs_you", reason: "account", note: "waiting for you to create the portal account" }, state, filled };
          return { outcome: { kind: "needs_you", reason: "login", note: deps2.canReadMail ? "the portal rejected the saved password and has no reset link the agents could use. Reset it on the portal, save the new one under Portal logins, and the agents sign in again by themselves" : "the portal rejected the saved password. Connect Gmail so the agents can reset it themselves, or reset it on the portal and save the new one under Portal logins" }, state, filled };
        }
        if (classify(after) !== "login") state.signedIn = true;
        continue;
      }
      const pwBoxes = s.allFields.filter((f) => f.type === "password");
      const currentBox = pwBoxes.find((f) => /\b(current|old|existing|temporary|present|actuel|ancien)\b/i.test(`${f.label} ${f.name ?? ""}`)) ?? (pwBoxes.length === 3 && CHANGE_PW.test(s.body.slice(0, 3e3)) ? pwBoxes[0] : void 0);
      if ((kind === "signup" || kind === "form") && pwBoxes.length >= 2 && currentBox && deps2.rotatePassword && (state.passwordChanges ?? 0) < 2) {
        const now2 = await deps2.existingLogin();
        if (now2) {
          state.passwordChanges = (state.passwordChanges ?? 0) + 1;
          await deps2.progress("the portal asked for a new password: setting one and saving it under Portal logins");
          const fresh = await deps2.rotatePassword();
          const userBox = s.fields.find((f) => f.type !== "password" && /\b(user\s*(id|name)|login\s*(id|name)?|identifiant|matricule|e-?mail)\b/i.test(`${f.label} ${f.name ?? ""}`));
          if (userBox) await fillText(page, userBox.id, now2.login_email);
          await fillText(page, currentBox.id, now2.password);
          for (const p of pwBoxes) if (p.id !== currentBox.id) await fillText(page, p.id, fresh.password);
          state.navHistory = [...state.navHistory ?? [], "changed the portal password as it asked, and saved the new one"].slice(-12);
          const go = s.buttons.find((x) => /^(change|save|submit|update|continue|confirm|ok|modifier|enregistrer|valider)( (my |the )?password)?$/i.test(clean(x.label))) ?? find(s, CREATE_SUBMIT);
          if (go) await click(page, go.id);
          else await page.pressEnter();
          continue;
        }
      }
      if (kind === "signup") {
        const addAddr = s.buttons.find((b) => /^(add|enter|update)( an?| your)?( home| mailing| permanent| contact)? address$/i.test(clean(b.label)));
        const addrKey = `${(s.url.match(/^https?:\/\/[^/]+/) ?? [""])[0]}|address`;
        if (addAddr && !(state.pressedAsked ?? []).includes(addrKey)) {
          state.pressedAsked = [...state.pressedAsked ?? [], addrKey].slice(-30);
          state.navHistory = [...state.navHistory ?? [], `opened "${clean(addAddr.label)}" before creating the account`].slice(-12);
          await click(page, addAddr.id);
          continue;
        }
        const login = await deps2.existingLogin() ?? await deps2.createLogin(deps2.accountEmail);
        const said = (s.errors ?? []).join(" ").trim();
        if (state.signupTries && USERNAME_TAKEN.test(said) && (state.usernameTries ?? 0) < 3) {
          state.usernameTries = (state.usernameTries ?? 0) + 1;
          const box = usernameBox(s);
          const now2 = box ? await valueOf(page, box.id) : "";
          if (box && now2) {
            const next2 = withNumber(now2, state.usernameTries + 1);
            await fillText(page, box.id, next2);
            state.navHistory = [...state.navHistory ?? [], `the portal said the username was taken: trying "${next2}"`].slice(-12);
          }
        } else if ((state.signupTries ?? 0) >= 3) {
          return { outcome: { kind: "needs_you", reason: "account", note: said ? `the portal didn't create the account. It said: "${said.slice(0, 200)}"` : "the portal didn't create the account and showed no reason. Open the live view to see the sign-up page" }, state, filled };
        }
        state.signupTries = (state.signupTries ?? 0) + 1;
        await deps2.progress("creating your portal account");
        const others = s.fields.filter((f) => f.type !== "password");
        for (const f of others.filter((f2) => f2.type === "email" || /e-?mail/i.test(f2.label))) await fillText(page, f.id, login.login_email);
        let rest = [...others.filter((f) => !(f.type === "email" || /e-?mail/i.test(f.label))), ...dateRedo(s, others)];
        const sec = await securityQuestions(page, rest, login);
        filled += sec.length;
        rest = rest.filter((f) => !sec.includes(f.id));
        filled += await applyFills(page, deps2, rest, state);
        await sleep(1e3);
        await acceptTerms(page, await snap(page));
        await sleep(1500);
        const ready = await snap(page);
        for (const p of ready.allFields.filter((f) => f.type === "password")) await fillText(page, p.id, login.password);
        state.navHistory = [...state.navHistory ?? [], "filled the sign-up form"].slice(-12);
        const go = find(ready, CREATE_SUBMIT) ?? find(s, CREATE_SUBMIT) ?? s.buttons.find((b) => CREATE_LOOSE.test(clean(b.label)) && !/(sign ?in|log ?in|cancel|back|clear|reset|forgot)/i.test(b.label));
        if (!go) {
          const o2 = await stuckStep(page, deps2, s, state, "the sign-up form is filled in; find and press the button that creates the account (it may be at the bottom, below the terms, or be an image or link)", { kind: "needs_you", reason: "stuck", note: "filled the sign-up form but couldn't find the button that creates the account" });
          if (o2) return { outcome: o2, state, filled };
          state.accountAt ??= Date.now();
          continue;
        }
        state.accountAt = Date.now();
        state.navHistory = [...state.navHistory ?? [], `pressed "${clean(go.label)}" to create the account`].slice(-12);
        await click(page, go.id);
        continue;
      }
      if (kind === "verify_code" || kind === "check_email") {
        const since = state.accountAt ?? Date.now() - 14 * 864e5;
        state.verifyWaitSince ??= Date.now();
        if (!deps2.canReadMail) {
          return { outcome: { kind: "needs_you", reason: "verification", note: `the portal sent a verification ${kind === "verify_code" ? "code" : "link"} to your email. open the live view and enter it (connect gmail so the agents can do this for you)` }, state, filled };
        }
        const v = await deps2.verification(since);
        if (!v || !v.code && !v.link) {
          if (Date.now() - state.verifyWaitSince > 20 * 6e4) return { outcome: { kind: "needs_you", reason: "verification", note: "the portal's verification email hasn't reached the agents after 20 minutes. Connect Gmail, or paste the email under Messages \u2192 Paste an email, and they carry on" }, state, filled };
          return { outcome: { kind: "wait", note: "waiting for the portal's verification email", seconds: 60 }, state, filled };
        }
        state.verifyWaitSince = void 0;
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
          await deps2.progress("confirming your email with the portal");
          await page.goto(v.link);
          continue;
        }
        return { outcome: { kind: "needs_you", reason: "verification", note: "found the verification email but couldn't use it; open the live view" }, state, filled };
      }
      if (s.fields.length) {
        const up = await uploadByType(page, deps2, s, state);
        if (up) {
          filled += up;
          continue;
        }
      }
      const redo = dateRedo(s, s.fields);
      if (s.fields.length || redo.length) {
        await deps2.progress(`filling ${s.fields.length + redo.length} field${s.fields.length + redo.length > 1 ? "s" : ""}`);
        filled += await applyFills(page, deps2, [...s.fields, ...redo], state);
        await acceptTerms(page, s);
        await sleep(1500);
        const tried = new Set(s.fields.map((f) => f.id));
        const fresh = (await snap(page)).fields.filter((f) => !tried.has(f.id) || (f.options?.length ?? 0) > (s.fields.find((x) => x.id === f.id)?.options?.length ?? 0));
        if (fresh.length) filled += await applyFills(page, deps2, fresh, state);
      }
      let now = await snap(page);
      if (now.fields.some((f) => f.required)) {
        const h = await fillHard(page, deps2, state);
        filled += h.filled;
        if (h.outcome) return { outcome: h.outcome, state, filled };
        if (h.empty.length) {
          for (const f of h.empty) ask(state, f);
          return { outcome: { kind: "needs_you", reason: "question", note: questionNote(state).slice(0, 290) }, state, filled };
        }
        now = await snap(page);
      }
      const submit = find(now, FINAL) ?? (deps2.finalButton ? find(now, deps2.finalButton) : void 0);
      if (submit) {
        state.reachedSubmit = true;
        const d = await deps2.canSubmit();
        if (!d.allowed) return { outcome: { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` }, state, filled };
        await deps2.progress("submitting your signed packet");
        state.submitClicked = true;
        await click(page, submit.id);
        continue;
      }
      const haveLogin = !s.fields.length && !!await deps2.existingLogin();
      const apply = !s.fields.length ? bestApply(now, state.visited) : void 0;
      let next = find(now, NEXT) ?? (!s.fields.length && haveLogin ? find(now, LOGIN_LINK) ?? findBy(now, isSignIn) : void 0) ?? (apply && (APPLY_STRONG.test(clean(apply.label)) || START.test(clean(apply.label))) ? apply : void 0) ?? find(now, START) ?? find(now, CREATE) ?? (s.fields.length ? find(now, CREATE_SUBMIT) : void 0) ?? // a small sub-page (an address, a qualification) closes with OK / Done
      (s.fields.length ? find(now, /^(ok|okay|done|update)$/i) : void 0) ?? apply;
      if (next && NEW_APP.test(clean(next.label)) && !markNewApp(state, clean(next.label))) next = void 0;
      if (next) {
        const formPage = now.allFields.filter((f) => f.type !== "search" && f.type !== "hidden" && !/\bsearch\b/i.test(f.label)).length >= 2;
        if (formPage && deps2.beforeNext && !await deps2.beforeNext({ label: clean(next.label), title: now.title, url: now.url })) {
          return { outcome: { kind: "needs_you", reason: "review", note: "this page is filled in: check it, then approve it in the Ivyward side panel" }, state, filled };
        }
        if (next.href && next === apply) state.visited = [...state.visited ?? [], here(next.href)].slice(-30);
        await click(page, next.id);
        continue;
      }
      if (kind === "confirmation") return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal says the application is complete, but the runner didn't submit it. check it" }, state, filled };
      const o = await stuckStep(page, deps2, now, state, "none of the usual buttons (next, continue, apply, start, sign in, create account) are on this page. if this is a school or program page, find the link that leads to the online application (it may be called apply online, how to apply, start application, or sit in a menu)", { kind: "needs_you", reason: "stuck", note: "can't find the next step on this page; open the portal and move to the next section" });
      if (o) return { outcome: o, state, filled };
    }
    return { outcome: { kind: "continue", note: "continuing" }, state, filled };
  }
  var DETAIL = {
    date_of_birth: "date of birth",
    dob_month: "date of birth",
    dob_day: "date of birth",
    dob_year: "date of birth",
    phone: "phone",
    address_line1: "address",
    address_line2: "address",
    city: "city",
    state: "state/province",
    postal_code: "postal code",
    country: "country",
    gender: "gender",
    citizenship: "citizenship"
  };
  function missingNote(keys) {
    const labels = [...new Set(keys.map((k) => DETAIL[k] ?? (k.startsWith("rec") ? "recommenders" : k.startsWith("edu") ? "education history" : k.startsWith("work") ? "work history" : k.replace(/_/g, " "))))];
    return labels.length ? `add your ${labels.slice(0, 4).join(", ")} in Profile, under Details for application forms, then choose Try again` : "";
  }
  var EMAILED_LINK = /(received|sent you|we('ve| have) sent|check your) (an )?e-?mail (containing|with) a link|link to (allow you to )?(complete|continue|return to|resume|finish) (the|your) (form|application)|resume (your|the) application (from|using) the link/i;
  var insideForm = (s) => s.fields.filter((f) => f.type !== "search" && !/\bsearch\b/i.test(f.label)).length >= 3;
  var NAV_BUDGET = 30;
  var NEW_APP = /\b(start|create|begin) (a )?new application\b|\bnew application\b/i;
  var DANGEROUS = /\b(pay|payment|checkout|delete|remove|withdraw|cancel (my |the )?application|deactivate|unsubscribe|sign out|log ?out)\b/i;
  async function navStep(page, deps2, s, state, why, fallback) {
    if (!deps2.navigate || (state.navCalls ?? 0) >= NAV_BUDGET) return fallback;
    state.navCalls = (state.navCalls ?? 0) + 1;
    const history = state.navHistory ?? [];
    const a = await deps2.navigate({ why, snapshot: s, history: history.slice(-8), signedIn: !!state.signedIn, haveLogin: !!await deps2.existingLogin() }).catch(orOutage(null));
    if (!a) return fallback;
    const log = (t) => state.navHistory = [...history, t].slice(-12);
    const root2 = (u) => {
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
      const onPage = s.buttons.some((b2) => b2.href === a.url);
      const seg = (u) => {
        try {
          return new URL(u).pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
        } catch {
          return "";
        }
      };
      const seen = [s.url, ...s.buttons.map((b2) => b2.href ?? ""), ...state.visited ?? [], deps2.portalUrl ?? ""].filter(Boolean);
      const plausible = onPage || seen.some((u) => root2(u) === root2(a.url) && seg(u) === seg(a.url));
      if (!/^https:\/\//.test(a.url) || !onPage && root2(a.url) !== root2(s.url) || !plausible) {
        log(`refused goto ${a.url}`);
        return null;
      }
      log(`goto ${a.url}`);
      await page.goto(a.url, { timeout: 45e3 });
      await sleep(1200);
      return null;
    }
    if (a.action === "fill") {
      const f = s.fields.find((x) => x.id === a.target_id);
      const fill = f && deps2.fillFromKey ? await deps2.fillFromKey(f, a.sheet_key) : null;
      if (!f || !fill || NEVER_FILL.test(`${f.label} ${f.name ?? ""}`)) {
        log(`couldn't fill ${f?.label ?? a.target_id} from ${a.sheet_key}`);
        return null;
      }
      log(`fill "${f.label.slice(0, 40)}" from ${a.sheet_key}`);
      if (fill.action === "upload") {
        const file = await deps2.file(fill.file);
        await frameOf(page).setInputFiles(`[data-am-id="${f.id}"]`, file);
      } else await frameOf(page).evaluate((x) => window.__am.apply(x), fill);
      return null;
    }
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
      const d = await deps2.canSubmit();
      if (!d.allowed) return { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` };
      state.submitClicked = true;
    }
    if (NEW_APP.test(label) && !markNewApp(state, label)) {
      log(`didn't press "${label}": an application was started already`);
      return null;
    }
    log(`click "${label}"`);
    state.navClicks = (state.navClicks ?? 0) + 1;
    await deps2.progress(a.note ? a.note.slice(0, 80) : `pressing "${label}"`);
    await click(page, b.id);
    return null;
  }
  async function stuckStep(page, deps2, s, state, why, fallback) {
    const look = (x) => `${x.fingerprint}|${x.url}|${x.fields.length}|${x.buttons.map((b) => b.label).join("/")}`;
    const before = look(s);
    const walled = async () => isBlockPage(await snap(page)) ? { kind: "needs_you", reason: "blocked", note: "this portal blocks the browser the agents are using" } : null;
    const o = await navStep(page, deps2, s, state, why, fallback);
    if (!o) return await walled();
    if (o.kind === "needs_you" && o.reason === "stuck") {
      const w = await walled();
      if (w) return w;
    }
    if (o.kind !== "needs_you" || o.reason !== "stuck" && o.reason !== "login") return o;
    const v = await visionLoop(page, deps2, state, why, []);
    if (v.outcome) return await walled() ?? v.outcome;
    if (!v.acted) return o;
    return look(await snap(page)) !== before ? null : o;
  }
  async function resetStep(page, deps2, s, state) {
    const r = state.reset;
    const login = await deps2.existingLogin();
    const pw = s.allFields.filter((f) => f.type === "password");
    if (r.stage === "requested") {
      const box = s.allFields.find((f) => f.type !== "password" && f.type !== "checkbox" && f.type !== "hidden" && /(e-?mail|user|login|account|id)/i.test(`${f.label} ${f.name ?? ""} ${f.autocomplete ?? ""}`)) ?? s.allFields.find((f) => f.type === "email" || f.type === "text");
      if (!box || pw.length || !login) {
        state.reset = void 0;
        return null;
      }
      const isId = /user\s*(id|name)|login\s*(id|name)|identifiant/i.test(`${box.label} ${box.name ?? ""}`) && !/e-?mail/i.test(box.label);
      await fillText(page, box.id, isId && login.login_email.includes("@") ? login.login_email.split("@")[0] : login.login_email);
      const go2 = s.buttons.find((b) => RESET_BTN.test(clean(b.label)) && !FORGOT.test(clean(b.label)));
      if (go2) await click(page, go2.id);
      else await frameOf(page).press(`[data-am-id="${box.id}"]`, "Enter").catch(() => {
      });
      state.reset = { ...r, stage: "sent", at: Date.now() - 3e4 };
      await deps2.progress("asked the portal for a password reset email");
      return "continue";
    }
    if (r.stage === "sent") {
      if (NO_ACCOUNT.test(s.body.slice(0, 3e3))) {
        state.reset = void 0;
        return { kind: "needs_you", reason: "account", note: "the portal says there's no account for your email yet. Create it on the portal (or let the agents try again from Ivyward), then save the login under Portal logins" };
      }
      const link = await deps2.resetLink(r.at).catch(() => null);
      if (!link) {
        if (Date.now() - r.at > 20 * 6e4) {
          state.reset = void 0;
          return { kind: "needs_you", reason: "login", note: "the portal's password reset email hasn't arrived after 20 minutes. Reset it on the portal and save the new password under Portal logins" };
        }
        return { kind: "wait", note: "waiting for the portal's password reset email", seconds: 60 };
      }
      state.reset = { ...r, stage: "link" };
      await deps2.progress("opening the password reset link from your email");
      await page.goto(link, { timeout: 45e3 });
      return "continue";
    }
    if (!pw.length) return null;
    const fresh = await deps2.rotatePassword();
    for (const p of pw) await fillText(page, p.id, fresh.password);
    const email = s.allFields.find((f) => f.type === "email" || f.type === "text" && /e-?mail/i.test(f.label));
    if (email) await fillText(page, email.id, fresh.login_email).catch(() => {
    });
    const go = find(s, CREATE_SUBMIT) ?? s.buttons.find((b) => RESET_BTN.test(clean(b.label)));
    if (go) await click(page, go.id);
    else await page.pressEnter();
    state.reset = void 0;
    state.signedIn = false;
    await deps2.progress("set a new portal password and saved it under Portal logins");
    return "continue";
  }
  async function readAriaOptions(page, fields) {
    for (const f of fields.filter((x) => x.aria && !(x.options ?? []).length).slice(0, 12)) {
      try {
        await frameOf(page).click(`[data-am-id="${f.id}"]`, { timeout: 5e3 });
        await sleep(700);
        f.options = await frameOf(page).evaluate((i) => window.__am.openOptions(i), f.id).catch(() => []);
        await page.pressKey?.("Escape").catch(() => {
        });
        await sleep(200);
      } catch {
      }
    }
  }
  async function chooseAria(page, id, option) {
    await frameOf(page).click(`[data-am-id="${id}"]`, { timeout: 8e3 });
    await sleep(700);
    const picked = await frameOf(page).evaluate((v) => window.__am.pickOption(v), option).catch(() => null);
    if (!picked) await page.pressKey?.("Escape").catch(() => {
    });
    return !!picked;
  }
  async function applyFills(page, deps2, fields, state) {
    const safe = fields.filter((f) => !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
    if (!safe.length) return 0;
    await readAriaOptions(page, safe);
    return applyList(page, deps2, safe, await deps2.map(safe), state);
  }
  async function applyList(page, deps2, safe, fills, state) {
    let n = 0;
    if (fills.some((f) => f.action === "fill" && f.source === "username")) {
      const hint = await frameOf(page).evaluate((n2) => (document.body?.innerText ?? "").slice(0, n2), 2e4).catch(() => "");
      if (/\bfirst(name)?\s*\.\s*last(name)?\b|first name\s*\.\s*last name|firstname\.lastname/i.test(hint)) {
        for (const f of fills) {
          const field = safe.find((x) => x.id === f.id);
          if (f.action !== "fill" || f.source !== "username" || !field) continue;
          const alt = deps2.fillFromKey ? await deps2.fillFromKey(field, "username_first_last") : null;
          if (alt && alt.action === "fill") f.value = alt.value;
        }
      }
    }
    if (fills.some((f) => f.action === "fill" && ISO_DATE.test(f.value) && safe.find((x) => x.id === f.id)?.type !== "date")) {
      const hint = await frameOf(page).evaluate((n2) => (document.body?.innerText ?? "").slice(0, n2), 2e4).catch(() => "");
      for (const f of fills) {
        const field = safe.find((x) => x.id === f.id);
        if (f.action === "fill" && ISO_DATE.test(f.value) && field?.type !== "date") f.value = dateAs(f.value, `${field?.label ?? ""} ${hint} ${await page.url()}`);
      }
    }
    for (const f of fills) {
      const n0 = n;
      try {
        if (f.action === "skip") {
          const field2 = safe.find((x) => x.id === f.id);
          if (state && f.reason.startsWith("missing:") && field2?.required) {
            state.missing = [.../* @__PURE__ */ new Set([...state.missing ?? [], f.reason.slice(8)])];
            ask(state, field2, f.reason.slice(8));
          }
          continue;
        }
        if (f.action === "upload") {
          const file = await deps2.file(f.file);
          await frameOf(page).setInputFiles(`[data-am-id="${f.id}"]`, file);
          n++;
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
          await frameOf(page).fill(sel, f.value, { timeout: 8e3 });
          await sleep(900);
          const picked = await frameOf(page).evaluate((v) => window.__am.pickOption(v), f.value).catch(() => null);
          if (picked) n++;
          continue;
        }
        const ok = await frameOf(page).evaluate((x) => window.__am.apply(x), f);
        if (ok) n++;
        if (ok && (f.action === "choose" || f.action === "check")) await settle(page);
      } catch {
      } finally {
        if (n > n0 && deps2.onFilled && f.action !== "skip") {
          const label = safe.find((x) => x.id === f.id)?.label ?? "";
          const value = f.action === "fill" ? f.value : f.action === "choose" ? f.option : f.action === "upload" ? f.file : "ticked";
          try {
            deps2.onFilled({ id: f.id, label, action: f.action, value, source: f.source });
          } catch {
          }
        }
      }
    }
    return n;
  }
  async function settle(page) {
    await sleep(300);
    await frameOf(page).evaluate(
      (max) => new Promise((done) => {
        let last = Date.now();
        const start = last;
        const mo = new MutationObserver(() => last = Date.now());
        mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
        const t = setInterval(() => {
          if (Date.now() - last > 700 || Date.now() - start > max) {
            clearInterval(t);
            mo.disconnect();
            done(true);
          }
        }, 100);
      }),
      5e3
    ).catch(() => {
    });
    await page.waitForLoadState("domcontentloaded").catch(() => {
    });
  }
  async function acceptTerms(page, s) {
    for (const f of s.fields.filter((x) => x.type === "checkbox" && TERMS.test(x.label))) {
      await frameOf(page).evaluate((id) => window.__am.apply({ id, action: "check" }), f.id).catch(() => {
      });
    }
  }

  // extension/src/chrome-page.ts
  var sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
  function b64(buf) {
    let s = "";
    for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + 32768)));
    return btoa(s);
  }
  async function run(tabId, frameId, func, arg) {
    const res = await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, func, args: arg === void 0 ? [] : [arg] });
    const r = res?.[0];
    if (r?.error) throw new Error(String(r.error?.message ?? r.error));
    return r?.result;
  }
  function pageClick(sel) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const el = deep(sel);
    if (!el) throw new Error("element gone: " + sel);
    el.scrollIntoView({ block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    el.dispatchEvent(new PointerEvent("pointerdown", o));
    el.dispatchEvent(new MouseEvent("mousedown", o));
    el.dispatchEvent(new PointerEvent("pointerup", o));
    el.dispatchEvent(new MouseEvent("mouseup", o));
    el.click();
    return true;
  }
  function pageFill(a) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const el = deep(a.sel);
    if (!el) throw new Error("field gone: " + a.sel);
    el.focus();
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, a.value);
    else el.value = a.value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    return true;
  }
  function pageEnter(sel) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const el = sel ? deep(sel) : document.activeElement;
    if (!el) return false;
    el.focus();
    const o = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    const down = el.dispatchEvent(new KeyboardEvent("keydown", o));
    el.dispatchEvent(new KeyboardEvent("keypress", o));
    el.dispatchEvent(new KeyboardEvent("keyup", o));
    const form = el.form;
    if (down && form) {
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.submit();
    }
    return true;
  }
  function pageFiles(a) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const el = deep(a.sel);
    if (!el) throw new Error("upload box gone");
    const bin = atob(a.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], a.name, { type: a.mime }));
    el.files = dt.files;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function ptClick(a) {
    const el = document.elementFromPoint(a.x, a.y);
    if (!el) return false;
    const o = { bubbles: true, cancelable: true, composed: true, view: window, clientX: a.x, clientY: a.y, button: 0, pointerType: "mouse" };
    el.dispatchEvent(new PointerEvent("pointerover", o));
    el.dispatchEvent(new MouseEvent("mouseover", o));
    el.dispatchEvent(new PointerEvent("pointermove", o));
    el.dispatchEvent(new MouseEvent("mousemove", o));
    if (a.hover) return true;
    const times = a.double ? 2 : 1;
    for (let i = 0; i < times; i++) {
      el.dispatchEvent(new PointerEvent("pointerdown", { ...o, buttons: 1 }));
      el.dispatchEvent(new MouseEvent("mousedown", { ...o, buttons: 1, detail: i + 1 }));
      const f = el.closest("input,textarea,select,[contenteditable=''],[contenteditable=true],[tabindex],button,a");
      if (f && typeof f.focus === "function") f.focus();
      el.dispatchEvent(new PointerEvent("pointerup", o));
      el.dispatchEvent(new MouseEvent("mouseup", { ...o, detail: i + 1 }));
      el.click();
    }
    if (a.double) el.dispatchEvent(new MouseEvent("dblclick", { ...o, detail: 2 }));
    return true;
  }
  function ptType(text) {
    const el = document.activeElement;
    if (!el) return false;
    const key = (k, type) => el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      for (const ch of text) {
        key(ch, "keydown");
        key(ch, "keypress");
        const v = el.value + ch;
        if (setter) setter.call(el, v);
        else el.value = v;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
        key(ch, "keyup");
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (el.isContentEditable) {
      document.execCommand("insertText", false, text);
      return true;
    }
    return false;
  }
  function ptKey(k) {
    const el = document.activeElement ?? document.body;
    const codes = { Enter: 13, Tab: 9, Escape: 27, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Space: 32, Backspace: 8, PageDown: 34, PageUp: 33, Home: 36, End: 35 };
    const name = k === "Space" ? " " : k;
    const o = { key: name, code: k, keyCode: codes[k] ?? 0, which: codes[k] ?? 0, bubbles: true, cancelable: true };
    const go = el.dispatchEvent(new KeyboardEvent("keydown", o));
    el.dispatchEvent(new KeyboardEvent("keyup", o));
    if (!go) return true;
    if (k === "Tab") {
      const all = Array.from(document.querySelectorAll("a[href],button,input,select,textarea,[tabindex]")).filter((e) => e.tabIndex >= 0 && !e.disabled && e.offsetParent !== null);
      const i = all.indexOf(el);
      all[(i + 1) % all.length]?.focus();
    } else if (k === "Backspace" && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, el.value.slice(0, -1));
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    } else if (k === "Space" && (el instanceof HTMLButtonElement || el instanceof HTMLInputElement && /checkbox|radio/.test(el.type) || el.getAttribute("role") === "checkbox")) {
      el.click();
    } else if (k === "Enter") {
      if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) el.click();
      else if (el instanceof HTMLInputElement && el.form) el.form.requestSubmit ? el.form.requestSubmit() : el.form.submit();
    } else if (/^Page(Down|Up)$|^Home$|^End$/.test(k)) {
      const h = window.innerHeight * 0.85;
      if (k === "PageDown") window.scrollBy(0, h);
      else if (k === "PageUp") window.scrollBy(0, -h);
      else window.scrollTo(0, k === "Home" ? 0 : document.body.scrollHeight);
    }
    return true;
  }
  function ptScroll(a) {
    let el = a.x !== void 0 && a.y !== void 0 ? document.elementFromPoint(a.x, a.y) : null;
    while (el && el !== document.body) {
      const st = getComputedStyle(el);
      if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 2) {
        el.scrollBy(0, a.dy);
        return true;
      }
      el = el.parentElement;
    }
    window.scrollBy(0, a.dy);
    return true;
  }
  function ptUpload(a) {
    const el = document.elementFromPoint(a.x, a.y);
    const box = (el instanceof HTMLInputElement && el.type === "file" ? el : null) ?? el?.closest("label")?.querySelector('input[type="file"]') ?? el?.closest("label")?.control ?? el?.closest("div,section,form,li")?.querySelector('input[type="file"]') ?? null;
    if (!(box instanceof HTMLInputElement) || box.type !== "file") return false;
    const bin = atob(a.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], a.name, { type: a.mime }));
    box.files = dt.files;
    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function barVisible(show) {
    const el = document.getElementById("ivyward-runner-bar");
    if (el) el.style.visibility = show ? "" : "hidden";
    return true;
  }
  async function shoot(windowId, tabId, quality) {
    await run(tabId, 0, barVisible, false).catch(() => {
    });
    try {
      return await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality });
    } finally {
      await run(tabId, 0, barVisible, true).catch(() => {
      });
    }
  }
  async function captureSmall(tabId) {
    const t = await chrome.tabs.get(tabId);
    if (!t.active) return void 0;
    const url = await shoot(t.windowId, tabId, 55);
    if (typeof OffscreenCanvas === "undefined") return url;
    const bmp = await createImageBitmap(await (await fetch(url)).blob());
    const w = Math.min(720, bmp.width);
    const h = Math.round(bmp.height * w / bmp.width);
    const c = new OffscreenCanvas(w, h);
    c.getContext("2d").drawImage(bmp, 0, 0, w, h);
    const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.55 });
    const buf = new Uint8Array(await blob.arrayBuffer());
    return "data:image/jpeg;base64," + b64(buf);
  }
  async function capture(tabId) {
    const t = await chrome.tabs.get(tabId);
    if (!t.active) await chrome.tabs.update(tabId, { active: true });
    const url = await shoot(t.windowId, tabId, 60);
    const dpr = await run(tabId, 0, (() => window.devicePixelRatio || 1)) || 1;
    const blob = await (await fetch(url)).blob();
    if (dpr === 1 || typeof OffscreenCanvas === "undefined") return new Uint8Array(await blob.arrayBuffer());
    const bmp = await createImageBitmap(blob);
    const w = Math.round(bmp.width / dpr);
    const h = Math.round(bmp.height / dpr);
    const c = new OffscreenCanvas(w, h);
    c.getContext("2d").drawImage(bmp, 0, 0, w, h);
    return new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality: 0.6 })).arrayBuffer());
  }
  function chromePage(tabId) {
    let mainUrl = "";
    const frame = (frameId, url) => ({
      isMain: frameId === 0,
      url: () => frameId === 0 ? mainUrl || url : url,
      helper: async () => {
        await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ["dom-helper.js"] });
      },
      evaluate: (fn, arg) => run(tabId, frameId, fn, arg),
      click: async (sel) => {
        await run(tabId, frameId, pageClick, sel);
      },
      fill: async (sel, value) => {
        await run(tabId, frameId, pageFill, { sel, value });
      },
      press: async (sel) => {
        await run(tabId, frameId, pageEnter, sel);
      },
      setInputFiles: async (sel, file) => {
        await run(tabId, frameId, pageFiles, { sel, b64: b64(file.buffer), name: file.name, mime: file.mime });
      }
    });
    const waitLoad = async (timeout, settle2) => {
      const end = Date.now() + timeout;
      await sleep2(250);
      while (Date.now() < end) {
        const t = await chrome.tabs.get(tabId);
        mainUrl = t.url || mainUrl;
        if (t.status === "complete") break;
        await sleep2(300);
      }
      if (settle2) await sleep2(settle2);
    };
    return {
      url: async () => {
        const t = await chrome.tabs.get(tabId);
        mainUrl = t.url || mainUrl;
        return mainUrl;
      },
      mainFrame: () => frame(0, mainUrl),
      frames: async () => {
        const all = await chrome.webNavigation.getAllFrames({ tabId }) ?? [];
        const main = all.find((f) => f.frameId === 0);
        if (main) mainUrl = main.url;
        return all.filter((f) => !f.errorOccurred).map((f) => frame(f.frameId, f.url));
      },
      goto: async (url, o) => {
        await chrome.tabs.update(tabId, { url });
        await waitLoad(o?.timeout ?? 45e3, 600);
      },
      waitForLoadState: (state, o) => waitLoad(o?.timeout ?? 15e3, state === "networkidle" ? 700 : 0),
      pressEnter: async () => {
        await run(tabId, 0, pageEnter, null);
      },
      // eyes and hands for the screenshot steps. chrome only captures the tab on screen, so it's brought to the front
      screenshot: () => capture(tabId),
      mouseClick: async (x, y) => {
        await run(tabId, 0, ptClick, { x, y });
      },
      doubleClick: async (x, y) => {
        await run(tabId, 0, ptClick, { x, y, double: true });
      },
      hover: async (x, y) => {
        await run(tabId, 0, ptClick, { x, y, hover: true });
      },
      typeText: async (text) => {
        await run(tabId, 0, ptType, text);
      },
      pressKey: async (key) => {
        await run(tabId, 0, ptKey, key);
      },
      scrollBy: async (dy, x, y) => {
        await run(tabId, 0, ptScroll, { dy, x, y });
      },
      goBack: async () => {
        await chrome.tabs.goBack(tabId).catch(() => null);
        await waitLoad(2e4, 500);
      },
      uploadAt: async (x, y, file) => run(tabId, 0, ptUpload, { x, y, b64: b64(file.buffer), name: file.name, mime: file.mime })
    };
  }

  // extension/src/background.ts
  var DEFAULT_API = "https://tryivyward.com";
  var RUN_MS = 15 * 6e4;
  var VERSION = chrome.runtime.getManifest().version;
  var GROUP_TITLE = "Ivyward";
  var PAY_HOST = /(^|\.)(flywire\.com|paypal\.com|stripe\.com|checkout\.stripe\.com|braintreegateway\.com|cybersource\.com|authorize\.net|paymentus\.com|touchnet\.(com|net)|transact\.com|nelnet\.(com|net)|worldpay\.com|adyen\.com|paystack\.co|paystack\.com|flutterwave\.com)$/i;
  var MAX_PAGES = 15;
  var sleep3 = (ms) => new Promise((r) => setTimeout(r, ms));
  async function nap(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await sleep3(Math.min(15e3, end - Date.now()));
      await chrome.runtime.getPlatformInfo();
    }
  }
  async function cfg() {
    return chrome.storage.local.get({ api: DEFAULT_API, token: "", auto: true, approval: "submit", parallel: 2, pmSignIn: false, checkins: true });
  }
  async function api(path, opts = {}) {
    const c = await cfg();
    if (!c.token) throw new Error("not connected: open Ivyward and choose Connect Chrome");
    const res = await fetch(c.api.replace(/\/$/, "") + path, {
      ...opts,
      headers: { authorization: `Bearer ${c.token}`, ...opts.body ? { "content-type": "application/json" } : {}, ...opts.headers || {} }
    });
    if (res.status === 401) throw new Error("this browser was disconnected: connect it again from Ivyward");
    return res;
  }
  async function apiJson(path, opts) {
    const res = await api(path, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `error ${res.status}`);
    return json;
  }
  var eng = (application, op, body = {}) => apiJson("/api/runner/engine", { method: "POST", body: JSON.stringify({ application, op, ...body }) });
  var panelApi = (body) => apiJson("/api/runner/panel", { method: "POST", body: JSON.stringify(body) });
  var runs = /* @__PURE__ */ new Map();
  var control = /* @__PURE__ */ new Map();
  var lastTasks = null;
  var publishTimer;
  async function publish() {
    const pending = (await chrome.storage.session.get({ pending: [] })).pending;
    await chrome.storage.session.set({ runs: [...runs.values()] });
    const waiting = (lastTasks?.tasks ?? []).filter((t) => t.runner_status === "needs_you" && t.mode === "extension").length;
    const n = pending.length + waiting;
    await chrome.action.setBadgeText({ text: n ? String(n) : runs.size ? "\u2022" : "" }).catch(() => {
    });
    await chrome.action.setBadgeBackgroundColor({ color: n ? "#ea580c" : "#4f46e5" }).catch(() => {
    });
  }
  chrome.storage.session.set({ pending: [], runs: [] }).catch(() => {
  });
  async function setPhase(taskId, phase, st) {
    const r = runs.get(taskId);
    if (!r) return;
    r.phase = phase;
    if (st) r.state = st;
    await publish();
    await banner(r.tabId, r.school, phase, r.state);
  }
  async function tasks() {
    lastTasks = await apiJson("/api/runner/tasks");
    await publish();
    return lastTasks;
  }
  function notify(id, title, message) {
    chrome.notifications.create(id + ":" + Date.now(), { type: "basic", iconUrl: "icons/icon-128.png", title, message, priority: 2 });
  }
  chrome.notifications.onClicked.addListener(async (nid) => {
    const r = runs.get(nid.split(":")[0]);
    if (r) await focusTab(r.tabId);
    else await openPanel();
  });
  async function focusTab(tabId) {
    const t = await chrome.tabs.update(tabId, { active: true }).catch(() => null);
    if (t) await chrome.windows.update(t.windowId, { focused: true }).catch(() => {
    });
  }
  async function openPanel(windowId) {
    try {
      const w = windowId ?? (await chrome.windows.getLastFocused()).id;
      await chrome.sidePanel.open({ windowId: w });
    } catch {
    }
  }
  async function tabAlive(tabId) {
    return !!await chrome.tabs.get(tabId).catch(() => null);
  }
  async function intoGroup(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const { groupId } = await chrome.storage.session.get({ groupId: -1 });
      let gid = -1;
      if (groupId >= 0) {
        const g = await chrome.tabGroups.get(groupId).catch(() => null);
        if (g && g.windowId === tab.windowId) gid = groupId;
      }
      gid = await chrome.tabs.group(gid >= 0 ? { tabIds: [tabId], groupId: gid } : { tabIds: [tabId] });
      await chrome.tabGroups.update(gid, { title: GROUP_TITLE, color: "purple" });
      await chrome.storage.session.set({ groupId: gid });
    } catch {
    }
  }
  function pageBanner(a) {
    const ID = "ivyward-runner-bar";
    let host = document.getElementById(ID);
    if (a.hide) {
      host?.remove();
      return true;
    }
    if (!host) {
      host = document.createElement("div");
      host.id = ID;
      host.setAttribute("aria-hidden", "true");
      host.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;pointer-events:none";
      const root3 = host.attachShadow({ mode: "closed" });
      host.__root = root3;
      root3.innerHTML = `<style>
      .bar{pointer-events:auto;display:flex;gap:8px;align-items:center;font:12px/1.3 system-ui,sans-serif;background:#1c1530;color:#fff;border-radius:999px;padding:6px 6px 6px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);max-width:340px}
      .dot{width:8px;height:8px;border-radius:50%;background:#a78bfa;flex:none}
      .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      button{font:inherit;border:0;border-radius:999px;padding:4px 10px;cursor:pointer;background:#fff;color:#1c1530}
      button.ghost{background:transparent;color:#d8ccff}
    </style><div class="bar"><span class="dot"></span><span class="t"></span><button class="ghost" data-a="panel">Details</button><button data-a="pause">Pause</button></div>`;
      root3.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (b) chrome.runtime.sendMessage({ type: "banner:" + b.dataset.a });
      });
      document.documentElement.appendChild(host);
    }
    const root2 = host.__root;
    root2.querySelector(".t").textContent = a.state === "paused" || a.state === "taken_over" ? `Ivyward paused \xB7 ${a.school}` : `Ivyward is working \xB7 ${a.phase}`;
    const btn = root2.querySelector('[data-a="pause"]');
    btn.textContent = a.state === "paused" || a.state === "taken_over" ? "Resume" : "Pause";
    btn.dataset.a = a.state === "paused" || a.state === "taken_over" ? "resume" : "pause";
    return true;
  }
  async function banner(tabId, school, phase, state, hide = false) {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, func: pageBanner, args: [{ school, phase: phase.slice(0, 80), state, hide }] }).catch(() => {
    });
  }
  chrome.webNavigation.onCompleted.addListener((d) => {
    if (d.frameId !== 0) return;
    for (const r of runs.values()) if (r.tabId === d.tabId) banner(r.tabId, r.school, r.phase, r.state);
  });
  async function ask2(p, minutes) {
    const id = `${p.taskId}:${p.kind}:${Date.now()}`;
    const { pending } = await chrome.storage.session.get({ pending: [] });
    await chrome.storage.session.set({ pending: [...pending.filter((x) => !(x.taskId === p.taskId && x.kind === p.kind)), { ...p, id, at: Date.now() }] });
    await publish();
    notify(p.taskId, p.school, p.title);
    const end = Date.now() + minutes * 6e4;
    let answer = null;
    while (Date.now() < end) {
      const { answers } = await chrome.storage.session.get({ answers: {} });
      if (id in answers) {
        answer = !!answers[id];
        delete answers[id];
        await chrome.storage.session.set({ answers });
        break;
      }
      const c = control.get(p.taskId);
      if (c?.stop && c.why !== "offsite") break;
      await sleep3(1e3);
      await chrome.runtime.getPlatformInfo();
    }
    const { pending: now } = await chrome.storage.session.get({ pending: [] });
    await chrome.storage.session.set({ pending: now.filter((x) => x.id !== id) });
    await publish();
    return answer;
  }
  function closePage(r, tabUrl) {
    const last = r.pages[r.pages.length - 1];
    if (r.current && !r.current.fills.length && last && last.url === r.current.url) {
      if (r.current.shot) last.shot = r.current.shot;
    } else if (r.current && (r.current.fills.length || r.current.shot)) {
      r.pages = [...r.pages, r.current].slice(-MAX_PAGES);
    }
    r.current = tabUrl ? { title: "", url: tabUrl, fills: [] } : null;
  }
  async function finishPage(taskId) {
    const r = runs.get(taskId);
    if (!r?.current) return;
    const tab = await chrome.tabs.get(r.tabId).catch(() => null);
    if (!tab) return;
    r.current.title = tab.title || r.current.title;
    if (tab.active) r.current.shot = await captureSmall(r.tabId).catch(() => void 0);
    const page = r.current;
    if (page.fills.length) {
      panelApi({ op: "page", application: taskId, title: page.title.slice(0, 300), url: page.url.slice(0, 2e3), filled: page.fills.map((f) => f.label.slice(0, 200)).slice(0, 150), shot: page.shot?.replace(/^data:image\/jpeg;base64,/, "") }).catch(() => {
      });
    }
    closePage(r, tab.url);
    await publish();
  }
  var root = (h) => h.replace(/^www\./, "").split(".").slice(-2).join(".");
  function hostOf2(u) {
    try {
      return u ? new URL(u).hostname : "";
    } catch {
      return "";
    }
  }
  async function allowed(taskId) {
    const { allow } = await chrome.storage.local.get({ allow: {} });
    return /* @__PURE__ */ new Set([...control.get(taskId)?.allow ?? [], ...allow[taskId] ?? []]);
  }
  async function remember(taskId, host) {
    const { allow } = await chrome.storage.local.get({ allow: {} });
    const a = allow;
    a[taskId] = [.../* @__PURE__ */ new Set([...a[taskId] ?? [], root(host)])].slice(-20);
    await chrome.storage.local.set({ allow: a });
    control.get(taskId)?.allow.add(root(host));
  }
  chrome.webNavigation.onCommitted.addListener(async (d) => {
    if (d.frameId !== 0 || !/^https?:/.test(d.url)) return;
    for (const r of runs.values()) {
      if (r.tabId !== d.tabId) continue;
      const c = control.get(r.taskId);
      const h = hostOf2(d.url);
      if (!c || !h || IDP_HOST.test(h) || PAY_HOST.test(h)) return;
      if ((await allowed(r.taskId)).has(root(h))) return;
      c.stop = true;
      c.why = "offsite";
      c.offsite = h;
    }
  });
  function deps(taskId, start, tabId, s) {
    const host = async () => new URL((await chrome.tabs.get(tabId)).url).hostname;
    let lastNote = "";
    const typed = /* @__PURE__ */ new Map();
    if (!sheets.has(taskId)) apiJson(`/api/runner/sheet?application=${taskId}`).then((d) => sheets.set(taskId, d)).catch(() => {
    });
    let checkedAt = 0;
    return {
      shouldStop: () => {
        const c = control.get(taskId);
        if (Date.now() - checkedAt > 6e3) {
          checkedAt = Date.now();
          apiJson("/api/runner/tasks").then((d) => {
            const t = d.tasks.find((x) => x.id === taskId);
            if ((!t || t.mode !== "extension") && c) {
              c.stop = true;
              c.why = "ivyward";
            }
          }).catch(() => {
          });
        }
        return !!c?.stop;
      },
      map: async (fields) => (await apiJson("/api/runner/map", { method: "POST", body: JSON.stringify({ application: taskId, host: await host().catch(() => void 0), fields: fields.slice(0, 150).map((f) => ({ id: f.id, label: f.label.slice(0, 400), type: f.type, name: f.name?.slice(0, 200), options: f.options?.slice(0, 300).map((o) => o.slice(0, 200)), required: f.required })) }) })).fills,
      file: async (key) => {
        if (!sheets.has(taskId)) sheets.set(taskId, await apiJson(`/api/runner/sheet?application=${taskId}`));
        const f = sheets.get(taskId).files.find((x) => x.key === key);
        if (!f) throw new Error("file not in the packet");
        const res = await api(f.url);
        if (!res.ok) throw new Error("couldn't fetch " + f.label);
        return { name: f.filename, mime: res.headers.get("content-type") || "application/octet-stream", buffer: new Uint8Array(await res.arrayBuffer()) };
      },
      // the server checks the packet is signed and paid for; then the applicant sees every answer and says submit.
      // nothing is submitted from this browser without that yes
      canSubmit: async () => {
        const d = await apiJson("/api/runner/check", { method: "POST", body: JSON.stringify({ application: taskId }) });
        if (!d.allowed) return d;
        const r = runs.get(taskId);
        await finishPage(taskId);
        if (r) await setPhase(taskId, "waiting for you to review and submit", "waiting");
        const yes = await ask2({ taskId, school: r?.school ?? "", kind: "submit", title: "Everything is filled in. Check your answers in the side panel, then choose Submit." }, 60);
        if (r) await setPhase(taskId, yes ? "submitting" : "waiting for your review", "working");
        return yes ? d : { allowed: false, reason: "waiting for you to review the answers and choose Submit in the Ivyward side panel" };
      },
      existingLogin: async () => (await eng(taskId, "login_get", { host: await host() })).login,
      createLogin: async (email) => (await eng(taskId, "login_create", { host: await host(), email })).login,
      accountEmail: start.accountEmail,
      canReadMail: start.canReadMail,
      verification: async (since) => (await eng(taskId, "verification", { host: await host(), since })).found,
      navigate: async (input) => (await eng(taskId, "navigate", { host: await host(), input: { ...input, snapshot: { ...input.snapshot, body: input.snapshot.body.slice(0, 4e3) } } })).action,
      fillFromKey: async (field, key) => (await eng(taskId, "fill_key", { field: { id: field.id, label: field.label.slice(0, 400), type: field.type, name: field.name, options: field.options?.slice(0, 300), required: field.required }, key })).fill,
      loginFromMail: start.canReadMail ? async (since) => (await eng(taskId, "login_mail", { host: await host(), since })).login : void 0,
      decide: async (fields, page) => (await eng(taskId, "decide", { fields: fields.slice(0, 60).map((f) => ({ id: f.id, label: f.label.slice(0, 400), type: f.type, name: f.name?.slice(0, 200), options: f.options?.slice(0, 300).map((o) => o.slice(0, 200)), required: f.required })), page: { url: page.url.slice(0, 2e3), title: page.title.slice(0, 300), body: page.body.slice(0, 4e3), errors: (page.errors ?? []).slice(0, 20).map((e) => e.slice(0, 300)) } })).fills ?? [],
      resetLink: start.canReadMail ? async (since) => (await eng(taskId, "reset_link", { host: await host(), since })).link : void 0,
      rotatePassword: async () => (await eng(taskId, "rotate", { host: await host() })).login,
      // screenshot steps: the picture goes to Ivyward, which picks the move (and the value to type, from the fill sheet)
      see: async (v) => {
        let bin = "";
        for (let i = 0; i < v.image.length; i += 32768) bin += String.fromCharCode.apply(null, Array.from(v.image.subarray(i, i + 32768)));
        const r = await eng(taskId, "see", { host: await host(), image: btoa(bin), goal: v.goal.slice(0, 400), url: v.url.slice(0, 2e3), history: v.history.slice(-12).map((h) => h.slice(0, 200)), empty: v.empty.slice(0, 30).map((e) => e.slice(0, 200)), marks: v.marks.slice(0, 120).map((m) => ({ ...m, type: m.type.slice(0, 30), label: m.label.slice(0, 200), value: m.value.slice(0, 200) })) });
        if (r.action?.sheet_key && typeof r.value === "string") typed.set(r.action.sheet_key, r.value);
        return r.action ?? null;
      },
      sheetValue: (key) => typed.get(key) ?? null,
      files: () => sheets.get(taskId)?.files.map((f) => f.key) ?? [],
      progress: async (note) => {
        if (note === lastNote) return;
        lastNote = note;
        await setPhase(taskId, note);
        await eng(taskId, "progress", { note: note.slice(0, 300) }).catch(() => {
        });
      },
      onFilled: (f) => {
        const r = runs.get(taskId);
        if (!r) return;
        if (!r.current) r.current = { title: "", url: "", fills: [] };
        r.current.fills = [...r.current.fills.filter((x) => x.id !== f.id), { id: f.id, label: f.label.replace(/\s+/g, " ").trim().slice(0, 160), action: f.action, value: f.value.slice(0, 300) }].slice(-120);
        clearTimeout(publishTimer);
        publishTimer = setTimeout(publish, 250);
      },
      beforeNext: async (p) => {
        await finishPage(taskId);
        if (s.approval !== "page") return true;
        const c = control.get(taskId);
        if (c?.approvedPage) {
          c.approvedPage = false;
          return true;
        }
        const r = runs.get(taskId);
        await setPhase(taskId, "waiting for you to approve this page", "waiting");
        const yes = await ask2({ taskId, school: r?.school ?? "", kind: "page", title: `Page filled in: ${p.title.slice(0, 80)}. Approve it to go on to "${p.label.slice(0, 40)}".` }, 30);
        await setPhase(taskId, yes ? `pressing "${p.label.slice(0, 40)}"` : "waiting for you", yes ? "working" : "waiting");
        return !!yes;
      },
      signInYourself: () => s.pmSignIn
    };
  }
  var sheets = /* @__PURE__ */ new Map();
  async function peek(tabId) {
    try {
      await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ["dom-helper.js"] });
      const [r] = await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, func: () => window.__am.snapshot() });
      return r?.result ?? null;
    } catch {
      return null;
    }
  }
  async function watch(tabId, minutes, done, taskId) {
    const end = Date.now() + minutes * 6e4;
    while (Date.now() < end) {
      await nap(4e3);
      if (!await tabAlive(tabId)) return false;
      if (taskId && control.get(taskId)?.stop && control.get(taskId)?.why !== "offsite") return false;
      const s = await peek(tabId);
      if (s && done(s)) return true;
    }
    return false;
  }
  function readBack(ids) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const out = {};
    for (const id of ids) {
      const el = deep(`[data-am-id="${id}"]`);
      if (!el) {
        out[id] = null;
        continue;
      }
      if (el instanceof HTMLSelectElement) out[id] = el.selectedIndex >= 0 ? el.options[el.selectedIndex].text.trim() : "";
      else if (el.type === "checkbox") out[id] = el.checked ? "ticked" : "";
      else if (el.type === "radio") {
        const group = el.name ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)) : [el];
        const on = group.find((g) => g.checked);
        out[id] = on ? (on.labels?.[0]?.textContent ?? on.value).trim() : "";
      } else if (el.type === "file" || el.type === "password") out[id] = null;
      else out[id] = String(el.value ?? "");
    }
    return out;
  }
  async function learnCorrections(taskId) {
    const r = runs.get(taskId);
    if (!r) return 0;
    const answers = [...r.pages.slice(-3).flatMap((p) => p.fills), ...r.current?.fills ?? []].filter((a) => a.action !== "upload");
    if (!answers.length) return 0;
    const [res] = await chrome.scripting.executeScript({ target: { tabId: r.tabId, frameIds: [0] }, func: readBack, args: [answers.map((a) => a.id)] }).catch(() => [null]);
    const now = res?.result ?? {};
    const items = answers.filter((a) => now[a.id] != null && now[a.id].trim() !== a.value.trim() && now[a.id].trim()).map((a) => ({ label: a.label, value: now[a.id].trim().slice(0, 2e3) }));
    if (!items.length) return 0;
    const tab = await chrome.tabs.get(r.tabId).catch(() => null);
    await panelApi({ op: "corrections", application: taskId, host: hostOf2(tab?.url), items: items.slice(0, 60) }).catch(() => {
    });
    return items.length;
  }
  async function runTask(task, opts = {}) {
    if (runs.has(task.id)) return;
    const s = await cfg();
    const c = { stop: false, why: "", allow: /* @__PURE__ */ new Set() };
    control.set(task.id, c);
    let tabId;
    try {
      const start = await eng(task.id, "start", { claim: !!opts.claim });
      if (start.stop) {
        if (opts.claim) notify(task.id, task.school, start.stop);
        return;
      }
      for (const u of [start.url, task.portal_url]) if (hostOf2(u)) c.allow.add(root(hostOf2(u)));
      const { tabs: kept } = await chrome.storage.session.get({ tabs: {} });
      const prev = kept[task.id];
      tabId = opts.tabId ?? (prev && await tabAlive(prev) ? prev : void 0);
      if (!tabId) tabId = (await chrome.tabs.create({ url: start.url, active: !!opts.focus })).id;
      else if (opts.focus) await focusTab(tabId);
      if (opts.tabId) c.allow.add(root(hostOf2((await chrome.tabs.get(tabId)).url)));
      await chrome.storage.session.set({ tabs: { ...kept, [task.id]: tabId } });
      await intoGroup(tabId);
      runs.set(task.id, { taskId: task.id, school: task.school, tabId, startedAt: Date.now(), phase: "starting", state: "working", pages: [], current: null });
      await setPhase(task.id, "starting");
      const page = chromePage(tabId);
      await page.waitForLoadState("domcontentloaded", { timeout: 45e3 }).catch(() => {
      });
      let state = start.state;
      for (let round = 0; round < 20; round++) {
        let outcome;
        let filled = 0;
        try {
          const r = await runEngine(page, deps(task.id, start, tabId, s), state, RUN_MS);
          state = r.state;
          outcome = r.outcome;
          filled = r.filled;
        } catch (e) {
          if (!await tabAlive(tabId)) outcome = { kind: "needs_you", reason: "stuck", note: "the portal tab was closed. Choose Run in my Chrome to carry on" };
          else outcome = { kind: "failed", note: `the agents hit a problem in Chrome: ${String(e?.message ?? e).slice(0, 160)}` };
        }
        if (c.stop) {
          if (c.why === "offsite") {
            const h = c.offsite ?? "";
            c.stop = false;
            c.why = "";
            await setPhase(task.id, `waiting: is ${h} part of ${task.school}'s application?`, "waiting");
            const yes = await ask2({ taskId: task.id, school: task.school, kind: "offsite", host: h, title: `The agents went to ${h}, which isn't ${task.school}'s portal. Let them work there?` }, 30);
            if (yes) {
              await remember(task.id, h);
              await setPhase(task.id, "carrying on", "working");
              continue;
            }
            await chrome.tabs.goBack(tabId).catch(() => {
            });
            outcome = { kind: "needs_you", reason: "stuck", note: `the agents were stopped from working on ${h}. Open the portal tab and take the next step yourself, then choose Run in my Chrome` };
          } else if (c.why === "pause" || c.why === "takeover") {
            await eng(task.id, "save", { state, url: (await chrome.tabs.get(tabId).catch(() => null))?.url }).catch(() => {
            });
            await setPhase(task.id, c.why === "takeover" ? "you have the wheel: hand back in the side panel when you're done" : "paused: resume from the side panel", c.why === "takeover" ? "taken_over" : "paused");
            const end = Date.now() + 2 * 36e5;
            while (c.stop && Date.now() < end && await tabAlive(tabId)) await nap(2e3);
            if (c.stop) break;
            await setPhase(task.id, "carrying on", "working");
            continue;
          } else {
            if (c.why === "ivyward") notify(task.id, task.school, "Paused in Ivyward. The tab stays open; nothing else happens until you resume.");
            else await eng(task.id, "finish", { state, outcome: { kind: "needs_you", reason: "stopped", note: "you stopped it in Chrome. Choose Run in my Chrome to carry on" } }).catch(() => {
            });
            break;
          }
        }
        const tab = await chrome.tabs.get(tabId).catch(() => null);
        const url = tab?.url;
        const host = hostOf2(url) || void 0;
        const fin = await eng(task.id, "finish", { state, url, filled, host, outcome }).catch(() => ({}));
        if (fin.stop) {
          notify(task.id, task.school, "Paused in Ivyward. The tab stays open; nothing else happens until you resume.");
          break;
        }
        if (outcome.kind === "continue") continue;
        if (outcome.kind === "wait") {
          await setPhase(task.id, "waiting for an email", "waiting");
          await nap(Math.min(outcome.seconds, 120) * 1e3);
          await setPhase(task.id, "carrying on", "working");
          continue;
        }
        if (outcome.kind === "submitted") {
          await finishPage(task.id);
          notify(task.id, `${task.school}: submitted`, "The application went in. Ivyward has recorded it.");
          break;
        }
        if (outcome.kind === "needs_you" && ["captcha", "blocked", "payment", "login", "review"].includes(outcome.reason)) {
          const k = outcome.reason;
          if (k === "review") {
            const yes = await ask2({ taskId: task.id, school: task.school, kind: "page", title: "This page is waiting for your approval in the side panel." }, 60);
            if (yes) {
              await setPhase(task.id, "carrying on", "working");
              state = { ...state, samePageCount: 0 };
              c.approvedPage = true;
              continue;
            }
            break;
          }
          if (k === "login" && !s.pmSignIn) {
            notify(task.id, `${task.school}: needs you`, fin.note || outcome.note);
            break;
          }
          const what = k === "payment" ? "Pay the application fee in the portal tab. The agents confirm the submission after." : k === "login" ? "Sign in to the portal in its tab (your password manager can fill it in). The agents carry on once you're in." : "Complete the check in the portal tab. The agents carry on by themselves.";
          await setPhase(task.id, k === "payment" ? "waiting for you to pay" : k === "login" ? "waiting for you to sign in" : "waiting for you to complete a check", "waiting");
          const pend = ask2({ taskId: task.id, school: task.school, kind: k === "payment" ? "payment" : k === "login" ? "signin" : "check", title: what }, k === "payment" ? 60 : 30);
          const startUrl = url;
          const done = await watch(
            tabId,
            k === "payment" ? 60 : 30,
            (x) => k === "payment" ? x.confirmation || !x.payment && x.url !== startUrl : k === "login" ? classify(x) !== "login" : !x.captcha && !isBlockPage(x),
            task.id
          );
          const { answers } = await chrome.storage.session.get({ answers: {} });
          const { pending } = await chrome.storage.session.get({ pending: [] });
          for (const p of pending) if (p.taskId === task.id) answers[p.id] = true;
          await chrome.storage.session.set({ answers });
          await pend;
          if (done) {
            await eng(task.id, "progress", { note: "carrying on after your step" }).catch(() => {
            });
            await setPhase(task.id, "carrying on", "working");
            await nap(1500);
            continue;
          }
          break;
        }
        if (outcome.kind === "needs_you") {
          await setPhase(task.id, outcome.reason === "question" ? "waiting for your answers (side panel)" : "needs you", "waiting");
          notify(task.id, `${task.school}: needs you`, fin.note || outcome.note);
          if (outcome.reason === "question") await openPanel();
        }
        break;
      }
    } catch (e) {
      notify(task.id, task.school, String(e?.message ?? e).slice(0, 200));
    } finally {
      if (tabId) await banner(tabId, task.school, "", "", true);
      runs.delete(task.id);
      control.delete(task.id);
      sheets.delete(task.id);
      const { pending } = await chrome.storage.session.get({ pending: [] });
      await chrome.storage.session.set({ pending: pending.filter((p) => p.taskId !== task.id) });
      await tasks().catch(() => publish());
      setTimeout(poll, 1e3);
    }
  }
  chrome.tabs.onRemoved.addListener((tabId) => {
    for (const r of runs.values()) {
      if (r.tabId !== tabId) continue;
      const c = control.get(r.taskId);
      if (c) {
        c.stop = true;
        c.why = "closed";
      }
    }
  });
  async function poll() {
    const c = await cfg();
    if (!c.token) return;
    let data;
    try {
      data = await tasks();
    } catch {
      return;
    }
    await checkVersion().catch(() => {
    });
    if (data.paused || !c.auto) return;
    const now = Date.now();
    const room = Math.max(1, Math.min(3, c.parallel)) - runs.size;
    if (room <= 0) return;
    const next = data.tasks.filter((t) => t.mode === "extension" && ["ready", "running"].includes(t.runner_status) && !runs.has(t.id) && (!t.resume_at || t.resume_at <= now)).slice(0, room);
    for (const t of next) runTask(t);
  }
  async function checkVersion() {
    const { versionAt } = await chrome.storage.local.get({ versionAt: 0 });
    if (Date.now() - versionAt < 6 * 36e5) return;
    const d = await apiJson("/api/runner/panel");
    await chrome.storage.local.set({ versionAt: Date.now(), latest: d.latest ?? VERSION });
  }
  function pageText() {
    return { title: document.title, text: (document.body?.innerText ?? "").slice(0, 3e4) };
  }
  async function checkins() {
    const c = await cfg();
    if (!c.token || !c.checkins || runs.size) return;
    const d = await apiJson("/api/runner/panel?what=checkins");
    const due = d.checkins.filter((x) => !x.last || Date.now() - x.last > 7 * 864e5).slice(0, 5);
    for (const x of due) {
      if (runs.size) return;
      const tab = await chrome.tabs.create({ url: x.url, active: false });
      try {
        await intoGroup(tab.id);
        await chromePage(tab.id).waitForLoadState("networkidle", { timeout: 45e3 }).catch(() => {
        });
        await nap(2500);
        const snap2 = await peek(tab.id);
        const t = await chrome.tabs.get(tab.id);
        if (!snap2 || classify(snap2) === "login") {
          await panelApi({ op: "checkin", application: x.id, url: t.url, title: t.title ?? "", text: "", signedOut: true }).catch(() => {
          });
          continue;
        }
        const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, func: pageText });
        const res = await panelApi({ op: "checkin", application: x.id, url: t.url, title: r.result.title, text: r.result.text }).catch(() => null);
        if (res?.changed) notify(x.id, `${x.school}: your portal changed`, res.summary ?? "Open Ivyward to see what changed.");
      } finally {
        await chrome.tabs.remove(tab.id).catch(() => {
        });
      }
    }
  }
  function ensureAlarms() {
    chrome.alarms.create("poll", { periodInMinutes: 1 });
    chrome.alarms.create("checkins", { periodInMinutes: 24 * 60, delayInMinutes: 30 });
    chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false }).catch?.(() => {
    });
  }
  chrome.runtime.onInstalled.addListener(ensureAlarms);
  chrome.runtime.onStartup.addListener(ensureAlarms);
  chrome.alarms.onAlarm.addListener((a) => {
    if (a.name === "poll") poll();
    if (a.name === "checkins") checkins().catch(() => {
    });
  });
  async function handle(msg, sender) {
    if (msg.type === "bridge:hello") {
      const c = await cfg();
      const a = [...runs.values()][0];
      return { version: VERSION, paired: !!c.token, running: a ? { id: a.taskId, school: a.school, phase: a.phase } : null, runs: [...runs.values()].map((r) => ({ id: r.taskId, school: r.school, phase: r.phase })) };
    }
    if (msg.type === "bridge:pair") {
      const origin = new URL(sender.url).origin;
      if (!/^amr_[\w-]{20,}$/.test(msg.token)) throw new Error("bad key");
      await chrome.storage.local.set({ token: msg.token, api: origin, auto: true });
      ensureAlarms();
      setTimeout(poll, 500);
      return { paired: true, version: VERSION };
    }
    if (msg.type === "bridge:run" || msg.type === "popup:start") {
      const d = await tasks();
      const t = d.tasks.find((x) => x.id === msg.id);
      if (!t) throw new Error("that application isn't queued for submitting");
      if (runs.has(t.id)) return { started: true };
      const c = await cfg();
      if (runs.size >= Math.max(1, Math.min(3, c.parallel))) throw new Error(`busy with ${[...runs.values()].map((r) => r.school).join(" and ")}; this one is next`);
      runTask(t, { claim: true, focus: msg.type === "popup:start" || !!msg.focus });
      return { started: true };
    }
    if (msg.type === "bridge:kick" || msg.type === "popup:poll") {
      poll();
      return { ok: true };
    }
    if (msg.type === "popup:tasks" || msg.type === "panel:state") {
      const d = lastTasks ?? await tasks();
      const { pending } = await chrome.storage.session.get({ pending: [] });
      const { latest } = await chrome.storage.local.get({ latest: VERSION });
      return { ...d, runs: [...runs.values()], active: [...runs.values()][0] ?? null, pending, version: VERSION, latest, settings: await cfg().then(({ token: _t, ...rest }) => (void _t, rest)) };
    }
    if (msg.type === "popup:attach") {
      const d = await tasks();
      const t = d.tasks.find((x) => x.id === msg.id);
      if (!t) throw new Error("not in your queue");
      if (runs.has(t.id)) throw new Error("already running");
      runTask(t, { claim: true, tabId: msg.tabId });
      return { started: true };
    }
    if (msg.type === "popup:panel") {
      await openPanel(msg.windowId);
      return { ok: true };
    }
    if (msg.type === "panel:resolve") {
      const { answers } = await chrome.storage.session.get({ answers: {} });
      await chrome.storage.session.set({ answers: { ...answers, [msg.id]: !!msg.ok } });
      return { ok: true };
    }
    if (msg.type === "panel:pause" || msg.type === "panel:takeover") {
      const c = control.get(msg.id);
      if (!c) throw new Error("not running");
      c.stop = true;
      c.why = msg.type === "panel:takeover" ? "takeover" : "pause";
      if (msg.type === "panel:takeover") {
        const r = runs.get(msg.id);
        if (r) await focusTab(r.tabId);
      }
      await setPhase(msg.id, msg.type === "panel:takeover" ? "handing you the wheel\u2026" : "pausing after this step\u2026");
      return { ok: true };
    }
    if (msg.type === "panel:resume") {
      const c = control.get(msg.id);
      const r = runs.get(msg.id);
      if (!c || !r) throw new Error("not running");
      const learned = r.state === "taken_over" ? await learnCorrections(msg.id).catch(() => 0) : 0;
      c.stop = false;
      c.why = "";
      return { ok: true, learned };
    }
    if (msg.type === "panel:stop") {
      const c = control.get(msg.id);
      if (c) {
        c.stop = true;
        c.why = "closed";
      }
      return { ok: true };
    }
    if (msg.type === "panel:focus") {
      const r = runs.get(msg.id);
      if (r) await focusTab(r.tabId);
      return { ok: true };
    }
    if (msg.type === "panel:questions") return apiJson(`/api/runner/panel${msg.id ? `?application=${msg.id}` : ""}`);
    if (msg.type === "panel:answer") return panelApi({ op: "answer", id: msg.id, answer: msg.answer });
    if (msg.type === "panel:settings") {
      const allowedKeys = ["approval", "parallel", "pmSignIn", "checkins", "auto"];
      const patch = Object.fromEntries(Object.entries(msg.settings ?? {}).filter(([k]) => allowedKeys.includes(k)));
      await chrome.storage.local.set(patch);
      if ("parallel" in patch) setTimeout(poll, 300);
      return { ok: true };
    }
    if (msg.type === "panel:facts") {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id || !/^https?:/.test(tab.url || "")) throw new Error("open a university page in this window first");
      const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, func: pageText });
      return panelApi({ op: "facts", url: tab.url, title: r.result.title, text: r.result.text });
    }
    if (msg.type === "panel:save_deadline") return panelApi({ op: "facts_save", application: msg.id, deadline: msg.deadline });
    if (msg.type === "panel:checkins") {
      await chrome.storage.local.set({ versionAt: 0 });
      checkins().catch(() => {
      });
      return { ok: true };
    }
    if (msg.type.startsWith("banner:")) {
      const r = [...runs.values()].find((x) => x.tabId === sender.tab?.id);
      if (msg.type === "banner:panel") await openPanel(sender.tab?.windowId);
      if (r && msg.type === "banner:pause") return handle({ type: "panel:pause", id: r.taskId }, sender);
      if (r && msg.type === "banner:resume") return handle({ type: "panel:resume", id: r.taskId }, sender);
      return { ok: true };
    }
    return null;
  }
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    handle(msg, sender).then(
      (v) => reply({ ok: true, value: v }),
      (e) => reply({ ok: false, error: String(e?.message ?? e) })
    );
    return true;
  });
})();
