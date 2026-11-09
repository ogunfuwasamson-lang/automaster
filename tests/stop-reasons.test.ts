// the stop reasons from claude/stop-reasons.md: each one against a small fake portal in a real chromium
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import type { Browser, Page } from "playwright-core";
import { runEngine, lockMinutes, safeFileName, LOCKED, CLOSED, DOWN, WRONG_PROGRAM, type EngineDeps, type EngineState } from "@/lib/cloud-engine";
import type { EngineFile } from "@/lib/engine-page";
import { fromPlaywright } from "@/lib/engine-page";
import { mapByRules, resolve, type Fill, type PageField } from "@/lib/runner-map";
import type { FillSheet } from "@/lib/fillsheet";

const req = createRequire(import.meta.url);
let chromium: { launch(): Promise<Browser> } | null = null;
try {
  chromium = req("playwright").chromium;
} catch {
  chromium = null;
}
const d = chromium ? describe : describe.skip;

const sheet: FillSheet = {
  application_id: "a",
  school: "Test University",
  program: "MSc Finance",
  portal_url: null,
  attested: true,
  fields: {
    first_name: "Ada", last_name: "Okafor", email: "ada@example.com", country: "Nigeria", state: "Lagos",
    address_line1: "12 Admiralty Way, Lekki Phase One, Lagos Island, Lagos State",
    edu1_institution: "University of Lagos", edu1_degree: "BSc", edu2_institution: "Kings College Lagos", edu2_degree: "WAEC",
  },
  essays: [{ artifact_id: "e1", title: "Statement", text: "word ".repeat(400).trim() } as never],
  files: [{ key: "cv", label: "CV", filename: "Adá's CV (final) v2.docx", url: "/api/runner/file?document=1" } as never],
  missing: [],
};

function deps(over: Partial<EngineDeps> = {}): EngineDeps & { asked: { key: string; pdf?: boolean }[] } {
  const asked: { key: string; pdf?: boolean }[] = [];
  return {
    asked,
    map: async (fields: PageField[]) => {
      const { fills, unresolved } = mapByRules(fields, sheet);
      return [
        ...fills,
        ...unresolved.map((f) =>
          f.type === "file" && /cv|resume/i.test(f.label) ? ({ id: f.id, action: "upload", file: "cv", source: "cv" } as Fill) : /statement|essay/i.test(f.label) ? ({ id: f.id, action: "fill", value: sheet.essays[0].text, source: "essay:e1" } as Fill) : ({ id: f.id, action: "skip", reason: "not in your profile" } as Fill),
        ),
      ];
    },
    file: async (key, want) => {
      asked.push({ key, pdf: want?.pdf });
      return { name: want?.pdf ? "Adá's CV (final) v2.pdf" : "Adá's CV (final) v2.docx", mime: "application/pdf", buffer: new Uint8Array([37, 80, 68, 70]) } as EngineFile;
    },
    fillFromKey: (f, k) => resolve(f, k, sheet),
    canSubmit: async () => ({ allowed: true, reason: "ok" }),
    existingLogin: async () => ({ login_email: "ada@example.com", password: "Pw-saved-1A", status: "verified" }),
    createLogin: async (email) => ({ login_email: email, password: "Pw-first-1A" }),
    accountEmail: "ada@example.com",
    verification: async () => null,
    canReadMail: false,
    progress: async () => {},
    ...over,
  } as EngineDeps & { asked: { key: string; pdf?: boolean }[] };
}

type Routes = Record<string, (q: URLSearchParams) => string>;
async function portal(page: Page, routes: Routes) {
  await page.route("https://portal.test/**", (route) => {
    const u = new URL(route.request().url());
    const h = routes[u.pathname] as ((q: URLSearchParams) => string) | undefined;
    return route.fulfill({ status: h ? 200 : 404, contentType: "text/html", body: `<!doctype html><html><head><title>Portal</title></head><body>${h ? h(u.searchParams) : "not found"}</body></html>` });
  });
}
const fresh = (x: Partial<EngineState> = {}) => ({ steps: 0, ...x }) as EngineState;

