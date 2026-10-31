import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

// share cards for library pages: the page's own title on paper, with the gate mark, so links shared in chats and
// feeds say what the page is.
const font = (w: 400 | 500) => readFile(path.join(process.cwd(), `node_modules/@fontsource/frank-ruhl-libre/files/frank-ruhl-libre-latin-${w}-normal.woff`));

export const OG_SIZE = { width: 1200, height: 630 };

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

export async function ogCard(kicker: string, title: string) {
  const [regular, medium] = await Promise.all([font(400), font(500)]);
  const size = title.length > 70 ? 54 : title.length > 45 ? 64 : 76;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fafafa", padding: "60px 72px", position: "relative", fontFamily: "Frank" }}>
        <div style={{ position: "absolute", right: 30, bottom: -36, display: "flex", opacity: 0.06 }}>
          <Gate size={430} color="#18181b" stroke={0.8} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 48, height: 48, borderRadius: 11, background: "#9b2c4e", alignItems: "center", justifyContent: "center" }}>
              <Gate size={34} color="#fbf4ef" stroke={2.6} />
            </div>
            <span style={{ fontSize: 34, color: "#18181b", fontWeight: 500 }}>Ivyward</span>
            <span style={{ fontSize: 26, color: "#71717a", marginLeft: 12 }}>{kicker}</span>
          </div>
          <span style={{ fontSize: size, lineHeight: 1.08, color: "#18181b", letterSpacing: -1, maxWidth: 1000 }}>{title}</span>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%" }}>
            <span style={{ fontSize: 26, color: "#52525b" }}>Checked against official sources</span>
            <span style={{ fontSize: 26, color: "#9b2c4e" }}>tryivyward.com</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Frank", data: regular, weight: 400, style: "normal" }, { name: "Frank", data: medium, weight: 500, style: "normal" }] },
  );
}
