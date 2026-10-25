import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE } from "@/lib/site";

// the preview card when a link to Ivyward is shared (and the twitter card): paper, ink serif, the gate mark.
export const runtime = "nodejs";
export const alt = `${SITE.name}: ${SITE.short}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (w: 400 | 500) => readFile(path.join(process.cwd(), `node_modules/@fontsource/frank-ruhl-libre/files/frank-ruhl-libre-latin-${w}-normal.woff`));

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

export default async function OgImage() {
  const [regular, medium] = await Promise.all([font(400), font(500)]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fafafa", padding: "64px 72px", position: "relative", fontFamily: "Frank" }}>
        {/* a large faint gate behind the words, like the ink drawing on the site */}
        <div style={{ position: "absolute", right: 30, bottom: -36, display: "flex", opacity: 0.06 }}>
          <Gate size={430} color="#18181b" stroke={0.8} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 56, height: 56, borderRadius: 13, background: "#9b2c4e", alignItems: "center", justifyContent: "center" }}>
              <Gate size={40} color="#fbf4ef" stroke={2.6} />
            </div>
            <span style={{ fontSize: 40, color: "#18181b", fontWeight: 500 }}>{SITE.name}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 72, lineHeight: 1.05, color: "#18181b", letterSpacing: -1.2 }}>Your university applications,</span>
            <span style={{ fontSize: 72, lineHeight: 1.05, color: "#18181b", letterSpacing: -1.2 }}>done for you.</span>
            <span style={{ marginTop: 24, fontSize: 29, lineHeight: 1.35, color: "#52525b", maxWidth: 860 }}>Agents shortlist programs, draft and fact-check essays, and submit every portal. You review and sign.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%" }}>
            <span style={{ fontSize: 40, color: "#9b2c4e", fontWeight: 500 }}>{SITE.tagline}</span>
            <span style={{ fontSize: 26, color: "#71717a" }}>tryivyward.com</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Frank", data: regular, weight: 400, style: "normal" },
        { name: "Frank", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
