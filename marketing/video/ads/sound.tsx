// The sound of an Ivyward ad, rendered by raea: the voiceover (Kokoro, af_heart: the voice of Ivyward's social videos),
// an original Tone.js score in the same palette as those videos (soft pad, plucked arpeggio, round bass) with a light
// beat that starts when the ad turns from the problem to Ivyward, small musical sound effects on the cues the picture
// names, and raea's master at -14 LUFS. make-ad.mjs writes spec.gen.ts beside this file.
import { AbsoluteFill, Audio, Composition, Mix, Sequence, registerRoot, staticFile } from "raea";
import * as Tone from "raea/tone";
import { SPEC } from "./spec.gen";

const M = SPEC.music;
const FPS = SPEC.fps;
const end = SPEC.frames / FPS;
const beat = 60 / M.bpm;
const bar = beat * 4;

// ---------------------------------------------------------------- the score
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const n = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const root = 50 + NAMES.indexOf(M.key) - 2; // D3 when the key is D
// I - V - vi - IV, voiced warm (add9 / maj7 colours)
const PROG: [number, number[]][] = [[0, [0, 4, 7, 14]], [7, [0, 4, 7, 11]], [9, [0, 3, 7, 10]], [5, [0, 4, 7, 14]]];

Tone.getTransport().bpm.value = M.bpm;
Tone.buses.music.duck(Tone.buses.voice, { amount: -11 });
Tone.buses.music.volume.value = -19;
Tone.buses.music.volume.rampTo(-12, 0.8, M.endCard);
Tone.buses.sfx.volume.value = -8;

const verb = new Tone.Freeverb({ roomSize: 0.72, dampening: 3200, wet: 0.28 }).connect(Tone.buses.music);
const pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine" }, envelope: { attack: 0.9, decay: 0.4, sustain: 0.8, release: 1.8 }, volume: -12 }).connect(verb);
const pluck = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.004, decay: 0.35, sustain: 0, release: 0.5 }, volume: -15 }).connect(verb);
const bass = new Tone.MonoSynth({ oscillator: { type: "sine" }, envelope: { attack: 0.02, decay: 0.5, sustain: 0.6, release: 0.8 }, volume: -11 }).connect(Tone.buses.music);
const kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 6, envelope: { attack: 0.001, decay: 0.32, sustain: 0 }, volume: -10 }).connect(Tone.buses.music);
const snapFilter = new Tone.Filter(2200, "bandpass").connect(verb);
const snap = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -22 }).connect(snapFilter);
const hatFilter = new Tone.Filter(8000, "highpass").connect(Tone.buses.music);
const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.04, sustain: 0 }, volume: -30 }).connect(hatFilter);

const chords: [number, string[]][] = [];
const bassNotes: [number, string][] = [];
const arp: [number, string][] = [];
const drums: [number, string][] = [];
const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
for (let t = 0, i = 0; t < end + bar; t += bar * 2, i++) {
  const [r, tones] = PROG[i % 4];
  if (t < M.endCard) {
    chords.push([t, tones.map((x) => n(root + 12 + r + x))]);
    bassNotes.push([t, n(root - 12 + r)]);
  }
  for (let k = 0; k < 16; k++) {
    const at = t + k * beat / 2;
    if (at >= M.endCard - 0.05) break;
    if (k % 8 !== 7) arp.push([at, n(root + 24 + r + tones[pattern[k % 8] % tones.length])]);
    if (at >= M.drumsFrom) {
      if (k % 4 === 0) drums.push([at, "kick"]);
      if (k % 4 === 2) drums.push([at, "snap"]);
      if (k % 2 === 1) drums.push([at, "hat"]);
    }
  }
}
new Tone.Part((t: number, c: string[]) => pad.triggerAttackRelease(c, bar * 2, t), chords).start(0);
new Tone.Part((t: number, x: string) => bass.triggerAttackRelease(x, bar * 1.9, t), bassNotes).start(0);
new Tone.Part((t: number, x: string) => pluck.triggerAttackRelease(x, "8n", t), arp).start(0);
new Tone.Part((t: number, d: string) => {
  if (d === "kick") kick.triggerAttackRelease(n(root - 24), "8n", t);
  else if (d === "snap") snap.triggerAttackRelease("16n", t);
  else hat.triggerAttackRelease("32n", t);
}, drums).start(0);
// the end card: one last downbeat, the home chord held, an arpeggio climbing to the top
const home = PROG[0][1].map((x) => n(root + 12 + x));
new Tone.Part((t: number, what: string) => {
  if (what === "hit") { kick.triggerAttackRelease(n(root - 24), "4n", t); pad.triggerAttackRelease(home, end - M.endCard + 1, t); bass.triggerAttackRelease(n(root - 12), end - M.endCard, t); }
  else pluck.triggerAttackRelease(what, "4n", t);
}, [[M.endCard, "hit"], ...[0, 4, 7, 12, 16].map((x, i) => [M.endCard + 0.35 + i * beat / 2, n(root + 24 + x)] as [number, string])]).start(0);

