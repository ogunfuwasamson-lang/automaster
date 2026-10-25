"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// a different ink-wash campus scene behind each section of the app, drawn in the same hand as the landing
// page: soft washes plus wobbly ink lines in one colour (var(--wash)), at the sides of the page, fading into paper.

const W = 1600;
const H = 420;

// ---- building blocks (all coordinates in the 1600 x 420 band, ground at y = 400) ----
const G = 400;

function arches(x: number, n: number, w: number, h: number, y = G) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const l = x + i * w;
    d += `M${l + 4} ${y}V${y - h + w / 2}a${w / 2 - 4} ${w / 2 - 4} 0 0 1 ${w - 8} 0V${y}`;
  }
  return d;
}
function columns(x: number, n: number, gap: number, top: number, y = G) {
  let d = "";
  for (let i = 0; i < n; i++) d += `M${x + i * gap} ${top}V${y}M${x + i * gap + 10} ${top}V${y}`;
  return d;
}
function windows(x: number, y: number, n: number, gap: number, w = 18, h = 34) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const l = x + i * gap;
    d += `M${l} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}`;
  }
  return d;
}
function stairs(x: number, w: number, n = 4, step = 7) {
  let d = "";
  for (let i = 0; i < n; i++) d += `M${x - i * 10} ${G - i * step}h${w + i * 20}`;
  return d;
}