describe("stop reason rules", () => {
  it("reads how long a lock lasts", () => {
    expect(lockMinutes("Too many attempts. Try again in 15 minutes.")).toBe(17);
    expect(lockMinutes("Your account is temporarily locked.")).toBe(30);
    expect(lockMinutes("try again after 2 hours")).toBe(122);
    expect(LOCKED.test("Logins are temporarily blocked for this account")).toBe(true);
    expect(LOCKED.test("Sign in to continue")).toBe(false);
  });
  it("knows closed intakes, outages and a wrong-program application", () => {
    expect(CLOSED.test("Applications are now closed for Fall 2027.")).toBe(true);
    expect(CLOSED.test("Applications open on 1 October.")).toBe(true);
    expect(CLOSED.test("Apply now for Fall 2027")).toBe(false);
    expect(DOWN.test("The system is currently unavailable due to scheduled maintenance")).toBe(true);
    expect(WRONG_PROGRAM.test("This GradApp is for the MS/MBA Double Degree, not MS in Innovation")).toBe(true);
    expect(WRONG_PROGRAM.test("opened the application")).toBe(false);
  });
  it("makes file names portals accept", () => {
    expect(safeFileName("Adá's CV (final) v2.pdf")).toBe("Ada_s_CV_final_v2.pdf");
    expect(safeFileName("x".repeat(90) + ".docx").length).toBeLessThanOrEqual(60);
  });
  it("picks a state list's not-applicable choice when the applicant's state isn't there", () => {
    const f = { id: "s", label: "State *", type: "select", options: ["Select", "Alabama", "Alaska", "Not Applicable / Outside US"] } as PageField;
    expect(resolve(f, "state", sheet)).toMatchObject({ action: "choose", option: "Not Applicable / Outside US" });
  });
});

