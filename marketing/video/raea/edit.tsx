// Ivyward social video, rendered by raea. make.mjs writes spec.gen.ts (the scenes, their frames, the voice lines'
// files and the music's key) next to this file and renders it; nothing here needs editing per video.
// Look: paper ground, the campus ink drawing drifting at the foot, the oxblood mark, Frank Ruhl Libre over Roboto Flex.
import {
  AbsoluteFill, Animate, Audio, Composition, Img, Mix, Sequence, Stagger, fade, interpolate, pop, registerRoot, rise,
  slide, staticFile, tick, useCurrentFrame,
} from "raea";
import * as Tone from "raea/tone";
import { SPEC } from "./spec.gen";

type Scene = {
  kind: "hook" | "point" | "list" | "stat" | "card" | "cta";
  from: number;
  frames: number;
  title?: string;
  sub?: string;
  body?: string;
  note?: string;
  step?: string;
  items?: string[];
  value?: number;
  prefix?: string;
  suffix?: string;
  voice?: string | null;
};

const C = { paper: "#fafafa", ink: "#09090b", muted: "#52525b", line: "#e4e4e7", brand: "#9b2c4e", card: "#ffffff", dark: "#18181b" };
const SERIF = "'Frank Ruhl Libre', Georgia, serif";
const SANS = "'Roboto Flex', system-ui, sans-serif";
const FONTS = `
@font-face { font-family: 'Frank Ruhl Libre'; font-weight: 400; src: url(${staticFile("fonts/frank-ruhl-libre-latin-400-normal.woff2")}); }
@font-face { font-family: 'Frank Ruhl Libre'; font-weight: 500; src: url(${staticFile("fonts/frank-ruhl-libre-latin-500-normal.woff2")}); }
@font-face { font-family: 'Roboto Flex'; font-weight: 400; src: url(${staticFile("fonts/roboto-flex-latin-wght-normal.woff2")}); }
@font-face { font-family: 'Roboto Flex'; font-weight: 600; src: url(${staticFile("fonts/roboto-flex-latin-wght-normal.woff2")}); }
`;

// ---------------------------------------------------------------- music: an original bed for each video
// soft pad chords, a plucked arpeggio and a low pulse on the music bus, ducked under the voice, lifted for the end card
const M = SPEC.music;
Tone.getTransport().bpm.value = M.bpm;
Tone.buses.music.duck(Tone.buses.voice, { amount: -12 });
Tone.buses.music.volume.value = -21;
Tone.buses.music.volume.rampTo(-13, 0.6, SPEC.endCard / 30);
const pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine" }, envelope: { attack: 0.9, decay: 0.4, sustain: 0.8, release: 1.8 }, volume: -11 }).connect(Tone.buses.music);
const pluck = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.004, decay: 0.35, sustain: 0, release: 0.5 }, volume: -15 }).connect(Tone.buses.music);
const bass = new Tone.MonoSynth({ oscillator: { type: "sine" }, envelope: { attack: 0.02, decay: 0.5, sustain: 0.6, release: 0.8 }, volume: -12 }).connect(Tone.buses.music);
new Tone.Part((t: number, c: string[]) => pad.triggerAttackRelease(c, "2m", t), M.chords.map((c: string[], i: number) => [`${i * 2}:0`, c])).start(0);
new Tone.Part((t: number, n: string) => bass.triggerAttackRelease(n, "1m", t), M.bass.map((n: string, i: number) => [`${i * 2}:0`, n])).start(0);
new Tone.Sequence((t: number, n: string | null) => { if (n) pluck.triggerAttackRelease(n, "8n", t); }, M.arp, "8n").start(0);
Tone.getTransport().loop = true;
Tone.getTransport().loopEnd = `${M.chords.length * 2}m`;
Tone.getTransport().start();

// ---------------------------------------------------------------- parts
const enterCard = slide({ from: "right", distance: 120, frames: 12 });
const enterWord = rise({ distance: 36, frames: 9 });

function Hook({ s }: { s: Scene }) {
  const words = String(s.title ?? "").split(/\s+/);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 100, lineHeight: 1.04, letterSpacing: -2, color: C.ink }}>
        {words.map((w, i) => (
          <Animate key={i} as="span" enter={enterWord} at={4 + i * 3} style={{ display: "inline-block", marginRight: 24 }}>{w}</Animate>
        ))}
      </div>
      {s.sub ? <Animate enter="rise" at={8 + words.length * 3} style={{ fontFamily: SANS, fontSize: 46, lineHeight: 1.35, color: C.muted }}>{s.sub}</Animate> : null}
    </div>
  );
}

function Point({ s }: { s: Scene }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      {s.step ? <Animate enter="fade" at={2} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 36, color: C.brand }}>{s.step}</Animate> : null}
      <Animate enter="rise" at={4} style={{ fontFamily: SERIF, fontSize: 80, lineHeight: 1.08, letterSpacing: -1.5, color: C.ink }}>{s.title}</Animate>
      {s.body ? <Animate enter="rise" at={14} style={{ fontFamily: SANS, fontSize: 52, lineHeight: 1.36, color: "#27272a" }}>{s.body}</Animate> : null}
      {s.note ? <Animate enter="fade" at={24} style={{ fontFamily: SANS, fontSize: 34, lineHeight: 1.4, color: C.muted, borderLeft: `5px solid ${C.brand}`, paddingLeft: 22 }}>{s.note}</Animate> : null}
    </div>
  );
}

