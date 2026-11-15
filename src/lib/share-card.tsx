import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ShareFacts } from "@/lib/share-school";

// the picture that travels with a shared programme: the link preview in whatsapp (1200x630) and the image to post
// on a status (1080x1350). paper, ink serif and the gate mark, like every Ivyward card; the school's own name in
// type, never its crest (that's the school's mark, not ours to print).
const font = (w: 400 | 500) => readFile(path.join(process.cwd(), `node_modules/@fontsource/frank-ruhl-libre/files/frank-ruhl-libre-latin-${w}-normal.woff`));
const INK = "#18181b";
const MUTED = "#71717a";
const BRAND = "#9b2c4e";
const PAPER = "#fafafa";
const CREAM = "#fbf4ef";

function Gate({ size: s, color, stroke }: { size: number; color: string; stroke: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M5 28V11l3-4 3 4v17M21 28V11l3-4 3 4v17" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <path d="M11 28V19a5 5 0 0 1 10 0v9" stroke={color} strokeWidth={stroke} />
      <path d="M3 28h26" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <path d="M11 14h10" stroke={color} strokeWidth={stroke} />
    </svg>
  );
}

function Brand({ tile }: { tile: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: tile * 0.3 }}>
      <div style={{ display: "flex", width: tile, height: tile, borderRadius: tile * 0.23, background: BRAND, alignItems: "center", justifyContent: "center" }}>
        <Gate size={tile * 0.7} color={CREAM} stroke={2.6} />
      </div>
      <span style={{ fontSize: tile * 0.68, color: INK, fontWeight: 500 }}>Ivyward</span>
    </div>
  );
}

// up to four facts, the ones a friend asks first
function facts(f: ShareFacts): [string, string][] {
  const out: [string, string][] = [];
  if (f.deadline) out.push(["Next deadline", `${f.deadline.when}${f.deadline.note ? ` (${f.deadline.note})` : ""}`]);
  if (f.tuition) out.push(["Tuition", f.tuition]);
  if (f.fee) out.push(["Application fee", f.fee]);
  if (f.english) out.push(["English", f.english]);
  else if (f.tests) out.push(["Tests", f.tests]);
  return out.slice(0, 4);
}

const fit = (s: string, sizes: [number, number][]) => sizes.find(([max]) => s.length <= max)?.[1] ?? sizes[sizes.length - 1][1];

export async function shareCard(f: ShareFacts, shape: "link" | "status") {
  const [regular, medium] = await Promise.all([font(400), font(500)]);
  const fonts = [
    { name: "Frank", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Frank", data: medium, weight: 500 as const, style: "normal" as const },
  ];
  const sub = [f.place, f.length].filter(Boolean).join("  ·  ");
  const rows = facts(f);
  if (shape === "status") {
    const title = fit(f.title, [[22, 92], [36, 78], [60, 64], [999, 54]]);
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAPER, padding: "72px 72px 64px", position: "relative", fontFamily: "Frank" }}>
          <div style={{ position: "absolute", right: -40, top: 260, display: "flex", opacity: 0.05 }}>
            <Gate size={620} color={INK} stroke={0.8} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Brand tile={60} />
            <span style={{ fontSize: 28, color: MUTED }}>tryivyward.com</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 96 }}>
            <span style={{ fontSize: title, lineHeight: 1.04, color: INK, letterSpacing: -1.5, fontWeight: 500 }}>{f.title}</span>
            {f.program ? <span style={{ marginTop: 26, fontSize: f.program.length > 60 ? 36 : 42, lineHeight: 1.2, color: "#3f3f46" }}>{f.program}</span> : null}
            {sub ? <span style={{ marginTop: 18, fontSize: 30, color: MUTED }}>{sub}</span> : null}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 44, borderTop: `2px solid ${INK}` }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "22px 0", borderBottom: "1px solid #d4d4d8" }}>
                <span style={{ fontSize: 28, color: MUTED }}>{k}</span>
                <span style={{ fontSize: 36, color: INK, maxWidth: 640, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", background: BRAND, borderRadius: 28, padding: "38px 44px" }}>
            <span style={{ fontSize: 44, color: CREAM, fontWeight: 500 }}>Ivyward AI can apply for you</span>
            <span style={{ marginTop: 10, fontSize: 28, lineHeight: 1.35, color: CREAM, opacity: 0.85 }}>Essays, fee-waiver requests and the school portal, done for you. You review and sign.</span>
          </div>
        </div>
      ),
      { width: 1080, height: 1350, fonts },
    );
  }
  const title = fit(f.title, [[24, 70], [40, 58], [999, 48]]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAPER, padding: "52px 64px 48px", position: "relative", fontFamily: "Frank" }}>
        <div style={{ position: "absolute", right: 20, bottom: -40, display: "flex", opacity: 0.05 }}>
          <Gate size={420} color={INK} stroke={0.8} />
        </div>
        <Brand tile={46} />
        <div style={{ display: "flex", marginTop: 34, gap: 48, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 600 }}>
            <span style={{ fontSize: title, lineHeight: 1.05, color: INK, letterSpacing: -1, fontWeight: 500 }}>{f.title}</span>
            {f.program ? <span style={{ marginTop: 16, fontSize: f.program.length > 60 ? 27 : 31, lineHeight: 1.22, color: "#3f3f46" }}>{f.program}</span> : null}
            {sub ? <span style={{ marginTop: 12, fontSize: 24, color: MUTED }}>{sub}</span> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, borderTop: `2px solid ${INK}` }}>
            {rows.slice(0, 3).map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", padding: "14px 0", borderBottom: "1px solid #d4d4d8" }}>
                <span style={{ fontSize: 20, color: MUTED }}>{k}</span>
                <span style={{ marginTop: 4, fontSize: 28, color: INK }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 26, color: BRAND, fontWeight: 500 }}>Ivyward AI can apply for you</span>
          <span style={{ fontSize: 24, color: MUTED }}>tryivyward.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
