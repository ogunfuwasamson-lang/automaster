// the portal engine against small fake portals in a real chromium: the failure cases applicants hit
// (a bilingual term dropdown, "Create account" as a tab, a rejected password, an "Apply online" link on a
// brochure page). skipped when no local browser is available.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import type { Browser, Page } from "playwright-core";
import { runEngine, type EngineDeps, type EngineState, type Login } from "@/lib/cloud-engine";
import { fromPlaywright } from "@/lib/engine-page";
import { DOM_HELPER } from "@/lib/runner-dom";
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
  fields: { first_name: "Ada", last_name: "Okafor", email: "ada@example.com", date_of_birth: "1990-05-14", entry_term: "fall-2027", entry_season: "Fall", entry_year: "2027", application_type: "Graduate", country: "Nigeria", level: "Master's" },
  essays: [],
  files: [],
  missing: [],
};

function deps(over: Partial<EngineDeps> = {}): EngineDeps & { logins: Login[]; notes: string[] } {
  const logins: Login[] = [];
  const notes: string[] = [];
  return {
    logins,
    notes,
    map: async (fields: PageField[]) => {
      const { fills, unresolved } = mapByRules(fields, sheet);
      return [...fills, ...unresolved.map((f) => ({ id: f.id, action: "skip", reason: "not in your profile" }) as Fill)];
    },
    file: async () => ({ name: "x.pdf", mime: "application/pdf", buffer: new Uint8Array() }),
    canSubmit: async () => ({ allowed: true, reason: "ok" }),
    existingLogin: async () => logins.at(-1) ?? null,
    createLogin: async (email) => {
      const l = { login_email: email, password: "Pw-first-1A" };
      logins.push(l);
      return l;
    },
    accountEmail: "ada@example.com",
    verification: async () => null,
    canReadMail: true,
    progress: async (n) => {
      notes.push(n);
    },
    ...over,
  };
}

// a tiny portal: routes answer by path; forms post back as GET so the fake server sees the values
type Routes = Record<string, (q: URLSearchParams) => string>;
async function portal(page: Page, routes: Routes) {
  await page.route("https://portal.test/**", (route) => {
    const u = new URL(route.request().url());
    const h = routes[u.pathname] as ((q: URLSearchParams) => string) | undefined;
    return route.fulfill({ status: h ? 200 : 404, contentType: "text/html", body: `<!doctype html><html><head><title>Portal</title></head><body>${h ? h(u.searchParams) : "not found"}</body></html>` });
  });
}