function List({ s }: { s: Scene }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <Animate enter="rise" at={2} style={{ fontFamily: SERIF, fontSize: 76, lineHeight: 1.08, letterSpacing: -1.5, color: C.ink }}>{s.title}</Animate>
      <Stagger each={14} at={14} enter="rise" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {(s.items ?? []).map((it, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#f6e7ec", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Img src={staticFile("check.svg")} style={{ width: 36, height: 36 }} />
            </div>
            <div style={{ fontFamily: SANS, fontSize: 50, lineHeight: 1.28, color: C.ink, flex: 1 }}>{it}</div>
          </div>
        ))}
      </Stagger>
    </div>
  );
}

function Stat({ s }: { s: Scene }) {
  const count = tick({ to: Number(s.value) || 0, frames: 30, separator: true, prefix: s.prefix ?? "", suffix: s.suffix ?? "" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <Animate as="div" enter={count} at={4} style={{ fontFamily: SERIF, fontSize: 230, lineHeight: 0.95, color: C.brand, letterSpacing: -4 }} />
      <Animate enter="rise" at={16} style={{ fontFamily: SERIF, fontSize: 72, lineHeight: 1.08, color: C.ink }}>{s.title}</Animate>
      {s.body ? <Animate enter="rise" at={24} style={{ fontFamily: SANS, fontSize: 50, lineHeight: 1.36, color: "#27272a" }}>{s.body}</Animate> : null}
    </div>
  );
}

function Card({ s }: { s: Scene }) {
  return (
    <Animate enter={enterCard} at={0} style={{ backgroundColor: C.card, border: `2px solid ${C.line}`, borderRadius: 44, padding: 64, display: "flex", flexDirection: "column", gap: 30, boxShadow: "0 30px 60px -30px rgba(9,9,11,0.28)" }}>
      {s.step ? <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 36, color: C.brand }}>{s.step}</div> : null}
      <div style={{ fontFamily: SERIF, fontSize: 76, lineHeight: 1.08, letterSpacing: -1.5, color: C.ink }}>{s.title}</div>
      {s.body ? <div style={{ fontFamily: SANS, fontSize: 50, lineHeight: 1.36, color: "#27272a" }}>{s.body}</div> : null}
    </Animate>
  );
}

function Cta({ s }: { s: Scene }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 }}>
      <Animate enter={pop()} at={2} style={{ width: 170, height: 170, borderRadius: 40, backgroundColor: C.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Img src={staticFile("mark-light.svg")} style={{ width: 120, height: 120 }} />
      </Animate>
      <Animate enter="rise" at={10} style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: SERIF, fontSize: 92, lineHeight: 1.04, letterSpacing: -2, color: C.ink, textAlign: "center" }}>
        {/* "|" marks where a line breaks, so the last line never holds one word */}
        {String(s.title || "Your university|applications,|done for you.").split("|").map((l, i) => <div key={i}>{l}</div>)}
      </Animate>
      <Animate enter="fade" at={20} style={{ fontFamily: SANS, fontSize: 46, color: C.muted, textAlign: "center" }}>{s.sub || "Start for free at tryivyward.com"}</Animate>
    </div>
  );
}

const PART: Record<Scene["kind"], (p: { s: Scene }) => any> = { hook: Hook, point: Point, list: List, stat: Stat, card: Card, cta: Cta };

// a slow push-in across the whole scene, so the frame never sits still while the voice reads
function Push({ frames, children }: { frames: number; children: any }) {
  const f = useCurrentFrame();
  const k = interpolate(f, [0, frames], [1, 1.045], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(f, [0, frames], [10, -10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ display: "flex", flexDirection: "column", transform: `translateY(${y}px) scale(${k})`, transformOrigin: "30% 50%" }}>{children}</div>;
}

function Frame() {
  const f = useCurrentFrame();
  const total = SPEC.frames;
  const drift = Math.sin(f / 30 * 0.25) * 14;
  const grow = 1 + 0.05 * (f / total);
  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      <style>{FONTS}</style>
      <Img src={staticFile("ink.png")} style={{ position: "absolute", left: -230, bottom: -10, width: 1540, height: 693, transform: `translateX(${drift}px) scale(${grow})`, transformOrigin: "50% 100%" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 8, backgroundColor: C.line }}>
        <div style={{ height: 8, width: `${Math.min(100, (f / total) * 100)}%`, backgroundColor: C.brand }} />
      </div>
      <div style={{ position: "absolute", left: 80, top: 64, display: "flex", flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Img src={staticFile("mark.svg")} style={{ width: 46, height: 46 }} />
        <div style={{ fontFamily: SERIF, fontSize: 42, letterSpacing: -0.8, color: C.ink }}>Ivyward</div>
      </div>
      {(SPEC.scenes as Scene[]).map((s, i) => {
        const last = i === SPEC.scenes.length - 1;
        const P = PART[s.kind];
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.frames} name={`scene-${i + 1}`}>
            <Animate enter={fade({ frames: 6 })} at={0} exit={last ? undefined : "fade"} exitAt={last ? undefined : s.frames - 10}
              style={{ position: "absolute", left: 80, right: 80, top: 200, bottom: 270, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Push frames={s.frames}><P s={s} /></Push>
            </Animate>
          </Sequence>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 34, color: "#ffffff", backgroundColor: C.dark, paddingTop: 16, paddingBottom: 16, paddingLeft: 34, paddingRight: 34, borderRadius: 18 }}>tryivyward.com</div>
      </div>
      {(SPEC.scenes as Scene[]).map((s, i) => s.voice ? (
        <Sequence key={`v${i}`} from={s.from + 10} layout="none" name={`voice-${i + 1}`}>
          <Audio name={`voice-${i + 1}`} src={staticFile(s.voice)} bus="voice" fadeIn={0.012} fadeOut={0.012} />
        </Sequence>
      ) : null)}
      <Mix lufs={-14} ceiling={-1.5} />
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="ivyward" component={Frame} width={1080} height={1350} fps={30} durationInFrames={SPEC.frames} />);