// ---------------------------------------------------------------- sound effects, in key
const fxVerb = new Tone.Freeverb({ roomSize: 0.6, dampening: 4000, wet: 0.22 }).connect(Tone.buses.sfx);
const bell = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.6 }, volume: -10 }).connect(fxVerb);
const tickS = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }, volume: -16 }).connect(fxVerb);
const airFilter = new Tone.Filter(900, "bandpass").connect(fxVerb);
const air = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.12, decay: 0.28, sustain: 0 }, volume: -16 }).connect(airFilter);
const low = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.22, sustain: 0, release: 0.2 }, volume: -8 }).connect(fxVerb);
const swell = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.7, decay: 0.15, sustain: 0 }, volume: -18 }).connect(fxVerb);
new Tone.Part((t: number, c: { kind: string; gain: number }) => {
  const v = c.gain ?? 1;
  if (c.kind === "tick") tickS.triggerAttackRelease(n(root + 36 + 7), 0.04, t, 0.5 * v);
  else if (c.kind === "chime") [0, 4, 7].forEach((x, i) => bell.triggerAttackRelease(n(root + 36 + x), 0.4, t + i * 0.07, 0.6 * v));
  else if (c.kind === "ping") [7, 12].forEach((x, i) => bell.triggerAttackRelease(n(root + 36 + x), 0.35, t + i * 0.1, 0.55 * v));
  else if (c.kind === "whoosh") { airFilter.frequency.setValueAtTime(500, t); airFilter.frequency.exponentialRampToValueAtTime(3500, t + 0.35); air.triggerAttackRelease(0.3, t, 0.7 * v); }
  else if (c.kind === "error") [0, -1].forEach((x, i) => low.triggerAttackRelease(n(root + 12 + 6 * (1 - i) + x), 0.16, t + i * 0.14, 0.7 * v));
  else if (c.kind === "rise") { swell.triggerAttackRelease(0.75, Math.max(0, t - 0.75), 0.8 * v); kick.triggerAttackRelease(n(root - 24), "8n", t, 0.9); }
}, (SPEC.sfx as { t: number; kind: string; gain: number }[]).map((c) => [c.t, c] as [number, any])).start(0);

Tone.getTransport().start();

function Sound() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {(SPEC.voices as { file: string; from: number }[]).map((v, i) => (
        <Sequence key={i} from={v.from} layout="none" name={`voice-${i + 1}`}>
          <Audio name={`voice-${i + 1}`} src={staticFile(v.file)} bus="voice" fadeIn={0.012} fadeOut={0.012} />
        </Sequence>
      ))}
      <Mix lufs={-14} ceiling={-1.5} />
    </AbsoluteFill>
  );
}
registerRoot(() => <Composition id="ivyward-ad-sound" component={Sound} width={320} height={180} fps={FPS} durationInFrames={SPEC.frames} />);