d("portal engine end to end", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
  });
  const fresh = (): EngineState => ({ steps: 0 });

  it("picks Fall 2027 from a bilingual 'Application type' list and moves on", async () => {
    const page = await browser.newPage();
    let got = "";
    await portal(page, {
      "/form": () => `<form action="/done"><h1>Program</h1><label for="t">Application type *</label>
        <select id="t" name="t" required><option value="">Select</option><option value="F27">Fall / Automne 2027</option><option value="W28">Winter / Hiver 2028</option></select>
        <label for="fn">First name *</label><input id="fn" name="fn" required>
        <button type="submit">Save and continue</button></form>`,
      "/done": (q) => ((got = `${q.get("t")}|${q.get("fn")}`), `<h1>Review</h1><p>Thank you for submitting your application.</p>`),
    });
    await page.goto("https://portal.test/form");
    const st = fresh();
    st.submitClicked = true;
    const r = await runEngine(fromPlaywright(page), deps(), st, 30_000);
    expect(got).toBe("F27|Ada");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);

  it("finds 'Create account' when it's a tab on the sign-in page", async () => {
    const page = await browser.newPage();
    let created = "";
    await portal(page, {
      "/login": () => `<div role="tablist"><div role="tab" tabindex="0" onclick="location.href='/register'">Create account</div><div role="tab" tabindex="0">Sign in</div></div>
        <form><label for="e">Email</label><input id="e" type="email"><label for="p">Password</label><input id="p" type="password"><button type="button">Sign in</button></form>`,
      "/register": () => `<form action="/made"><label for="fn">First name</label><input id="fn" name="fn"><label for="e">Email</label><input id="e" name="e" type="email">
        <label for="p1">Password</label><input id="p1" name="p1" type="password"><label for="p2">Confirm password</label><input id="p2" name="p2" type="password"><button type="submit">Create account</button></form>`,
      "/made": (q) => ((created = `${q.get("e")}|${q.get("p1") === q.get("p2")}`), `<h1>Check your email</h1><p>We've sent you an email. Check your inbox to verify your account.</p>`),
    });
    await page.goto("https://portal.test/login");
    const dp = deps({ canReadMail: false });
    const r = await runEngine(fromPlaywright(page), dp, fresh(), 30_000);
    expect(created).toBe("ada@example.com|true");
    expect(dp.logins).toHaveLength(1);
    expect(r.outcome.kind).toBe("needs_you"); // waits on the verification email (no gmail in this test)
    await page.close();
  }, 60_000);

  it("resets a rejected password through 'Forgot password' and signs in with the new one", async () => {
    const page = await browser.newPage();
    let current = "Portal-only-9Z"; // what the portal has; our vault has something else
    await portal(page, {
      "/login": (q) =>
        q.get("p") && q.get("p") !== current
          ? `<p class="error">Invalid email or password.</p><form action="/login"><label for="e">Email</label><input id="e" name="e" type="email"><label for="p">Password</label><input id="p" name="p" type="password"><button>Sign in</button></form><a href="/forgot">Forgot your password?</a>`
          : q.get("p") === current
            ? `<h1>Your applications</h1><p>Thank you for submitting your application.</p>`
            : `<form action="/login"><label for="e">Email</label><input id="e" name="e" type="email"><label for="p">Password</label><input id="p" name="p" type="password"><button>Sign in</button></form><a href="/forgot">Forgot your password?</a>`,
      "/forgot": () => `<form action="/sent"><label for="e">Email address</label><input id="e" name="e" type="email"><button>Send reset link</button></form>`,
      "/sent": () => `<p>If an account exists, we've sent a reset link.</p>`,
      "/reset": () => `<form action="/set"><label for="a">New password</label><input id="a" name="a" type="password"><label for="b">Confirm new password</label><input id="b" name="b" type="password"><button>Save password</button></form>`,
      "/set": (q) => ((current = q.get("a") ?? current), `<p>Password changed.</p><a href="/login">Sign in</a>`),
    });
    await page.goto("https://portal.test/login");
    const dp = deps({
      resetLink: async () => "https://portal.test/reset?token=abc",
      rotatePassword: async () => {
        const l = { login_email: "ada@example.com", password: "Rotated-2B!" };
        dp.logins.push(l);
        return l;
      },
    });
    dp.logins.push({ login_email: "ada@example.com", password: "Stale-1A!" });
    const st = fresh();
    st.signedIn = true; // it worked before; the portal changed it since
    st.submitClicked = true;
    let r = await runEngine(fromPlaywright(page), dp, st, 30_000);
    // the first run may stop to wait for the email; the next run picks it up
    for (let i = 0; i < 3 && r.outcome.kind === "wait"; i++) r = await runEngine(fromPlaywright(page), dp, r.state, 30_000);
    expect(current).toBe("Rotated-2B!");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 90_000);

  it("follows 'Apply online' from a program page to the application", async () => {
    const page = await browser.newPage();
    await portal(page, {
      "/course": () => `<nav><a href="/news">News</a><a href="/fees">Fees and funding</a></nav><h1>MSc Finance</h1><p>Entry requirements...</p><a href="https://portal.test/apply/start">Apply online &raquo;</a><a href="/events">Open days</a>`,
      "/apply/start": () => `<h1>Start your application</h1><form><label for="e">Email</label><input id="e" type="email"><label for="p">Password</label><input id="p" type="password"><button type="button">Log in</button></form>`,
    });
    await page.goto("https://portal.test/course");
    const dp = deps();
    dp.logins.push({ login_email: "ada@example.com", password: "x" });
    await runEngine(fromPlaywright(page), dp, fresh(), 8_000);
    expect(page.url()).toContain("/apply/start");
    await page.close();
  }, 60_000);

  it("asks the decide pass before asking the applicant", async () => {
    const page = await browser.newPage();
    let got = "";
    await portal(page, {
      "/q": () => `<form action="/next"><h1>About you</h1><label for="h">How did you hear about us? *</label><select id="h" name="h" required><option value="">Select</option><option>Friend</option><option>Internet search</option></select><button>Next</button></form>`,
      "/next": (q) => ((got = q.get("h") ?? ""), `<h1>Done</h1><p>Thank you for submitting your application.</p>`),
    });
    await page.goto("https://portal.test/q");
    const st = fresh();
    st.submitClicked = true;
    const r = await runEngine(fromPlaywright(page), deps({ decide: async (fields) => fields.map((f) => ({ id: f.id, action: "choose", option: "Internet search", source: "decide:none" }) as Fill) }), st, 30_000);
    expect(got).toBe("Internet search");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);
});

d("follow-up forms", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
  });
  it("registers for a webinar and recognises the confirmation", async () => {
    const page = await browser.newPage();
    let got = "";
    await portal(page, {
      "/webinar": () => `<h1>Graduate admissions webinar</h1><p>Nov 5, 12pm ET</p><form action="/thanks"><label for="a">First name *</label><input id="a" name="a" required><label for="b">Last name *</label><input id="b" name="b" required><label for="c">Email *</label><input id="c" name="c" type="email" required><button>Register</button></form>`,
      "/thanks": (q) => ((got = `${q.get("a")} ${q.get("b")} ${q.get("c")}`), `<h1>You're registered!</h1><p>A confirmation email is on its way.</p>`),
    });
    await page.goto("https://portal.test/webinar");
    const r = await runEngine(fromPlaywright(page), deps({ goal: "register for this event", finalButton: /^(register|rsvp|submit)\b/i, isDone: (s) => /you're registered/i.test(s.body) }), { steps: 0 }, 30_000);
    expect(got).toBe("Ada Okafor ada@example.com");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);
});

d("screenshot steps", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
  });
  it("works a custom dropdown the page structure can't explain, by numbered marks", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await portal(page, {
      "/term": () => `<h1>Your intake</h1>
        <div role="combobox" id="cb" style="border:1px solid #999;padding:8px;width:240px">Choose term</div>
        <div id="list" role="listbox" style="display:none"><div role="option" data-v="W28">Winter / Hiver 2028</div><div role="option" data-v="F27">Fall / Automne 2027</div></div>
        <div id="next" style="display:none"><a href="#" id="go">Continue</a></div>
        <script>
          cb.onclick = () => { list.style.display = "block"; };
          for (const o of list.children) o.onclick = () => { cb.textContent = o.textContent; list.style.display = "none"; next.style.display = "block"; go.href = "/done?t=" + o.dataset.v; };
        </script>`,
      "/done": () => `<h1>Saved</h1>`,
    });
    await page.goto("https://portal.test/term");
    const seen: number[] = [];
    const r = await runEngine(
      fromPlaywright(page),
      deps({
        see: async (v) => {
          seen.push(v.marks.length);
          const opt = v.marks.find((m) => /fall/i.test(m.label) && m.type === "option");
          if (opt) return { action: "click", mark: opt.n, x: 0, y: 0, sheet_key: "", text: "", key: "", file: "", direction: "", note: "pick fall 2027" };
          const cont = v.marks.find((m) => /continue/i.test(m.label));
          if (cont) return { action: "done", mark: 0, x: 0, y: 0, sheet_key: "", text: "", key: "", file: "", direction: "", note: "" };
          const box = v.marks.find((m) => m.type === "combobox");
          return { action: "click", mark: box?.n ?? 0, x: 0, y: 0, sheet_key: "", text: "", key: "", file: "", direction: "", note: "open the list" };
        },
      }),
      { steps: 0 },
      20_000,
    );
    expect(seen.length).toBeGreaterThan(1);
    expect(page.url()).toContain("/done?t=F27");
    void r;
    await page.close();
  }, 60_000);
});

