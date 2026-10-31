import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ptClick, ptKey, ptType } from "../extension/src/chrome-page";

// the chrome extension's screen-coordinate hands are synthetic events: check real pages react to them
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

const PAGE = `<!doctype html><body style="margin:0">
<div id="combo" role="combobox" tabindex="0" style="position:absolute;left:20px;top:20px;width:200px;height:30px;border:1px solid">Choose a term</div>
<ul id="list" hidden style="position:absolute;left:20px;top:52px;margin:0;padding:0;list-style:none">
  <li data-v="Fall 2027" style="height:30px">Fall 2027</li><li data-v="Spring 2028" style="height:30px">Spring 2028</li>
</ul>
<input id="q" style="position:absolute;left:20px;top:200px;width:200px;height:30px">
<p id="out"></p>
<script>
  combo.addEventListener('mousedown', () => { list.hidden = false; });
  list.addEventListener('click', (e) => { combo.textContent = e.target.dataset.v; list.hidden = true; });
  q.addEventListener('input', () => { out.textContent = 'typed:' + q.value; });
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') out.textContent += ' entered'; });
</script></body>`;

describe("extension screen actions", () => {
  it("opens a custom dropdown, picks an option, types and presses keys", async () => {
    const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
    await page.setContent(PAGE);
    await page.evaluate(ptClick, { x: 100, y: 35 });
    expect(await page.isVisible("#list")).toBe(true);
    await page.evaluate(ptClick, { x: 60, y: 67 });
    expect(await page.textContent("#combo")).toBe("Fall 2027");
    await page.evaluate(ptClick, { x: 100, y: 215 });
    await page.evaluate(ptType, "Lagos");
    await page.evaluate(ptKey, "Backspace");
    await page.evaluate(ptKey, "Enter");
    expect(await page.textContent("#out")).toBe("typed:Lago entered");
    await page.close();
  }, 20_000);
});
