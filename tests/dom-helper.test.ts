import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DOM_HELPER } from "@/lib/runner-dom";
import { looksLikePortal } from "@/lib/portal-url";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("playwright");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let browser: any;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

const PAGE = `<!doctype html><body>
<h1>Application</h1>
<sf-form></sf-form>
<div class="question"><label for="v">Have you ever held a VISA in the UK? *</label><textarea id="v" required></textarea><span class="error">Answer is required</span></div>
<div class="question"><label for="lang">First language</label><select id="lang"><option>Select</option><option>English / Anglais</option><option>Français</option></select></div>
<script>
  customElements.define('sf-form', class extends HTMLElement {
    connectedCallback() {
      const r = this.attachShadow({ mode: 'open' });
      r.innerHTML = '<label for="m">Mobile number</label><input id="m" required><button>Start a new Application</button>';
    }
  });
</script></body>`;

describe("reading portal pages", () => {
  it("sees fields and buttons inside web components, ignores error text as a label, and picks native dropdown options", async () => {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.setContent(PAGE);
    await page.evaluate(DOM_HELPER);
    const s = await page.evaluate(() => (window as unknown as { __am: { snapshot(): { fields: { label: string; id: string }[]; buttons: { label: string }[] } } }).__am.snapshot());
    expect(s.fields.map((f) => f.label)).toContain("Mobile number");
    expect(s.buttons.map((b) => b.label)).toContain("Start a new Application");
    const visa = s.fields.find((f) => /visa/i.test(f.label));
    expect(visa?.label).not.toMatch(/answer is required/i);
    // the playwright selector the engine uses reaches into the component
    const mobile = s.fields.find((f) => f.label === "Mobile number")!;
    await page.fill(`[data-am-id="${mobile.id}"]`, "8031234567");
    expect(await page.evaluate(() => (document.querySelector("sf-form")!.shadowRoot!.querySelector("#m") as HTMLInputElement).value)).toBe("8031234567");
    // native dropdown chosen by value, at the point a screenshot showed it
    const box = await page.locator("#lang").boundingBox();
    const r = await page.evaluate((p: { x: number; y: number }) => (window as unknown as { __am: { selectAt(x: number, y: number, v: string): unknown } }).__am.selectAt(p.x, p.y, "English"), { x: box.x + 5, y: box.y + 5 });
    expect(r).toEqual({ chose: "English / Anglais" });
    await page.close();
  }, 20_000);
  it("never takes an enquiry form for the application portal", () => {
    expect(looksLikePortal("https://simon.rochester.edu/request-information")).toBe(false);
    expect(looksLikePortal("https://rooms.le.ac.uk/student_portal/Account/Login")).toBe(false);
    expect(looksLikePortal("https://apply.simon.rochester.edu/apply/")).toBe(true);
  });
});