d("screenshot uploads", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
  });
  it("uploads a document through a styled button that opens the file picker", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await portal(page, {
      "/docs": () => `<h1>Documents</h1><input type="file" id="f" style="display:none"><button type="button" id="b" onclick="f.click()">Upload your CV</button><p id="out"></p>
        <script>f.onchange = () => { out.textContent = "Uploaded: " + f.files[0].name; }</script>`,
    });
    await page.goto("https://portal.test/docs");
    let done = false;
    await runEngine(
      fromPlaywright(page),
      deps({
        files: () => ["cv"],
        file: async () => ({ name: "Ada-CV.pdf", mime: "application/pdf", buffer: new Uint8Array([37, 80, 68, 70]) }),
        see: async (v) => {
          if (done || (await page.textContent("#out"))) return { action: "done", mark: 0, x: 0, y: 0, sheet_key: "", text: "", key: "", file: "", direction: "", note: "" };
          done = true;
          const b = v.marks.find((m) => /upload/i.test(m.label));
          return { action: "upload", mark: b?.n ?? 0, x: 0, y: 0, sheet_key: "", text: "", key: "", file: "cv", direction: "", note: "" };
        },
      }),
      { steps: 0 },
      30_000,
    );
    await page.waitForFunction(() => !!document.querySelector("#out")?.textContent, undefined, { timeout: 5000 }).catch(() => null);
    expect(await page.textContent("#out")).toBe("Uploaded: Ada-CV.pdf");
    await page.close();
  }, 60_000);
});

