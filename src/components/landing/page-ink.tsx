"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// a different ink-wash campus scene behind each section of the app, drawn in the same hand as the home page:
// a faint far skyline, soft washes, wobbly ink lines with hatched shadow sides, trees and a little life in the
// sky. one colour (var(--wash)); the buildings frame the page title at the sides and fade into paper below.

const W = 1600;
const H = 560;
const G = 520; // ground line
const K = 0.86; // scale of each side's buildings

// ---- path helpers ----
const arches = (x: number, n: number, w: number, h: number, y = G) =>
  Array.from({ length: n }, (_, i) => {
    const l = x + i * w;
    return `M${l + 4} ${y}V${y - h + w / 2}a${w / 2 - 4} ${w / 2 - 4} 0 0 1 ${w - 8} 0V${y}`;
  }).join("");
const cols = (x: number, n: number, gap: number, top: number, y = G, t = 9) =>
  Array.from({ length: n }, (_, i) => `M${x + i * gap} ${top}V${y}M${x + i * gap + t} ${top}V${y}M${x + i * gap - 3} ${top}h${t + 6}`).join("");
const archWin = (x: number, y: number, n: number, gap: number, w = 18, h = 34) =>
  Array.from({ length: n }, (_, i) => {
    const l = x + i * gap;
    return `M${l} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}Z`;
  }).join("");
const rectWin = (x: number, y: number, n: number, gap: number, w = 16, h = 26) =>
  Array.from({ length: n }, (_, i) => `M${x + i * gap} ${y}h${w}v${h}h${-w}ZM${x + i * gap + w / 2} ${y}v${h}`).join("");
const hatch = (x: number, y: number, w: number, h: number, gap = 6) =>
  Array.from({ length: Math.floor(w / gap) }, (_, i) => `M${x + i * gap} ${y + (i % 2) * 7}v${h - (i % 3) * 12 - (i % 2) * 7}`).join("");
const crenel = (x: number, y: number, w: number, s = 12) => {
  let d = `M${x} ${y}`;
  for (let i = 0; i + s <= w; i += 2 * s) d += `v${-s}h${s}v${s}h${Math.min(s, w - i - s)}`;
  return d;
};
const stairs = (x: number, w: number, n = 4, step = 7) =>
  Array.from({ length: n }, (_, i) => `M${x - (n - i) * 8} ${G - i * step}h${w + (n - i) * 16}`).join("");
const birds = (pts: [number, number, number][]) => pts.map(([x, y, s]) => `M${x} ${y}q${4 * s} ${-5 * s} ${8 * s} 0q${4 * s} ${-5 * s} ${8 * s} 0`).join("");
const balusters = (x: number, y: number, w: number, gap = 8, h = 14) =>
  `M${x} ${y}h${w}M${x} ${y + h}h${w}` + Array.from({ length: Math.floor(w / gap) }, (_, i) => `M${x + 4 + i * gap} ${y}v${h}`).join("");

