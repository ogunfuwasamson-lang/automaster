// an ink-wash university campus, drawn for automaster: a gothic chapel and cloister on the left, a domed
// library and clock tower on the right, hills and a gate arch behind. washes and hand-wobbled lines in one ink
// colour (var(--wash)), fading out towards the middle so the headline sits on clean paper.

function Arches({ x, y, n, w, h }: { x: number; y: number; n: number; w: number; h: number }) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const l = x + i * w;
    parts.push(`M${l + 4} ${y + h}V${y + w * 0.55}a${w / 2 - 4} ${w / 2 - 4} 0 0 1 ${w - 8} 0V${y + h}`);
  }
  return <path d={parts.join("")} />;
}

function Columns({ x, y, n, gap, h }: { x: number; y: number; n: number; gap: number; h: number }) {
  return <path d={Array.from({ length: n }, (_, i) => `M${x + i * gap} ${y}v${h}M${x + i * gap + 9} ${y}v${h}`).join("")} />;
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-58" rx="34" ry="40" opacity="0.5" />
      <ellipse cx="-22" cy="-36" rx="26" ry="28" opacity="0.6" />
      <ellipse cx="24" cy="-34" rx="28" ry="30" opacity="0.55" />
      <ellipse cx="2" cy="-22" rx="30" ry="22" opacity="0.7" />
      <rect x="-3" y="-14" width="6" height="22" opacity="0.8" />
    </g>
  );
}

export function CampusInk({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 720" preserveAspectRatio="xMidYMax slice" className={`pointer-events-none select-none text-[var(--wash)] ${className}`} aria-hidden>
      <defs>
        <filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <filter id="ink-wash" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="18" result="d" />
          <feGaussianBlur in="d" stdDeviation="2.2" />
        </filter>
        <linearGradient id="ink-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.02" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.11" />
        </linearGradient>
        {/* clean paper in the middle, ink at the sides, and everything fades into the page at the bottom */}
        <linearGradient id="ink-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.27" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.73" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="ink-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="ink-sides">
          <rect width="1600" height="720" fill="url(#ink-side)" />
        </mask>
        <mask id="ink-bottom">
          <rect width="1600" height="720" fill="url(#ink-down)" />
        </mask>
      </defs>

      <g mask="url(#ink-bottom)">
        {/* far hills, with one soft peak behind the headline */}
        <g fill="url(#ink-hill)" filter="url(#ink-wash)">
          <path d="M0 520C160 450 260 480 380 430S560 380 640 360C700 330 760 250 800 215C840 250 900 330 960 360S1120 390 1220 430S1440 470 1600 500V720H0Z" />
          <path d="M0 600C220 540 340 580 520 540S760 520 820 540S1060 590 1200 560S1440 540 1600 580V720H0Z" opacity="0.8" />
        </g>
        <path d="M720 290c30-25 55-55 80-75 25 20 50 50 80 75" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.2" filter="url(#ink-rough)" />

        <g mask="url(#ink-sides)">
          {/* left: chapel with spire, and a cloister in front */}
          <g fill="currentColor" fillOpacity="0.06" filter="url(#ink-wash)">
            <path d="M40 640V430l110-86 110 86v210Z" />
            <path d="M230 640V330h70v310Z" />
            <path d="M0 640V560h460v80Z" />
          </g>
          <g fill="none" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1.3" strokeLinejoin="round" filter="url(#ink-rough)">
            <path d="M40 640V430l110-86 110 86v210" />
            <path d="M150 344l-6-26h12z" />
            <path d="M230 640V330h70v310M230 330l35-150 35 150M265 180v-26M256 164h18" />
            <path d="M246 300h38M246 270h38" strokeOpacity="0.2" />
            <path d="M80 520v-62a20 20 0 0 1 40 0v62M180 520v-62a20 20 0 0 1 40 0v62M128 470a22 22 0 1 1 44 0a22 22 0 1 1-44 0" />
            <path d="M246 400v-30a19 19 0 0 1 38 0v30" />
            <path d="M0 560h460" />
            <Arches x={0} y={560} n={9} w={51} h={80} />
          </g>
          <g fill="currentColor" fillOpacity="0.13" filter="url(#ink-wash)">
            <Tree x={385} y={560} s={1.3} />
            <Tree x={455} y={590} s={0.95} />
            <Tree x={-10} y={540} s={1.1} />
          </g>

          {/* right: domed library with a portico, and a clock tower */}
          <g fill="currentColor" fillOpacity="0.06" filter="url(#ink-wash)">
            <path d="M1230 470V420a120 110 0 0 1 240 0v50Z" />
            <path d="M1210 640V470h280v170Z" />
            <path d="M1510 640V250h64v390Z" />
          </g>
          <g fill="none" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1.3" strokeLinejoin="round" filter="url(#ink-rough)">
            <path d="M1230 420a120 110 0 0 1 240 0M1230 420h240v50h-240zM1350 310v-30M1338 300h24M1336 316h28v-6h-28z" />
            <path d="M1258 395c25-60 55-82 92-85M1442 395c-25-60-55-82-92-85" strokeOpacity="0.18" />
            <path d="M1190 470h320l-160-58z" />
            <path d="M1200 640h300M1210 470v170M1490 470v170" />
            <Columns x={1226} y={484} n={7} gap={42} h={150} />
            <path d="M1510 640V250h64v390M1510 250l32-60 32 60M1542 190v-24" />
            <circle cx="1542" cy="300" r="20" />
            <path d="M1542 300v-12M1542 300l9 5" />
            <path d="M1522 380h40M1522 450h40M1522 520h40" strokeOpacity="0.2" />
          </g>
          <g fill="currentColor" fillOpacity="0.13" filter="url(#ink-wash)">
            <Tree x={1170} y={600} s={1.25} />
            <Tree x={1110} y={625} s={0.9} />
            <Tree x={1610} y={560} s={1.2} />
          </g>
        </g>

        {/* the gate arch at the foot of the page */}
        <g fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.3" filter="url(#ink-rough)">
          <path d="M560 720V660C560 560 680 520 800 520S1040 560 1040 660V720" />
          <path d="M600 720V665C600 585 690 552 800 552S1000 585 1000 665V720" />
          <path d="M540 650h520" strokeOpacity="0.1" />
        </g>
      </g>
    </svg>
  );
}