d("portal engine: failures seen in production", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
  });

  it("stays on a form page that mentions an emailed link instead of leaving it (stirling)", async () => {
    const page = await browser.newPage();
    let got = "";
    let followed = 0;
    await portal(page, {
      "/app": () => `<p>If you have already started an application you should have received an email containing a link to allow you to complete the form.</p>
        <form action="/done"><label for="fn">First name *</label><input id="fn" name="fn" required>
        <label for="ln">Last name *</label><input id="ln" name="ln" required>
        <label for="c">Country *</label><input id="c" name="c" required>
        <button type="submit">Save and continue</button></form>`,
      "/done": (q) => ((got = `${q.get("fn")}|${q.get("ln")}|${q.get("c")}`), `<h1>Review</h1><p>Thank you for submitting your application.</p>`),
      "/elsewhere": () => `<h1>Resume</h1>`,
    });
    await page.goto("https://portal.test/app");
    const st: EngineState = { steps: 0, submitClicked: true };
    const r = await runEngine(fromPlaywright(page), deps({ resumeLink: async () => ((followed += 1), "https://portal.test/elsewhere") }), st, 30_000);
    expect(followed).toBe(0);
    expect(got).toBe("Ada|Okafor|Nigeria");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);

  it("finds a form nested below hundreds of shadow roots (salesforce experience sites)", async () => {
    const page = await browser.newPage();
    let got = "";
    await portal(page, {
      "/sf": () => `<div id="host"></div><script>
        // 600 components, each in its own shadow root, before the one that holds the form
        let parent = document.getElementById("host");
        for (let i = 0; i < 600; i++) { const el = document.createElement("div"); parent.appendChild(el); const sr = el.attachShadow({ mode: "open" }); const inner = document.createElement("span"); inner.textContent = ""; sr.appendChild(inner); if (i % 50 === 49) { parent = inner; } }
        const last = document.createElement("div"); parent.appendChild(last);
        const sr = last.attachShadow({ mode: "open" });
        sr.innerHTML = '<form action="/sfdone"><label for="fn">First name *</label><input id="fn" name="fn" required><button type="submit">Save and continue</button></form>';
        sr.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); location.href = "/sfdone?fn=" + encodeURIComponent(sr.getElementById("fn").value); });
      </script>`,
      "/sfdone": (q) => ((got = q.get("fn") ?? ""), `<h1>Review</h1><p>Thank you for submitting your application.</p>`),
    });
    await page.goto("https://portal.test/sf");
    const st: EngineState = { steps: 0, submitClicked: true };
    const r = await runEngine(fromPlaywright(page), deps(), st, 30_000);
    expect(got).toBe("Ada");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);

  // lightning web components fake shadow dom: the page's own querySelectorAll is rewritten to hide what's inside
  // a component, though the elements are ordinary children (ut dallas's salesforce portal)
  const FAKE_SHADOW = `<script>
    const inside = (el) => { for (let p = el.parentElement; p; p = p.parentElement) if (p.hasAttribute("data-lwc")) return true; return false; };
    for (const proto of [Document.prototype, Element.prototype, DocumentFragment.prototype]) {
      const qsa = proto.querySelectorAll, qs = proto.querySelector;
      proto.querySelectorAll = function (s) { const r = [...qsa.call(this, s)].filter((e) => this instanceof Element && this.hasAttribute("data-lwc") ? true : !inside(e)); return r; };
      proto.querySelector = function (s) { return this.querySelectorAll(s)[0] || null; };
    }
  </script>`;

  it("sees fields and step buttons inside salesforce lightning components (ut dallas)", async () => {
    const page = await browser.newPage();
    let got = "";
    await portal(page, {
      "/gradapp": () => `${FAKE_SHADOW}<header><button>Home</button><button>Applications</button></header>
        <c-steps data-lwc><nav><a href="/profile">Profile You've not yet viewed this step.</a><a href="/edu">Education Information You've not yet viewed this step.</a></nav></c-steps>`,
      "/profile": () => `${FAKE_SHADOW}<header><button>Home</button></header>
        <c-form data-lwc><form action="/done"><label for="fn">First name *</label><input id="fn" name="fn" required>
        <fieldset><legend>Do you have a preferred first name?</legend><label><input type="radio" name="pf" value="y">Yes</label><label><input type="radio" name="pf" value="n">No</label></fieldset>
        <button type="submit">Save and continue</button></form></c-form>`,
      "/done": (q) => ((got = q.get("fn") ?? ""), `<h1>Review</h1><p>Thank you for submitting your application.</p>`),
    });
    await page.goto("https://portal.test/gradapp");
    await page.evaluate(DOM_HELPER);
    const labels = await page.evaluate(() => (window as unknown as { __am: { snapshot(): { buttons: { label: string }[] } } }).__am.snapshot().buttons.map((b) => b.label));
    expect(labels.some((l) => l.startsWith("Profile"))).toBe(true);
    await page.goto("https://portal.test/profile");
    await page.evaluate(DOM_HELPER);
    const fields = await page.evaluate(() => (window as unknown as { __am: { snapshot(): { fields: { label: string; type: string; options?: string[] }[] } } }).__am.snapshot().fields);
    expect(fields.map((f) => f.type)).toEqual(["text", "radio"]);
    expect(fields[1].options).toEqual(["Yes", "No"]);
    const st: EngineState = { steps: 0, submitClicked: true };
    const r = await runEngine(fromPlaywright(page), deps(), st, 30_000);
    expect(got).toBe("Ada");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);

  it("reads the sign-up page's message box and retries a taken username with a number (calgary eID)", async () => {
    const page = await browser.newPage();
    const tried: string[] = [];
    await page.exposeFunction("tryName", (n: string) => (tried.push(n), /\d/.test(n)));
    await portal(page, {
      "/register": () => `<h1>eID Account Registration</h1><div id="container_message"></div>
        <form id="f"><label for="u">Username</label><input id="u" name="username" value="ada.okafor" required>
        <label for="e">Email address</label><input id="e" name="emailaddress" type="email">
        <label for="p1">Password</label><input id="p1" name="newPassword" type="password" required>
        <label for="p2">Confirm Password</label><input id="p2" name="confirmPassword" type="password" required>
        <input type="submit" value="Create eID"></form>
        <script>document.getElementById("f").addEventListener("submit", async (e) => { e.preventDefault();
          if (await window.tryName(document.getElementById("u").value)) { location.href = "/welcome"; return; }
          document.getElementById("container_message").innerHTML = '<div class="message-container fade in error"><div class="message pull-left"><div>This eID is already taken. Please choose another.</div></div></div>';
          document.getElementById("p1").value = ""; document.getElementById("p2").value = ""; });</script>`,
      "/welcome": () => `<h1>Your eID was created</h1><p>Thank you for submitting your application.</p>`,
    });
    await page.goto("https://portal.test/register");
    const st: EngineState = { steps: 0, submitClicked: true };
    await runEngine(fromPlaywright(page), deps(), st, 40_000);
    expect(tried.length).toBeGreaterThanOrEqual(2);
    expect(tried[0]).not.toMatch(/\d/);
    expect(tried.at(-1)).toMatch(/2/);
    expect(page.url()).toContain("/welcome");
    await page.close();
  }, 60_000);

  it("names buttons that have no text from their picture or id (manchester peoplesoft)", async () => {
    const page = await browser.newPage();
    await page.setContent(`<form><label for="fn">First name</label><input id="fn"><button type="button" id="CIBAA_REG_WRK_SUBMIT_PB"></button><button type="button"><img alt="Next page" src="data:,"></button><button type="button" id="x1"></button></form>`);
    await page.evaluate(DOM_HELPER);
    const labels = await page.evaluate(() => (window as unknown as { __am: { snapshot(): { buttons: { label: string }[] } } }).__am.snapshot().buttons.map((b) => b.label));
    expect(labels).toContain("submit");
    expect(labels).toContain("Next page");
    expect(labels).toHaveLength(2);
    await page.close();
  }, 30_000);

  it("presses the button the page names when it won't move on (stirling 'Save Education')", async () => {
    const page = await browser.newPage();
    let saved = false;
    let done = false;
    await portal(page, {
      "/edu": (q) => {
        if (q.get("save") === "1") saved = true;
        if (q.get("go") === "1" && saved) return ((done = true), `<h1>Review</h1><p>Thank you for submitting your application.</p>`);
        return `<h1>My education</h1><p>Remember to "Save Education" below once you have completed this section.</p>
          <form action="/edu"><input type="hidden" name="go" value="1"><label for="fn">First name *</label><input id="fn" name="fn" required value="Ada"><button type="submit">Save and continue</button></form>
          <form action="/edu"><input type="hidden" name="save" value="1"><button type="submit">Save Education</button></form>`;
      },
    });
    await page.goto("https://portal.test/edu");
    const st: EngineState = { steps: 0, submitClicked: true };
    const r = await runEngine(fromPlaywright(page), deps(), st, 30_000);
    expect(saved).toBe(true);
    expect(done).toBe(true);
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);

  it("answers sign-up security questions with the login's made-up answers (manchester)", async () => {
    const page = await browser.newPage();
    let got = "";
    await portal(page, {
      "/register": () => `<h1>Create your account</h1><p>Register as a new user. Already have an account? Sign in.</p><form action="/made">
        <label for="e">Email *</label><input id="e" name="e" type="email" required>
        <label for="p1">Password *</label><input id="p1" name="p1" type="password" required>
        <label for="p2">Confirm password *</label><input id="p2" name="p2" type="password" required>
        <label for="q2">*Question 2</label><select id="q2" name="q2"><option value=""></option><option>Your Pet's name</option><option>Your favourite city</option></select>
        <label for="a2">*Answer 2</label><input id="a2" name="a2" required>
        <label for="q3">*Question 3</label><select id="q3" name="q3"><option value=""></option><option>Your Pet's name</option><option>Your favourite city</option></select>
        <label for="a3">*Answer 3</label><input id="a3" name="a3" required>
        <button type="submit">Create account</button></form>`,
      "/made": (q) => ((got = [q.get("q2"), q.get("a2"), q.get("q3"), q.get("a3")].join("|")), `<h1>Account created</h1><p>Thank you for submitting your application.</p>`),
    });
    await page.goto("https://portal.test/register");
    const d0 = deps();
    const r = await runEngine(fromPlaywright(page), deps({ createLogin: async (email) => { const l = { login_email: email, password: "Pw-first-1A", answers: ["alpha1", "bravo2", "charl3"] }; d0.logins.push(l); return l; }, existingLogin: async () => d0.logins.at(-1) ?? null }), { steps: 0, submitClicked: true }, 30_000);
    expect(got).toBe("Your favourite city|bravo2|Your Pet's name|charl3");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);

  it("uploads each document through a choose-type, pick-file, Go area (stirling)", async () => {
    const page = await browser.newPage();
    const got: string[] = [];
    await page.route("https://portal.test/up", (route) => {
      const body = route.request().postData() ?? "";
      const t = (body.match(/name="dtype"\r\n\r\n([^\r]*)/) ?? [])[1];
      if (t) got.push(t);
      return route.fulfill({ status: 200, contentType: "text/html", body: docs() });
    });
    const docs = () => `<!doctype html><html><head><title>Portal</title></head><body><h1>6. My documents</h1><p>Uploaded: ${got.join(", ") || "none"}</p>
      <form action="/up" method="post" enctype="multipart/form-data"><label for="dt">Document type *</label><select id="dt" name="dtype" required><option value="">Select</option><option>CV</option><option>Transcript</option><option>Degree certificate</option><option>Passport</option></select>
      <label for="f">Upload document</label><input id="f" name="f" type="file"><button type="submit">Go</button></form></body></html>`;
    await page.route("https://portal.test/docs", (route) => route.fulfill({ status: 200, contentType: "text/html", body: docs() }));
    await page.goto("https://portal.test/docs");
    await runEngine(fromPlaywright(page), deps({ files: () => ["cv", "transcript", "degree_cert"] }), { steps: 0 }, 20_000);
    expect(got).toEqual(["CV", "Transcript", "Degree certificate"]);
    await page.close();
  }, 60_000);

  it("types the date again in the page's format after the page complains (manchester)", async () => {
    const page = await browser.newPage();
    let got = "";
    await portal(page, {
      "/dob": (q) => {
        const v = q.get("dob");
        if (v === "05/14/1990") return ((got = v), `<h1>Review</h1><p>Thank you for submitting your application.</p>`);
        const msg = v ? `<p>Message The system does not understand the date you entered. Example date: 12/31/2000</p>` : "";
        return `<h1>Your details</h1>${msg}<form action="/dob"><label for="d">Date of Birth *</label><input id="d" name="dob" required value="${v ?? ""}"><button type="submit">Save and continue</button></form>`;
      },
    });
    await page.goto("https://portal.test/dob");
    const r = await runEngine(fromPlaywright(page), deps(), { steps: 0, submitClicked: true }, 30_000);
    expect(got).toBe("05/14/1990");
    expect(r.outcome.kind).toBe("submitted");
    await page.close();
  }, 60_000);

  it("never presses 'Start a new application' twice (ut dallas)", async () => {
    const page = await browser.newPage();
    let started = 0;
    await portal(page, {
      "/home": () => `<h1>Applicant portal</h1><a href="/new">Start a new Application</a><a href="/home">Applications</a>`,
      "/new": () => ((started += 1), `<h1>Applicant portal</h1><p>Your application was created.</p><a href="/new">Start a new Application</a><a href="/home">Applications</a>`),
    });
    await page.goto("https://portal.test/home");
    // a navigator that always wants to start a new application
    const nav = async (input: { snapshot: { buttons: { id: string; label: string }[] } }) => {
      const b = input.snapshot.buttons.find((x) => /start a new application/i.test(x.label));
      return b ? { action: "click" as const, target_id: b.id, note: "start" } : { action: "handoff" as const, note: "no" };
    };
    await runEngine(fromPlaywright(page), deps({ navigate: nav as unknown as EngineDeps["navigate"] }), { steps: 0 }, 20_000);
    expect(started).toBeLessThanOrEqual(1);
    await page.close();
  }, 60_000);
});

describe("dropdown answers from related keys", () => {
  it("answers 'Application type' with the term when its options are terms", () => {
    const f: PageField = { id: "t", label: "Application type", type: "select", options: ["Select", "Fall / Automne 2027", "Winter / Hiver 2028"] };
    expect(resolve(f, "application_type", sheet)).toMatchObject({ action: "choose", option: "Fall / Automne 2027" });
  });
});
