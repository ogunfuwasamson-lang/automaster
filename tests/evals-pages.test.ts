// the eval set, page level: small copies of portal pages where real runs stopped (structure and wording only;
// no applicant data), run through the engine with the sample applicant and no model. a case passes when the
// engine gets through the page the way a careful person would. passing cases may not start failing
// (evals/baseline.json "pages_pass"); failing ones are the to-do list.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import type { Browser, Page } from "playwright-core";
import { runEngine, type EngineDeps, type EngineState, type Login } from "@/lib/cloud-engine";
import { fromPlaywright } from "@/lib/engine-page";
import { mapByRules, resolve, type Fill, type PageField } from "@/lib/runner-map";
import { keyForLabel } from "@/lib/fillsheet";
import { cleanLabel } from "@/lib/labels";
import { sampleSheet } from "@/evals/sample";
import baseline from "../evals/baseline.json";

const req = createRequire(import.meta.url);
let chromium: { launch(): Promise<Browser> } | null = null;
try {
  chromium = req("playwright").chromium;
} catch {
  chromium = null;
}
const d = chromium ? describe : describe.skip;
const sheet = sampleSheet({ schoolCountry: "Canada" });

function deps(): EngineDeps & { logins: Login[] } {
  const logins: Login[] = [];
  return {
    logins,
    map: async (fields: PageField[]) => {
      const { fills, unresolved } = mapByRules(fields, sheet);
      return [...fills, ...unresolved.map((f) => ({ id: f.id, action: "skip", reason: "not in your profile" }) as Fill)];
    },
    fillFromKey: (f, k) => resolve(f, k, sheet),
    sheetValue: (k) => sheet.fields[k] ?? null,
    // as in production: does the profile have a value for this label
    hasValue: (label) => {
      const k = keyForLabel(cleanLabel(label));
      return !!k && !!sheet.fields[k];
    },
    file: async () => ({ name: "x.pdf", mime: "application/pdf", buffer: new Uint8Array() }),
    canSubmit: async () => ({ allowed: true, reason: "ok" }),
    existingLogin: async () => logins.at(-1) ?? null,
    createLogin: async (email) => {
      const l = { login_email: email, password: "Eval-pass-9Q!" };
      logins.push(l);
      return l;
    },
    accountEmail: "ada@example.com",
    verification: async () => null,
    canReadMail: true,
    progress: async () => {},
  };
}

type Routes = Record<string, (q: URLSearchParams) => string>;
async function portal(page: Page, routes: Routes) {
  await page.route("https://portal.test/**", (route) => {
    const u = new URL(route.request().url());
    const h = routes[u.pathname] as ((q: URLSearchParams) => string) | undefined;
    return route.fulfill({ status: h ? 200 : 404, contentType: "text/html", body: `<!doctype html><html><head><title>Portal</title></head><body>${h ? h(u.searchParams) : "not found"}</body></html>` });
  });
}

type Case = { id: string; why: string; run: (b: Browser) => Promise<boolean> };