function Tree({ x, s = 1, y = G }: { x: number; s?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-64" rx="34" ry="40" opacity="0.5" />
      <ellipse cx="-24" cy="-40" rx="26" ry="28" opacity="0.6" />
      <ellipse cx="24" cy="-38" rx="28" ry="30" opacity="0.55" />
      <ellipse cx="2" cy="-26" rx="30" ry="22" opacity="0.7" />
      <rect x="-3" y="-16" width="6" height="16" opacity="0.8" />
    </g>
  );
}
function Cypress({ x, s = 1, y = G }: { x: number; s?: number; y?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 0c-14-20-18-60-10-100 4-20 8-34 10-44 2 10 6 24 10 44 8 40 4 80-10 100Z" opacity="0.6" />;
}

type Side = { wash: string; lines: string; faint?: string; shade?: string; trees?: [number, number][]; cypress?: [number, number][] };
type SceneDef = { left: Side; right: Side; far: string; sky?: string; skyFaint?: string; focus: "left" | "right" };

function Draw({ s }: { s: SceneDef }) {
  const side = (d: Side) => (
    <>
      <path d={d.wash} fill="currentColor" fillOpacity="0.075" filter="url(#pi-wash)" />
      {d.shade && <path d={d.shade} fill="none" stroke="currentColor" strokeOpacity="0.13" strokeWidth="1" filter="url(#pi-rough)" />}
      <path d={d.lines} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" filter="url(#pi-rough)" />
      {d.faint && <path d={d.faint} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2" filter="url(#pi-rough)" />}
      <g fill="currentColor" fillOpacity="0.14" filter="url(#pi-wash)">
        {(d.trees ?? []).map(([x, sc]) => (
          <Tree key={`t${x}`} x={x} s={sc} />
        ))}
        {(d.cypress ?? []).map(([x, sc]) => (
          <Cypress key={`c${x}`} x={x} s={sc} />
        ))}
      </g>
    </>
  );
  return (
    <g mask="url(#pi-fade)">
      <path d="M0 450C200 410 330 430 470 400S700 370 800 360S1020 390 1160 402S1420 420 1600 440V560H0Z" fill="url(#pi-hill)" filter="url(#pi-wash)" />
      <g mask="url(#pi-sides)">
        <path d={s.far} fill="currentColor" fillOpacity="0.045" filter="url(#pi-wash)" />
        {/* each side is drawn a touch smaller, standing on the ground line, so it stays clear of the page's text */}
        <g transform={`translate(0 ${G * (1 - K)}) scale(${K})`}>{side(s.left)}</g>
        <g transform={`translate(${W * (1 - K)} ${G * (1 - K)}) scale(${K})`}>{side(s.right)}</g>
      </g>
      {s.sky && <path d={s.sky} fill="none" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1.2" strokeLinecap="round" filter="url(#pi-rough)" />}
      {s.skyFaint && <path d={s.skyFaint} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.1" strokeLinecap="round" />}
    </g>
  );
}

// far skylines, drawn as filled silhouettes along the horizon
const FAR_SPIRES = "M480 520V440h30v-30l12-40 12 40v30h40v-24a22 22 0 0 1 44 0v24h30V520ZM980 520V430h36l14-50 14 50h36v-20h40v110Z";
const FAR_DOMES = "M470 520V450h50a30 30 0 0 1 60 0h40V420l10-30 10 30v100ZM990 520V440h40v-30h30v30h50a26 26 0 0 1 52 0v80Z";

const SCENES: Record<string, SceneDef> = {
  // applications: a columned hall with its flag flying, and the iron gates you walk through
  gateway: {
    focus: "left",
    far: FAR_SPIRES,
    left: {
      wash: `M40 520V330h430v190ZM140 300l115-60 115 60ZM228 240v-40h54v40ZM228 200a27 27 0 0 1 54 0Z`,
      lines:
        `M40 520V330h110M360 330h110V520M34 330h122M354 330h122M140 300l115-60 115 60ZM140 300v18h230v-18M255 280m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0` +
        cols(164, 6, 38, 318, 490) +
        `M140 490h230` +
        stairs(140, 230, 4, 8) +
        `M228 240v-40h54v40M228 200a27 27 0 0 1 54 0M255 173V112M255 114c10-7 20 7 32 0v18c-12 7-22-7-32 0` +
        rectWin(58, 360, 3, 30, 16, 30) +
        rectWin(58, 430, 3, 30, 16, 30) +
        rectWin(378, 360, 3, 30, 16, 30) +
        rectWin(378, 430, 3, 30, 16, 30),
      shade: hatch(440, 340, 28, 176) + hatch(122, 340, 26, 176),
      faint: `M40 345h110M360 345h110M40 410h110M360 410h110`,
      trees: [[505, 1.25], [10, 1]],
    },
    right: {
      wash: `M1166 520V300h48v220ZM1446 520V300h48v220ZM1510 520V420l45-40 45 40v100Z`,
      lines:
        `M1166 520V312h48V520M1446 520V312h48V520M1160 312h60v-12h-60zM1440 312h60v-12h-60zM1190 300v-12M1470 300v-12M1190 276m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0M1470 276m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0` +
        `M1214 400Q1330 300 1446 400M1214 420h232M1214 506h232` +
        Array.from({ length: 14 }, (_, i) => {
          const x = 1222 + i * 16.5;
          const y = 400 - 50 * (1 - ((x - 1330) / 116) ** 2);
          return `M${x.toFixed(1)} ${y.toFixed(1)}V520`;
        }).join("") +
        `M1330 350V520M1316 372a14 14 0 1 0 28 0a14 14 0 1 0-28 0M1322 344h16v14q-8 8-16 0Z` +
        `M1060 470h106M1060 505h106M1494 470h106M1494 505h106` +
        Array.from({ length: 7 }, (_, i) => `M${1066 + i * 15} 520V462l3-6 3 6`).join("") +
        Array.from({ length: 7 }, (_, i) => `M${1500 + i * 15} 520V462l3-6 3 6`).join(""),
      shade: hatch(1200, 316, 14, 200, 4) + hatch(1480, 316, 14, 200, 4),
      faint: `M1510 420l45-40 45 40M1520 420v100M1540 450h20v24h-20z`,
      trees: [[1050, 1.15]],
    },
    sky: birds([[330, 120, 1.2], [356, 104, 0.9], [380, 126, 0.8], [1250, 170, 1], [1276, 156, 0.8]]),
  },

  // shortlist: a skyline of many colleges side by side — towers, a dome, a spire and a glass faculty building
  skyline: {
    focus: "right",
    far: "M0 520V400h40v-30h30v30h50V350l14-30 14 30v170ZM460 520V440h30v-50l10-24 10 24v50h50V520ZM1040 520V430h40a30 30 0 0 1 60 0h30V520ZM1560 520V380h40v140Z",
    left: {
      wash: `M110 520V150h86v370ZM260 520V330h150v190ZM270 330a65 70 0 0 1 130 0ZM10 520V250l25-80 25 80v270ZM0 520V420h480v100Z`,
      lines:
        `M110 520V150h86V520M104 150h98M110 150v-28h10v28M186 150v-28h10v28M146 150v-34h14v34M118 122l-4-14M188 122l4-14M150 116l3-20 3 20` +
        archWin(124, 180, 3, 22, 14, 44) +
        archWin(124, 260, 3, 22, 14, 44) +
        `M110 240h86M110 330h86` +
        `M260 520V330h150V520M270 330a65 70 0 0 1 130 0M322 262h26v-20h-26zM335 242v-16M300 330c4-30 16-50 35-62M370 330c-4-30-16-50-35-62` +
        cols(270, 6, 26, 346, 470, 7) +
        `M262 346h146M262 470h146` +
        `M10 520V250l25-80 25 80V520M35 170v-22M28 156h14` +
        archWin(26, 300, 1, 0, 18, 40) +
        `M0 420h480` +
        rectWin(66, 440, 1, 0, 16, 26) +
        rectWin(222, 440, 1, 0, 16, 26) +
        rectWin(420, 440, 2, 28, 16, 26),
      shade: hatch(176, 160, 20, 356, 5) + hatch(386, 350, 22, 166, 5) + hatch(46, 260, 14, 256, 5),
      trees: [[470, 1.15]],
      cypress: [[230, 1.1]],
    },
    right: {
      wash: `M1130 520V320h170v200ZM1350 520V160h64v360ZM1450 520V380h150v140ZM1460 380a65 60 0 0 1 130 0Z`,
      lines:
        `M1130 520V320h170V520M1124 320h182` +
        Array.from({ length: 6 }, (_, i) => `M${1130 + (i + 1) * 24} 320V520`).join("") +
        Array.from({ length: 5 }, (_, i) => `M1130 ${352 + i * 34}h170`).join("") +
        `M1350 520V160h64V520M1344 160h76M1350 160l32-70 32 70M1382 90v-22M1374 76h16M1350 230h64M1350 300h64` +
        archWin(1362, 176, 2, 24, 16, 40) +
        archWin(1362, 246, 2, 24, 16, 40) +
        `M1450 520V380h150M1460 380a65 60 0 0 1 130 0M1515 320h20v-14h-20zM1525 306v-12` +
        archWin(1468, 410, 4, 32, 18, 50),
      shade: hatch(1394, 168, 20, 350, 5) + hatch(1270, 326, 30, 190, 5),
      faint: `M1130 336h170`,
      trees: [[1100, 1.2], [1600, 1.1]],
    },
    sky: birds([[240, 90, 1], [264, 76, 0.8], [1240, 200, 1], [1262, 188, 0.85], [1286, 204, 0.7]]),
  },

  // messages: the clock tower and the porter's lodge where letters come in, with the post box at the gate
  clocktower: {
    focus: "left",
    far: FAR_DOMES,
    left: {
      wash: `M170 520V180h80v340ZM180 180l30-110 30 110ZM30 520V400h420v120ZM20 400l60-60h320l60 60Z`,
      lines:
        `M170 520V180h80V520M164 180h92M164 260h92M176 180l34-110 34 110M210 70V42M210 44l14 4-14 4M200 54h20` +
        `M210 222m-22 0a22 22 0 1 0 44 0a22 22 0 1 0-44 0M210 222v-14M210 222l10 6M210 202v-3M210 245v-3M190 222h3M227 222h3` +
        archWin(186, 280, 2, 30, 18, 48) +
        `M30 520V400h420V520M20 400l60-60h320l60 60M120 340v-30h20v30M340 340v-30h20v30M114 310h32M334 310h32` +
        `M215 520V455a25 25 0 0 1 50 0v65` +
        rectWin(60, 430, 4, 36, 18, 30) +
        rectWin(300, 430, 4, 36, 18, 30),
      shade: hatch(232, 186, 18, 330, 5) + hatch(420, 406, 28, 110, 5),
      faint: `M30 416h420M176 330h68M176 380h68`,
      trees: [[500, 1.2]],
    },
    right: {
      wash: `M1180 520V360l120-80 120 80v160ZM1360 330v-40h22v26ZM1560 520V450a18 18 0 0 1 36 0v70Z`,
      lines:
        `M1180 520V360l120-80 120 80V520M1170 368l130-88 130 88M1362 316V290h20v30` +
        `M1220 520V420h56v100M1210 420h76M1220 420l10-14h36l10 14` +
        rectWin(1228, 432, 2, 22, 16, 30) +
        archWin(1300, 330, 1, 0, 24, 32) +
        rectWin(1330, 430, 2, 32, 18, 34) +
        `M1500 520V400M1490 400h20l-4-18h-12zM1494 382l6-8 6 8` +
        `M1560 520V450a18 18 0 0 1 36 0v70M1556 450h44M1568 466h20M1562 512h32`,
      shade: hatch(1390, 370, 26, 146, 5) + hatch(1584, 456, 10, 60, 4),
      faint: `M1371 284c-6-10 8-14 2-24s8-14 2-24`,
      trees: [[1120, 1.15]],
    },
    // pigeons around the tower, and one letter on the wind
    sky: birds([[262, 120, 1], [286, 106, 0.8], [300, 132, 0.7], [140, 96, 0.9], [330, 84, 0.7], [1180, 230, 1], [1206, 216, 0.8]]),
    skyFaint: `M1040 150l26-10 10 26-26 10ZM1040 150l18 7 8-17`,
  },

  // documents and interview: the old library with its balustrade and tall windows, and the domed reading room
  library: {
    focus: "right",
    far: FAR_SPIRES,
    left: {
      wash: `M30 520V330h440v190Z`,
      lines:
        `M30 520V330h440V520M24 330h452M24 344h452` +
        balusters(30, 312, 440, 9, 18) +
        `M60 312v-26h16v26M60 286a8 8 0 0 1 16 0M244 312v-30h16v30M244 282a8 8 0 0 1 16 0M424 312v-26h16v26M424 286a8 8 0 0 1 16 0` +
        archWin(56, 370, 6, 70, 30, 100) +
        `M30 490h440` +
        stairs(210, 80, 3, 7) +
        `M226 490v-50a24 24 0 0 1 48 0v50`,
      shade: hatch(440, 350, 28, 166, 5),
      faint: Array.from({ length: 6 }, (_, i) => `M${71 + i * 70} 386v80M${56 + i * 70} 426h30`).join(""),
      trees: [[505, 1.2]],
    },
    right: {
      wash: `M1210 520V360h290v160ZM1225 360a130 140 0 0 1 260 0ZM1335 222h40v-30h-40zM1500 520V390h100v130Z`,
      lines:
        `M1210 520V360h290V520M1204 360h302M1204 374h302M1225 360a130 140 0 0 1 260 0M1335 222v-30h40v30M1330 192h50M1355 192v-22M1355 168m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0` +
        `M1260 360c8-60 40-110 95-138M1450 360c-8-60-40-110-95-138M1355 222V360` +
        cols(1226, 8, 38, 374, 500, 8) +
        `M1204 500h302` +
        stairs(1210, 290, 3, 7) +
        `M1500 520V390h100M1500 390l50-20 50 20` +
        Array.from({ length: 4 }, (_, i) => `M${1518 + i * 22} 412v80`).join(""),
      shade: hatch(1470, 380, 30, 120, 5),
      faint: `M1290 360c4-40 22-80 50-110M1420 360c-4-40-22-80-50-110`,
      trees: [[1150, 1.25]],
    },
    sky: birds([[150, 220, 1], [174, 206, 0.8], [1460, 150, 0.9], [1484, 138, 0.7]]),
  },

  // profile: a two-storey cloister and its bell tower, and a quad with a fountain under the trees
  cloister: {
    focus: "left",
    far: FAR_DOMES,
    left: {
      wash: `M0 520V340h470v180ZM300 340V140h80v200ZM296 140l44-50 44 50Z`,
      lines:
        `M0 340h300M380 340h90V520M0 326l20-14h260M380 312h70l20 14M0 420h470` +
        arches(0, 9, 52, 100) +
        archWin(14, 356, 6, 52, 22, 46) +
        archWin(402, 356, 1, 0, 22, 46) +
        `M300 520V140h80V520M292 140l48-54 48 54M340 86V62M332 72h16` +
        archWin(316, 160, 2, 26, 20, 56) +
        `M300 240h80M300 270h80` +
        archWin(328, 290, 1, 0, 24, 40),
      shade: hatch(358, 150, 22, 360, 5) + hatch(0, 432, 300, 84, 9),
      trees: [[505, 1.3]],
    },
    right: {
      wash: `M1120 520V400h480v120ZM1300 490h120v30h-120Z`,
      lines:
        `M1120 400h480M1114 390l14-10h468M1120 520V400` +
        arches(1120, 10, 48, 110) +
        `M1300 506c0-12 120-12 120 0s-120 12-120 0M1300 506v14M1420 506v14M1340 492c0-6 40-6 40 0M1360 492v-40M1350 452c0-4 20-4 20 0` +
        `M1360 450c-10-20-24-26-34-10M1360 450c10-20 24-26 34-10M1326 440c-4 14-8 30-10 50M1394 440c4 14 8 30 10 50`,
      shade: hatch(1120, 410, 480, 106, 10),
      trees: [[1180, 1.35], [1560, 1.3]],
      cypress: [[1260, 1], [1460, 1]],
    },
    sky: birds([[220, 110, 1], [244, 98, 0.8], [400, 70, 0.7], [1380, 220, 1], [1404, 206, 0.8]]),
  },

  // settings: the observatory under the stars, and the weather tower with its vane and cups
  observatory: {
    focus: "left",
    far: FAR_SPIRES,
    left: {
      wash: `M60 520V360h300v160ZM80 360a130 130 0 0 1 260 0Z`,
      lines:
        `M60 520V360h300V520M54 360h312M54 374h312M80 360a130 130 0 0 1 260 0M196 232l14-2 14 2V360M300 270l90-80M296 266l8 8M386 186l10 10` +
        `M110 360c6-50 40-100 100-128M310 360c-6-50-40-100-100-128` +
        archWin(86, 400, 5, 54, 22, 60) +
        `M180 520v-40h60v40`,
      shade: hatch(330, 380, 28, 136, 5),
      faint: `M60 470h300`,
      trees: [[440, 1.15], [10, 1]],
    },
    right: {
      wash: `M1380 520V200h70v320ZM1170 520V400h210v120Z`,
      lines:
        `M1380 520V200h70V520M1372 200l43-50 43 50M1415 150V96M1395 112h40M1395 112l-6-4M1435 112l6-4M1415 100l12-6-12-6` +
        `M1404 128h22M1404 128a5 5 0 1 1 0-1M1426 128a5 5 0 1 0 0-1` +
        archWin(1398, 230, 1, 0, 34, 60) +
        `M1380 320h70M1380 410h70` +
        `M1170 400h210M1164 400l10-12h200l10 12M1170 520V400` +
        rectWin(1190, 420, 4, 46, 20, 34) +
        `M1500 520V470h50v50M1500 470l25-12 25 12M1512 482h26v16h-26z`,
      shade: hatch(1430, 210, 20, 306, 5) + hatch(1350, 408, 28, 108, 5),
      trees: [[1130, 1.15], [1590, 1.2]],
    },
    // a crescent and a few stars over the dome
    sky: `M470 70a26 26 0 1 0 26 34a20 20 0 1 1-26-34Z`,
    skyFaint: [[120, 80], [300, 50], [560, 120], [640, 60], [980, 90], [1080, 50], [1220, 120], [1300, 60], [1520, 90]]
      .map(([x, y]) => `M${x - 4} ${y}h8M${x} ${y - 4}v8`)
      .join(""),
  },

  // logins and connecting chrome: the gatehouse — turrets, battlements, the arms over the door and its portcullis
  gatehouse: {
    focus: "left",
    far: FAR_DOMES,
    left: {
      wash: `M70 520V190h84v330ZM346 520V190h84v330ZM154 520V260h192v260Z`,
      lines:
        `M70 520V202h84V520M346 520V202h84V520M154 520V272h192M64 202h96M340 202h96M148 272h204` +
        crenel(64, 202, 96, 12) +
        crenel(340, 202, 96, 12) +
        crenel(148, 272, 204, 12) +
        `M96 250v-20h32v20M372 250v-20h32v20M106 330v-24M120 330v-24M112 400v-24M386 330v-24M398 330v-24M392 400v-24` +
        `M200 520V420a50 50 0 0 1 100 0v100` +
        Array.from({ length: 5 }, (_, i) => `M${212 + i * 19} ${i === 0 || i === 4 ? 396 : 374}V520`).join("") +
        `M204 440h92M201 470h98M201 500h98` +
        `M236 300h28v24q-14 14-28 0ZM250 300v34M236 314h28` +
        `M210 360h80v40h-80zM250 360v40`,
      shade: hatch(130, 210, 22, 306, 5) + hatch(406, 210, 22, 306, 5),
      trees: [[480, 1.2], [10, 1.05]],
    },
    right: {
      wash: `M1110 520V410h490v110ZM1400 520V280h70v240Z`,
      lines:
        `M1110 520V422h290M1470 422h130` +
        crenel(1104, 422, 296, 12) +
        crenel(1470, 422, 130, 12) +
        `M1400 520V292h70V520` +
        crenel(1394, 292, 82, 12) +
        `M1430 340v-26M1430 400v-26M1180 470v-24M1290 470v-24M1540 470v-24`,
      shade: hatch(1450, 300, 18, 216, 5) + hatch(1110, 432, 290, 84, 10),
      trees: [[1170, 1.15], [1560, 1.25]],
      cypress: [[1330, 1]],
    },
    sky: birds([[240, 160, 1], [264, 146, 0.8], [290, 168, 0.7], [1300, 220, 1]]),
  },
};

const ROUTES: [RegExp, string][] = [
  [/^\/applications/, "gateway"],
  [/^\/shortlist/, "skyline"],
  [/^\/messages/, "clocktower"],
  [/^\/(documents|interview)/, "library"],
  [/^\/settings/, "observatory"],
  [/^\/(logins|connect-chrome)/, "gatehouse"],
];

// filters, masks and gradients live once, in a zero-size svg both drawings point at
function Defs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
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
          <stop offset="1" stopColor="currentColor" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="pi-side" x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.22" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="0.36" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.64" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.78" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id="pi-down" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="pi-sides" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect width={W} height={H} fill="url(#pi-side)" />
        </mask>
        <mask id="pi-fade" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect width={W} height={H} fill="url(#pi-down)" />
        </mask>
      </defs>
    </svg>
  );
}

export function PageInk() {
  const path = usePathname();
  const name = ROUTES.find(([re]) => re.test(path))?.[1];
  if (!name) return null; // home has its own drawing
  const s = SCENES[name];
  const svg = (box: string, cls: string, align: string): ReactNode => (
    <svg viewBox={box} preserveAspectRatio={align} className={`pointer-events-none absolute select-none text-[var(--wash)] ${cls}`} aria-hidden>
      <Draw s={s} />
    </svg>
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden" style={{ height: 560 }}>
      <Defs />
      {/* wide screens: the whole scene, framing the title from both sides */}
      {svg(`0 0 ${W} ${H}`, "inset-x-0 top-16 hidden h-[460px] w-full opacity-90 sm:block", "xMidYMax slice")}
      {/* phones: the scene's main building alone, in the top-right corner beside the title (mirrored if it's a left-hand one) */}
      {svg(
        s.focus === "left" ? `0 60 560 ${H - 60}` : `${W - 560} 60 560 ${H - 60}`,
        `right-0 top-12 h-[250px] w-[270px] sm:hidden ${s.focus === "left" ? "-scale-x-100" : ""}`,
        s.focus === "left" ? "xMinYMax meet" : "xMaxYMax meet",
      )}
    </div>
  );
}

// one scene on its own, for a cover or a panel (the profile cover uses the cloister)
export function SceneInk({ name, className = "" }: { name: keyof typeof SCENES | string; className?: string }) {
  const s = SCENES[name];
  if (!s) return null;
  return (
    <>
      <Defs />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={`pointer-events-none select-none text-[var(--wash)] ${className}`} aria-hidden>
        <Draw s={s} />
      </svg>
    </>
  );
}
