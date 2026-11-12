// Make one Ivyward ad.
//   node marketing/video/ads/make-ad.mjs ad.json out.mp4 [--size 1920x1080] [--stills dir] [--only-stills]
// The spec: { page, voice, speed, lead, musicVolume, beats: [{ id, say, min?, pad? }], tail }
// 1. Kokoro speaks every beat's line; each beat lasts its line plus a pad (or its min).
// 2. The page (an HTML composition with renderAt(t)) is drawn frame by frame at the size asked, with the beats' times.
// 3. The page names its own sound cues (music drop, hits, whooshes, ticks); adaudio.py makes the music and effects,
//    lays the voice on the beats and masters it all to -14 LUFS.
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, renameSync, writeFileSync, rmSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)("playwright");
const args = process.argv.slice(2);
const [specPath, outPath] = args;
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const [W, H] = (opt("--size") ?? "1920x1080").split("x").map(Number);
const stillsDir = opt("--stills");
const onlyStills = args.includes("--only-stills");
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const FPS = 30;
const work = mkdtempSync(join(tmpdir(), "ivw-ad-"));
const py = (...a) => execFileSync("python3", [join(here, "adaudio.py"), ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 24 });

// voice lines decide the timing (cached per spec, so stills and sizes don't re-speak)
const cache = join(here, ".cache", specPath.split("/").pop().replace(/\.json$/, ""));
mkdirSync(cache, { recursive: true });
let durs;
const durFile = join(cache, "durs.json");
const sig = JSON.stringify([spec.voice, spec.speed, spec.beats.map((b) => b.say)]);
if (existsSync(durFile) && JSON.parse(readFileSync(durFile, "utf8")).sig === sig) durs = JSON.parse(readFileSync(durFile, "utf8")).durs;
else {
  durs = JSON.parse(py("voice", resolve(specPath), cache)).durs;
  writeFileSync(durFile, JSON.stringify({ sig, durs }));
}
const lead = spec.lead ?? 0.15;
let t = 0;
const beats = spec.beats.map((b, i) => {
  const dur = Math.max(b.min ?? 0, (durs[i] ? durs[i] + lead : 0) + (b.pad ?? 0.35));
  const out = { id: b.id, start: t, dur, voice: durs[i] ?? 0 };
  t += dur;
  return out;
});
const total = t + (spec.tail ?? 0);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.addInitScript(([b, tot]) => { window.BEATS = b; window.TOTAL = tot; }, [beats, total]);
await page.goto("file://" + join(here, spec.page));
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => window.setup?.());
const cues = await page.evaluate(() => window.cues());

if (stillsDir) {
  mkdirSync(stillsDir, { recursive: true });
  for (const b of beats) {
    for (const f of [0.35, 0.85]) {
      await page.evaluate((x) => window.renderAt(x), b.start + b.dur * f);
      writeFileSync(join(stillsDir, `${W}x${H}-${b.id}-${Math.round(f * 100)}.jpg`), await page.screenshot({ type: "jpeg", quality: 85 }));
    }
  }
  if (onlyStills) {
    await browser.close();
    console.log(JSON.stringify({ stills: stillsDir, beats, total }));
    process.exit(0);
  }
}

const silent = join(work, "silent.mp4");
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", silent], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((ok, bad) => ff.on("close", (c) => (c === 0 ? ok() : bad(new Error(`ffmpeg exited ${c}`)))));
const frames = Math.ceil(total * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate((x) => window.renderAt(x), i / FPS);
  const jpg = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
await done;
await browser.close();

// the sound, rendered by raea the way Ivyward's social videos are: voice, Tone.js score, effects, mastered to -14 LUFS
const snd = join(work, "snd");
mkdirSync(join(snd, "media"), { recursive: true });
const voices = [];
beats.forEach((b, i) => {
  if (!existsSync(join(cache, `vo_${i}.wav`))) return;
  writeFileSync(join(snd, "media", `vo_${i}.wav`), readFileSync(join(cache, `vo_${i}.wav`)));
  voices.push({ file: `vo_${i}.wav`, from: Math.round((b.start + lead) * FPS) });
});
writeFileSync(join(snd, "spec.gen.ts"), `export const SPEC = ${JSON.stringify({ fps: FPS, frames, voices, ...cues })} as any;\n`);
writeFileSync(join(snd, "sound.tsx"), readFileSync(join(here, "sound.tsx")));
const wav = join(work, "mix.wav");
execFileSync(process.env.RAEA_BIN || "raea", ["render", join(snd, "sound.tsx"), "-o", wav], { stdio: ["ignore", "inherit", "inherit"] });
const tmp = outPath.replace(/\.mp4$/, "") + ".part.mp4";
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", tmp]);
const sound = { voice: voices.length, sfx: (cues.sfx || []).length };
renameSync(tmp, outPath);
rmSync(work, { recursive: true, force: true });
console.log(JSON.stringify({ out: resolve(outPath), size: `${W}x${H}`, seconds: Number(total.toFixed(2)), frames, ...sound }));
