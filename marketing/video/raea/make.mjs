// Make one Ivyward social video with raea.
//   node marketing/video/raea/make.mjs spec.json out.mp4 [--stills dir]
// The spec is the same scene list render.mjs takes (see its header): hook | point | list | stat | card | cta, each with
// a "say" line for the voiceover. Steps: speak every line (audio.py, Kokoro), size each scene to its line, write
// spec.gen.ts beside a copy of edit.tsx with the media, render with raea (music from Tone.js, mastered to -14 LUFS),
// then re-encode the sound as AAC so Facebook and Instagram take the file. --stills writes one PNG per scene.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [specPath, outPath, ...rest] = process.argv.slice(2);
if (!specPath || !outPath) {
  console.error("usage: node make.mjs spec.json out.mp4 [--stills dir]");
  process.exit(2);
}
const stillsDir = rest[0] === "--stills" ? resolve(rest[1]) : null;
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const FPS = 30;
const raea = process.env.RAEA_BIN || "raea";

const work = mkdtempSync(join(tmpdir(), "ivw-raea-"));
cpSync(join(here, "media"), join(work, "media"), { recursive: true });
mkdirSync(join(work, "media", "voice"), { recursive: true });

// 1. the voice: one wav per scene with a "say" line
const { durs } = JSON.parse(execFileSync("python3", [join(here, "..", "audio.py"), "voice", resolve(specPath), join(work, "media", "voice")], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }));

// 2. timing: each scene stays up long enough to read it twice, and at least its line plus a beat
const words = (s) => String(s ?? "").split(/\s+/).filter(Boolean).length;
const autoDur = (s) => {
  const text = [s.title, s.sub, s.body, s.note, ...(s.items ?? [])].join(" ");
  return Math.max(s.kind === "cta" ? 4 : 3.2, 1.8 + words(text) / 2.9);
};
let from = 0;
const scenes = spec.scenes.map((s, i) => {
  const secs = Math.max(s.dur ?? autoDur(s), durs[i] ? durs[i] + 1.0 : 0);
  const frames = Math.round(secs * FPS);
  const out = { ...s, from, frames, voice: durs[i] ? `voice/vo_${i}.wav` : null };
  delete out.say; delete out.dur;
  from += frames;
  return out;
});
const total = from;
const endCard = scenes[scenes.length - 1].from;

// 3. the music's key and chords, from the file name, so each video sounds a little different
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const note = (midi) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
const PROGS = [
  [[0, [0, 4, 7, 11]], [9, [0, 3, 7, 10]], [5, [0, 4, 7, 11]], [7, [0, 4, 7, 9]]],
  [[0, [0, 4, 7, 14]], [7, [0, 4, 7, 11]], [9, [0, 3, 7, 10]], [5, [0, 4, 7, 14]]],
  [[5, [0, 4, 7, 11]], [7, [0, 4, 7, 9]], [4, [0, 3, 7, 10]], [9, [0, 3, 7, 10]]],
];
let seed = 0;
for (const ch of basename(outPath)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
const key = [0, 2, 3, 5, 7, 9][seed % 6];
const prog = PROGS[(seed >>> 3) % PROGS.length];
const root = 48 + key; // C3 + key
const chords = prog.map(([r, tones]) => tones.map((t) => note(root + r + t)));
const bass = prog.map(([r]) => note(root - 12 + r));
const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
const arp = [];
prog.forEach(([r, tones], c) => {
  for (let k = 0; k < 16; k++) {
    const skip = ((seed >>> (k % 16)) & 7) === 0 && k % 4 === 3; // a little air, the same every render
    arp.push(skip ? null : note(root + 12 + r + tones[pattern[k % 8] % tones.length]));
  }
});
const music = { bpm: 80 + (seed % 3) * 4, chords, bass, arp };

writeFileSync(join(work, "spec.gen.ts"), `export const SPEC = ${JSON.stringify({ frames: total, endCard, scenes, music }, null, 1)} as any;\n`);
cpSync(join(here, "edit.tsx"), join(work, "edit.tsx"));

// 4. render, then AAC sound for the social networks
const raw = join(work, "out.mp4");
execFileSync(raea, ["render", join(work, "edit.tsx"), "-o", raw, "--quality", "high"], { stdio: ["ignore", "inherit", "inherit"] });
const tmp = outPath.replace(/\.mp4$/, "") + ".part.mp4";
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", tmp]);
renameSync(tmp, outPath);

if (stillsDir) {
  mkdirSync(stillsDir, { recursive: true });
  const at = scenes.map((s) => Math.min(total - 1, s.from + Math.round(s.frames * 0.8))).join(",");
  execFileSync(raea, ["render", join(work, "edit.tsx"), "--at", at, "-o", stillsDir], { stdio: ["ignore", "inherit", "inherit"] });
}
rmSync(work, { recursive: true, force: true });
console.log(JSON.stringify({ out: resolve(outPath), seconds: Number((total / FPS).toFixed(2)), frames: total, scenes: scenes.length }));
