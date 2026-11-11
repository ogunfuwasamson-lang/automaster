// render one Ivyward social video from a spec.
//   node marketing/video/render.mjs spec.json out.mp4 [--stills dir]
// the spec: { "scenes": [ { "kind": "hook" | "point" | "list" | "stat" | "card" | "cta", ...fields, "dur"?: seconds } ] }
//   hook  { title, sub? }                  big opening line, word by word
//   point { title, body?, note?, step? }   one idea (step only when the scenes really are a sequence: "Step 2 of 4")
//   list  { title, items: [] }             checklist that fills in line by line
//   stat  { value, prefix?, suffix?, title, body? }   a number that counts up (only real, sourced numbers)
//   card  { title, body?, step? }          tip card that slides in ("Tip 2 of 5")
//   cta   { title?, sub? }                 closing card with the mark and tryivyward.com
// output: 1080x1350 H.264, 30 fps, with a silent audio track (facebook plays feed video muted first).
// --stills writes a JPEG of the busiest moment of each scene, to look at before posting.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// playwright as installed on the machine (global, or the repo's own): require() finds both, a bare import only the repo's
const { chromium } = createRequire(import.meta.url)("playwright");
const [specPath, outPath, ...rest] = process.argv.slice(2);
if (!specPath || !outPath) {
  console.error("usage: node render.mjs spec.json out.mp4 [--stills dir]");
  process.exit(2);
}
const stillsDir = rest[0] === "--stills" ? rest[1] : null;
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const FPS = 30;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.addInitScript(([s, ink]) => { window.SPEC = s; window.INK = ink; }, [spec, readFileSync(join(here, "ink.svg"), "utf8")]);
await page.goto("file://" + join(here, "player.html"));
await page.evaluate(() => document.fonts.ready);
const total = await page.evaluate(() => window.TOTAL);
const scenes = await page.evaluate(() => window.SCENES.map((s) => ({ start: s.start, dur: s.dur })));

if (stillsDir) {
  mkdirSync(stillsDir, { recursive: true });
  for (const [i, s] of scenes.entries()) {
    await page.evaluate((t) => window.renderAt(t), s.start + s.dur * 0.8);
    writeFileSync(join(stillsDir, `scene-${i + 1}.jpg`), await page.screenshot({ type: "jpeg", quality: 85 }));
  }
}

const tmp = outPath.replace(/\.mp4$/, "") + ".part.mp4";
const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
  "-shortest", "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "64k",
  tmp,
], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((ok, bad) => ff.on("close", (code) => (code === 0 ? ok() : bad(new Error(`ffmpeg exited ${code}`)))));

const frames = Math.ceil(total * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.renderAt(t), i / FPS);
  const jpg = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
await done;
await browser.close();
renameSync(tmp, outPath);
console.log(JSON.stringify({ out: resolve(outPath), seconds: Number(total.toFixed(2)), frames }));