d("stop reasons on fake portals", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
  });

  it("waits out a locked account instead of stopping (brandeis)", async () => {
    const page = await browser.newPage();
    await portal(page, { "/login": () => `<h1>Sign in</h1><p class="error">Too many failed attempts. Please try again in 15 minutes.</p><form><label for="u">Email</label><input id="u" type="email"><label for="p">Password</label><input id="p" type="password"><button>Sign in</button></form>` });
    await page.goto("https://portal.test/login");
    const r = await runEngine(fromPlaywright(page), deps(), fresh(), 20_000);
    expect(r.outcome).toMatchObject({ kind: "wait", seconds: 17 * 60 });
    await page.close();
  }, 40_000);

  it("comes back later when the portal is down for maintenance", async () => {
    const page = await browser.newPage();
    await portal(page, { "/": () => `<h1>Service unavailable</h1><p>The application system is currently unavailable due to scheduled maintenance.</p>` });
    await page.goto("https://portal.test/");
    const r = await runEngine(fromPlaywright(page), deps(), fresh(), 20_000);
    expect(r.outcome).toMatchObject({ kind: "wait", seconds: 1800 });
    await page.close();
  }, 40_000);

  it("says so when applications are closed", async () => {
    const page = await browser.newPage();
    await portal(page, { "/": () => `<h1>Graduate admissions</h1><p>Applications are now closed for Fall 2027. Thank you for your interest.</p>` });
    await page.goto("https://portal.test/");
    const r = await runEngine(fromPlaywright(page), deps(), fresh(), 20_000);
    expect(r.outcome).toMatchObject({ kind: "needs_you", reason: "closed" });
    await page.close();
  }, 40_000);

  it("lists every required document the packet lacks in one stop (stirling)", async () => {
    const page = await browser.newPage();
    await portal(page, {
      "/docs": () => `<h1>My documents</h1><form action="/next"><label for="t">Academic transcript *</label><input id="t" type="file" required><label for="c">Degree certificate *</label><input id="c" type="file" required><button>Next</button></form>`,
    });
    await page.goto("https://portal.test/docs");
    const r = await runEngine(fromPlaywright(page), deps(), fresh(), 20_000);
    expect(r.outcome).toMatchObject({ kind: "needs_you", reason: "documents" });
    expect(r.outcome.note).toMatch(/transcript/i);
    expect(r.outcome.note).toMatch(/certificate/i);
    await page.close();
  }, 40_000);

  it("uploads a PDF with a clean name when the box only takes PDF, and fits a long address to its box", async () => {
    const page = await browser.newPage();
    let got = "";
    await portal(page, {
      "/form": () => `<h1>Details</h1><form action="/done" method="get"><label for="a">Address line 1 *</label><input id="a" name="a" maxlength="35" required>
        <label for="cv">CV / Resume *</label><input id="cv" name="cv" type="file" accept=".pdf" required><button type="submit">Next</button></form>
        <script>document.getElementById('cv').addEventListener('change',e=>{document.body.dataset.file=e.target.files[0].name})</script>`,
      "/done": (q) => ((got = q.get("a") ?? ""), `<h1>Thanks</h1><p>Thank you for submitting your application.</p>`),
    });
    await page.goto("https://portal.test/form");
    const dd = deps();
    let name = "";
    page.on("framenavigated", async () => {});
    const watch = setInterval(async () => (name = (await page.evaluate(() => document.body.dataset.file ?? "").catch(() => name)) || name), 100);
    await runEngine(fromPlaywright(page), dd, fresh({ submitClicked: true }), 30_000);
    clearInterval(watch);
    expect(dd.asked).toEqual([{ key: "cv", pdf: true }]);
    expect(name).toBe("Ada_s_CV_final_v2.pdf");
    expect(got.length).toBeLessThanOrEqual(35);
    expect(got).toMatch(/^12 Admiralty Way/);
    expect(got.endsWith(" ")).toBe(false);
    await page.close();
  }, 60_000);

  it("never cuts an essay to fit: flags it instead", async () => {
    const page = await browser.newPage();
    await portal(page, { "/form": () => `<h1>Statement</h1><form action="/next"><label for="s">Personal statement *</label><textarea id="s" maxlength="500" required></textarea><button>Next</button></form>` });
    await page.goto("https://portal.test/form");
    const r = await runEngine(fromPlaywright(page), deps(), fresh(), 20_000);
    expect(r.outcome).toMatchObject({ kind: "needs_you", reason: "documents" });
    expect(r.outcome.note).toMatch(/500 characters/);
    expect(await page.inputValue("#s")).toBe("");
    await page.close();
  }, 40_000);

  it("adds the applicant's second education entry through 'Add another qualification'", async () => {
    const page = await browser.newPage();
    const saved: string[] = [];
    await portal(page, {
      "/edu": (q) => {
        if (q.get("i")) saved.push(q.get("i")!);
        return `<h1>Education</h1><p>Saved: ${saved.length}</p><form action="/edu"><label for="i">Institution *</label><input id="i" name="i" required>
          <button type="submit" name="go" value="add">Add another qualification</button><button type="submit" formaction="/done">Next</button></form>`;
      },
      "/done": () => `<h1>Thanks</h1><p>Thank you for submitting your application.</p>`,
    });
    await page.goto("https://portal.test/edu");
    const rr = await runEngine(fromPlaywright(page), deps(), fresh({ submitClicked: true }), 40_000);
    // entry 1 saved through "Add another", entry 2 typed in and sent with Next
    expect(saved).toEqual(["University of Lagos"]);
    expect(decodeURIComponent(page.url())).toContain("i=Kings+College+Lagos");
    expect(rr.state.entries).toEqual({ edu: 1 });
    await page.close();
  }, 60_000);

  it("asks once before starting a second application when the one started is for another program (ut dallas)", async () => {
    const page = await browser.newPage();
    await portal(page, {
      "/apps": () => `<h1>Welcome back</h1><p>Your application: MS/MBA Double Degree (in progress)</p><button>Start a new Application</button><a href="/apps">Home</a>`,
    });
    await page.goto("https://portal.test/apps");
    const st = fresh({ createClicks: ["Welcome back|Start a new Application"] });
    const r = await runEngine(
      fromPlaywright(page),
      deps({ navigate: async () => ({ action: "handoff", target_id: "", sheet_key: "", url: "", note: "This application is for the MS/MBA Double Degree, not the MSc Finance" }) as never }),
      st,
      20_000,
    );
    expect(r.outcome).toMatchObject({ kind: "needs_you", reason: "question" });
    expect(r.state.questions?.[0]).toMatchObject({ key: "start_new_application", options: ["Yes", "No"] });
    // the applicant said yes: the new application is started once
    let started = false;
    await page.route("https://portal.test/new", (route) => ((started = true), route.fulfill({ status: 200, contentType: "text/html", body: "<h1>New application</h1>" })));
    await page.setContent(`<h1>Welcome back</h1><p>Your application: MS/MBA Double Degree</p><a href="https://portal.test/new">Start a new Application</a>`);
    await runEngine(fromPlaywright(page), deps({ allowNewApp: async () => true }), { ...r.state, questions: [] }, 15_000);
    expect(started).toBe(true);
    await page.close();
  }, 60_000);
});