const CASES: Case[] = [
  {
    id: "calgary-eid-guest",
    why: "eID sign-up: an optional UCID box with an 'I don't have a UCID' checkbox. the run typed into the UCID box and the portal refused it",
    run: async (b) => {
      const page = await b.newPage();
      let ok = false;
      const form = (err = "") => `${err ? `<p class="error">${err}</p>` : ""}<form action="/eid"><h1>eID Account Registration</h1>
        <label for="u">eID first.last Must be in the pattern first.last name *</label><input id="u" name="username" required>
        <label for="c">UCID</label><input id="c" name="UCID">
        <input type="checkbox" id="n" name="noUCID"><label for="n">I don't have a UCID and wish to register a guest account</label>
        <label for="f">First Name</label><input id="f" name="firstname"><label for="l">Last Name *</label><input id="l" name="lastname" required>
        <label for="e">Email address</label><input id="e" name="emailaddress">
        <label for="y">Year YYYY Ex. 1999 *</label><input id="y" name="dobYear" required><label for="m">Month MM Ex. 01 for January *</label><input id="m" name="dobMonth" required><label for="dd">Day DD Ex. 05 for the 5th *</label><input id="dd" name="dobDay" required>
        <label for="p1">Password *</label><input id="p1" type="password" name="newPassword" required><label for="p2">Confirm Password *</label><input id="p2" type="password" name="confirmPassword" required>
        <button type="submit">Create eID</button></form>`;
      await portal(page, {
        "/register": () => form(),
        "/eid": (q) => {
          const ucid = q.get("UCID") ?? "";
          if (ucid && !/^\d{8}$/.test(ucid)) return form("UCID must be maximum 8 numbers long with leading zeros. Ex. 00123456");
          if (!ucid && q.get("noUCID") !== "on") return form("All fields are required.");
          ok = q.get("username") === "ada.okafor" && q.get("dobYear") === "1996" && !!q.get("newPassword") && q.get("newPassword") === q.get("confirmPassword");
          return `<h1>Your eID has been created</h1><p>Check your email to activate it.</p>`;
        },
      });
      await page.goto("https://portal.test/register");
      await runEngine(fromPlaywright(page), deps(), { steps: 0 } as EngineState, 25_000).catch(() => null);
      await page.close();
      return ok;
    },
  },
  {
    id: "hec-new-account",
    why: "PeopleSoft 'New Account' behind a cookie banner: user ID and email, the portal emails the password. the run asked the applicant for a password",
    run: async (b) => {
      const page = await b.newPage();
      let ok = false;
      await portal(page, {
        "/new": () => `<div id="onetrust-banner" style="position:fixed;inset:0;background:#fff;z-index:9"><p>We use cookies.</p><button onclick="this.parentNode.remove()">Accept all</button><button onclick="this.parentNode.remove()">Confirm My Choices</button></div>
          <form action="/created"><h1>New Account</h1><label for="o">User ID: *</label><input id="o" name="N_CPTE_USG_DAL_OPRID" required><label for="m">E-mail: *</label><input id="m" name="N_CPTE_USG_DAL_N_EMAIL_DAL" required>
          <input type="submit" class="PSLEVEL1GRIDODDROW" value="Create an account"></form>`,
        "/created": (q) => ((ok = !!q.get("N_CPTE_USG_DAL_OPRID") && q.get("N_CPTE_USG_DAL_N_EMAIL_DAL") === "ada@example.com"), `<h1>Account created</h1><p>Your password has been sent to your email address.</p>`),
      });
      await page.goto("https://portal.test/new");
      await runEngine(fromPlaywright(page), deps(), { steps: 0 } as EngineState, 25_000).catch(() => null);
      await page.close();
      return ok;
    },
  },
  {
    id: "uk-residency-radio",
    why: "UK fee-status page: 'ordinarily resident in the UK for three years' with Yes/No. it went to the applicant",
    run: async (b) => {
      const page = await b.newPage();
      let got = "";
      await portal(page, {
        "/fees": () => `<form action="/next"><h1>Fee status</h1><fieldset><legend>Will you be ordinarily resident in the UK for three years before the course begins? *</legend>
          <input type="radio" id="y" name="r" value="Y" required><label for="y">Yes</label><input type="radio" id="n" name="r" value="N"><label for="n">No</label></fieldset>
          <fieldset><legend>Have you ever studied in the UK? *</legend><input type="radio" id="sy" name="s" value="Y" required><label for="sy">Yes</label><input type="radio" id="sn" name="s" value="N"><label for="sn">No</label></fieldset>
          <button>Save and continue</button></form>`,
        "/next": (q) => ((got = `${q.get("r")}|${q.get("s")}`), `<h1>Thank you for submitting your application.</h1>`),
      });
      await page.goto("https://portal.test/fees");
      await runEngine(fromPlaywright(page), deps(), { steps: 0, submitClicked: true } as EngineState, 25_000).catch(() => null);
      await page.close();
      return got === "N|N";
    },
  },
  {
    id: "mcgill-term-list",
    why: "'Application Type' whose options are terms, with a postdoc option that contains the word Graduate",
    run: async (b) => {
      const page = await b.newPage();
      let got = "";
      await portal(page, {
        "/start": () => `<form action="/next"><h1>Start a new application</h1><label for="t">Application Type *</label><select id="t" name="t" required><option value="">Select</option><option value="pd">Postdoctoral Research and Graduate Research Trainee (all terms)</option><option value="f26">Fall / Automne 2026</option><option value="f27">Fall / Automne 2027</option><option value="w27">Winter / Hiver 2027</option></select><button>Continue</button></form>`,
        "/next": (q) => ((got = q.get("t") ?? ""), `<h1>Thank you for submitting your application.</h1>`),
      });
      await page.goto("https://portal.test/start");
      await runEngine(fromPlaywright(page), deps(), { steps: 0, submitClicked: true } as EngineState, 25_000).catch(() => null);
      await page.close();
      return got === "f27";
    },
  },
  {
    id: "box-drops-value",
    why: "a box whose script clears what was typed the first time (the page then refuses Next as incomplete)",
    run: async (b) => {
      const page = await b.newPage();
      let got = "";
      await portal(page, {
        "/p": () => `<form action="/next"><h1>Contact</h1><label for="c">City *</label><input id="c" name="c" required>
          <label for="z">Postal code</label><input id="z" name="z">
          <script>let once=false;document.getElementById('c').addEventListener('change',e=>{if(!once){once=true;setTimeout(()=>{e.target.value=''},50)}})</script>
          <button>Next</button></form>`,
        "/next": (q) => ((got = q.get("c") ?? ""), `<h1>Thank you for submitting your application.</h1>`),
      });
      await page.goto("https://portal.test/p");
      await runEngine(fromPlaywright(page), deps(), { steps: 0, submitClicked: true } as EngineState, 25_000).catch(() => null);
      await page.close();
      return got === "Lagos";
    },
  },
  {
    id: "review-holds-wrong-term",
    why: "the review page shows the wrong term: the last look before Submit holds it, and Try again submits it as it is",
    run: async (b) => {
      const page = await b.newPage();
      let submitted = 0;
      await portal(page, {
        "/review": () => `<h1>Review your application</h1><p>Program: MSc Finance. Term: Spring 2026.</p><form action="/sent"><button>Submit application</button></form>`,
        "/sent": () => ((submitted++), `<h1>Thank you for submitting your application.</h1>`),
      });
      const dp = { ...deps(), reviewSubmit: async (p: { body: string }) => (/Spring 2026/.test(p.body) ? { ok: false, problems: ["the term is Spring 2026, your packet says fall 2027"] } : { ok: true, problems: [] }) };
      await page.goto("https://portal.test/review");
      const r1 = await runEngine(fromPlaywright(page), dp, { steps: 0 } as EngineState, 20_000).catch(() => null);
      const held = r1?.outcome.kind === "needs_you" && r1.outcome.reason === "review" && submitted === 0;
      await page.goto("https://portal.test/review");
      await runEngine(fromPlaywright(page), dp, r1!.state, 20_000).catch(() => null);
      await page.close();
      return held && submitted === 1;
    },
  },
  {
    id: "route-memory",
    why: "a page whose way on is one of several plain section links: the first run stops; a run with the way recorded from before gets through",
    run: async (b) => {
      const page = await b.newPage();
      let reached = 0;
      await portal(page, {
        "/a": () => `<h1>Section A</h1><p>Read the guidance for this section.</p><a href="/c">References</a><a href="/b">Funding</a><a href="/help">Help</a>`,
        "/b": () => ((reached++), `<h1>Thank you for submitting your application.</h1>`),
      });
      await page.goto("https://portal.test/a");
      const first = await runEngine(fromPlaywright(page), deps(), { steps: 0, submitClicked: true } as EngineState, 12_000).catch(() => null);
      const stoppedFirst = reached === 0 && first?.outcome.kind === "needs_you";
      await page.goto("https://portal.test/a");
      const dp = { ...deps(), knownStep: (k: string) => (k.startsWith("portal.test/a#") ? "Funding" : null) };
      await runEngine(fromPlaywright(page), dp, { steps: 0, submitClicked: true } as EngineState, 12_000).catch(() => null);
      await page.close();
      return stoppedFirst && reached === 1;
    },
  },
];

d("eval: portal pages where runs stopped", () => {
  let browser: Browser;
  const results = new Map<string, boolean>();
  beforeAll(async () => {
    browser = await chromium!.launch();
    for (const c of CASES) results.set(c.id, await c.run(browser).catch(() => false));
  }, 240_000);
  afterAll(async () => {
    await browser?.close();
  });

  it("prints the scoreboard", () => {
    console.log(`\neval (pages): ${[...results.values()].filter(Boolean).length} of ${CASES.length} pages handled`);
    for (const c of CASES) console.log(`  ${results.get(c.id) ? "pass" : "FAIL"} ${c.id}: ${c.why}`);
  });

  it("keeps every page that passed before", () => {
    const lost = ((baseline as { pages_pass?: string[] }).pages_pass ?? []).filter((id) => !results.get(id));
    expect(lost).toEqual([]);
  });
});