function Tree({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${G}) scale(${s})`}>
      <ellipse cx="0" cy="-62" rx="34" ry="40" opacity="0.5" />
      <ellipse cx="-22" cy="-38" rx="26" ry="28" opacity="0.6" />
      <ellipse cx="24" cy="-36" rx="28" ry="30" opacity="0.55" />
      <ellipse cx="2" cy="-24" rx="30" ry="22" opacity="0.7" />
      <rect x="-3" y="-14" width="6" height="14" opacity="0.8" />
    </g>
  );
}

// one side of a scene: washes (filled shapes) + lines + trees
type Side = { wash: string; lines: string; faint?: string; trees?: [number, number][] };

function Scene({ left, right, back }: { left: Side; right: Side; back?: string }) {
  const side = (s: Side) => (
    <>
      <path d={s.wash} fill="currentColor" fillOpacity="0.08" filter="url(#pi-wash)" />
      <path d={s.lines} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" strokeLinejoin="round" filter="url(#pi-rough)" />
      {s.faint && <path d={s.faint} fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.2" filter="url(#pi-rough)" />}
      <g fill="currentColor" fillOpacity="0.12" filter="url(#pi-wash)">
        {(s.trees ?? []).map(([x, sc]) => (
          <Tree key={x} x={x} s={sc} />
        ))}
      </g>
    </>
  );
  return (
    <>
      <path d={back ?? `M0 330C200 290 320 310 460 280S700 250 800 236S1020 270 1160 282S1420 300 1600 320V${H}H0Z`} fill="url(#pi-hill)" filter="url(#pi-wash)" />
      <g mask="url(#pi-sides)">
        {side(left)}
        {side(right)}
      </g>
    </>
  );
}

// ---- the scenes ----
const SCENES: Record<string, () => ReactNode> = {
  // applications: a classical portico with steps; the main gate with railings and lamps
  gateway: () => (
    <Scene
      left={{
        wash: `M60 ${G}V250h330v150ZM40 250l185-62 185 62Z`,
        lines: `M60 ${G}V250h330V${G}M40 250l185-62 185 62ZM60 262h330${columns(86, 7, 46, 262)}${stairs(60, 330)}M210 222a15 15 0 1 1 30 0a15 15 0 1 1-30 0`,
        faint: `M110 205h230`,
        trees: [[440, 1.1], [500, 0.85]],
      }}
      right={{
        wash: `M1180 ${G}V230h40v170ZM1460 ${G}V230h40v170ZM1220 ${G}V300a120 120 0 0 1 240 0v100Z`,
        lines: `M1180 ${G}V230h40V${G}M1460 ${G}V230h40V${G}M1176 230h48l-24-26zM1456 230h48l-24-26zM1220 ${G}V300a120 120 0 0 1 240 0V${G}M1240 ${G}V305a100 100 0 0 1 200 0V${G}${Array.from({ length: 9 }, (_, i) => `M${1262 + i * 20} ${G}V${270 + Math.abs(4 - i) * 6}`).join("")}M1130 ${G}V300M1122 300h16l-8-14zM1560 ${G}V300M1552 300h16l-8-14z`,
        trees: [[1090, 1], [1590, 1.15]],
      }}
    />
  ),
  // shortlist: a skyline of spires, pinnacles and small domes, as seen across a quad
  skyline: () => (
    <Scene
      left={{
        wash: `M0 ${G}V300h80V260l20-60 20 60v40h70V240l30-90 30 90v60h90V280l18-40 18 40v120Z`,
        lines: `M0 300h80V260l20-60 20 60v40h70V240l30-90 30 90v60h90V280l18-40 18 40V${G}M100 200v-18M220 150v-24M436 240v-14${windows(18, 330, 3, 22)}${windows(210, 300, 3, 22)}${windows(330, 330, 3, 22)}M190 ${G}V300`,
        faint: `M0 360h460`,
        trees: [[480, 1.05]],
      }}
      right={{
        wash: `M1140 ${G}V300h70a50 50 0 0 1 100 0h60V230l26-70 26 70v70h80V270h60v130Z`,
        lines: `M1140 ${G}V300h70a50 50 0 0 1 100 0h60V230l26-70 26 70v70h80V270h60V${G}M1260 250v-14M1396 160v-22M1520 270l30-40 30 40${windows(1160, 330, 3, 26)}${windows(1380, 300, 2, 26)}${windows(1500, 320, 3, 24)}`,
        faint: `M1140 360h460`,
        trees: [[1100, 1.1]],
      }}
    />
  ),
  // messages: a clock tower with its bell, and the porter's lodge where letters arrive
  clocktower: () => (
    <Scene
      left={{
        wash: `M150 ${G}V160h90v240ZM60 ${G}V300h300v100Z`,
        lines: `M150 ${G}V160h90V${G}M140 160l55-70 55 70M195 90v-24M186 76h18M60 300h300V${G}M60 ${G}V300${windows(176, 250, 2, 24, 16, 30)}${windows(80, 330, 4, 70)}`,
        faint: `M195 200m-24 0a24 24 0 1 0 48 0a24 24 0 1 0-48 0M195 200v-14M195 200l10 6`,
        trees: [[420, 1.2], [20, 0.9]],
      }}
      right={{
        wash: `M1200 ${G}V300l110-70 110 70v100ZM1420 ${G}V320h120v80Z`,
        lines: `M1200 ${G}V300l110-70 110 70V${G}M1190 306l120-80 120 80M1340 250V214h18v26M1420 320h120V${G}M1290 ${G}V340h40V${G}${windows(1225, 320, 1, 0)}${windows(1370, 320, 1, 0)}${windows(1440, 340, 3, 32, 16, 28)}M1580 ${G}V350h-18v50`,
        trees: [[1150, 1.05], [1590, 1]],
      }}
    />
  ),
  // documents and interview: the library's long arched windows; a reading-room rotunda with its lantern
  library: () => (
    <Scene
      left={{
        wash: `M30 ${G}V230h420v170ZM20 230l220-46 220 46Z`,
        lines: `M30 ${G}V230h420V${G}M20 230l220-46 220 46Z${windows(60, 260, 6, 64, 30, 90)}M30 360h420${stairs(30, 420, 3, 6)}`,
        faint: `M120 212h240`,
        trees: [[490, 1.1]],
      }}
      right={{
        wash: `M1220 ${G}V300h300v100ZM1240 300a130 110 0 0 1 260 0Z`,
        lines: `M1220 ${G}V300h300V${G}M1240 300a130 110 0 0 1 260 0M1350 192h40v-24h-40zM1370 168v-18${columns(1240, 7, 42, 312)}M1220 312h300`,
        faint: `M1270 285c20-50 60-80 100-82M1470 285c-20-50-60-80-100-82`,
        trees: [[1170, 1.15], [1580, 1]],
      }}
    />
  ),
  // profile: a cloister walk under trees, and a bell tower above it
  cloister: () => (
    <Scene
      left={{
        wash: `M0 ${G}V300h480v100ZM300 300V170h70v130Z`,
        lines: `M0 300h480V${G}M0 ${G}V300${arches(0, 9, 53, 90)}M300 300V170h70v130M292 170l43-60 43 60M335 110v-20${windows(318, 200, 1, 0, 34, 60)}`,
        faint: `M0 288h480`,
        trees: [[520, 1.2]],
      }}
      right={{
        wash: `M1140 ${G}V310h460v90Z`,
        lines: `M1140 310h460M1140 ${G}V310${arches(1140, 9, 51, 80)}M1130 302l20-14h440l20 14`,
        trees: [[1240, 1.3], [1420, 1.1], [1560, 1.25]],
      }}
    />
  ),
  // settings: the observatory dome with its slit and telescope, and a weather tower
  observatory: () => (
    <Scene
      left={{
        wash: `M70 ${G}V290h260v110ZM90 290a110 110 0 0 1 220 0Z`,
        lines: `M70 ${G}V290h260V${G}M90 290a110 110 0 0 1 220 0M180 186l20-6 20 6v104M250 200l70-60M246 196l8 8${windows(110, 320, 4, 52, 18, 40)}`,
        faint: `M70 302h260`,
        trees: [[400, 1.1], [20, 0.9]],
      }}
      right={{
        wash: `M1380 ${G}V200h70v200ZM1180 ${G}V320h200v80Z`,
        lines: `M1380 ${G}V200h70V${G}M1372 200l43-50 43 50M1415 150v-30M1400 128h30M1415 120l10-8M1180 320h200V${G}M1180 ${G}V320${windows(1200, 340, 4, 44, 18, 34)}${windows(1398, 240, 1, 0, 30, 50)}`,
        trees: [[1130, 1.1], [1520, 1.2]],
      }}
    />
  ),
  // logins and connecting chrome: a gatehouse with its towers, crenellations and portcullis
  gatehouse: () => (
    <Scene
      left={{
        wash: `M60 ${G}V220h90v180ZM330 ${G}V220h90v180ZM150 ${G}V260h180v140Z`,
        lines: `M60 ${G}V220h90V${G}M330 ${G}V220h90V${G}M150 260h180M60 220v-14h18v14h18v-14h18v14h18v-14h18v14M330 220v-14h18v14h18v-14h18v14h18v-14h18v14M190 ${G}V320a50 50 0 0 1 100 0V${G}${Array.from({ length: 5 }, (_, i) => `M${205 + i * 18} ${G}V${300 + Math.abs(2 - i) * 5}`).join("")}M196 340h88M196 370h88${windows(90, 260, 1, 0, 20, 40)}${windows(360, 260, 1, 0, 20, 40)}`,
        trees: [[470, 1.15]],
      }}
      right={{
        wash: `M1180 ${G}V330h420v70Z`,
        lines: `M1180 330h420M1180 ${G}V330M1180 330v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10h20v-10h20v10${arches(1380, 1, 80, 70)}`,
        trees: [[1130, 1.1], [1280, 0.95], [1560, 1.2]],
      }}
    />
  ),
};

const ROUTES: [RegExp, string][] = [
  [/^\/applications/, "gateway"],
  [/^\/shortlist/, "skyline"],
  [/^\/messages/, "clocktower"],
  [/^\/(documents|interview)/, "library"],
  [/^\/profile/, "cloister"],
  [/^\/settings/, "observatory"],
  [/^\/(logins|connect-chrome)/, "gatehouse"],
];

export function PageInk() {
  const path = usePathname();
  const scene = ROUTES.find(([re]) => re.test(path))?.[1];
  if (!scene) return null; // home has its own drawing
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-x-0 top-16 z-0 h-[300px] w-full select-none text-[var(--wash)] opacity-80 sm:h-[360px]" aria-hidden>
      <defs>
        <filter id="pi-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <filter id="pi-wash" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="16" result="d" />
          <feGaussianBlur in="d" stdDeviation="2" />
        </filter>
        <linearGradient id="pi-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.02" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="pi-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.58" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id="pi-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.5" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="pi-sides">
          <rect width={W} height={H} fill="url(#pi-side)" />
        </mask>
        <mask id="pi-fade">
          <rect width={W} height={H} fill="url(#pi-down)" />
        </mask>
      </defs>
      <g mask="url(#pi-fade)">{SCENES[scene]()}</g>
    </svg>
  );
}
