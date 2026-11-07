import type { NextConfig } from "next";

const BROWSER = ["./node_modules/@sparticuz/chromium/**", "./node_modules/playwright-core/**"];

const nextConfig: NextConfig = {
  // a self-contained server for hosts other than vercel (deploy/agent37): node .next/standalone/server.js
  ...(process.env.STANDALONE ? { output: "standalone" as const } : {}),
  // the UserJot project id is public; accept it under the names it tends to be saved as in vercel
  env: { NEXT_PUBLIC_USERJOT_PROJECT_ID: process.env.NEXT_PUBLIC_USERJOT_PROJECT_ID || process.env.USERJOT_PROJECT_ID || process.env.PROJECT_ID || "" },
  // the cloud runner launches chromium in /api/runner/work and the live browser in /api/live: keep these out of the bundle and ship the binary
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  // route keys match as substrings ("/api/live" also matches "/api/live/[id]"), so the 70 MB chromium binary is
  // shipped to exactly the two routes that open a browser and stripped from every other one. each deployment keeps
  // a copy of every function, so this is what keeps vercel's functions storage small.
  outputFileTracingIncludes: {
    "/api/runner/work": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/live": ["./node_modules/@sparticuz/chromium/bin/**"],
    // share-card images read their font from disk; ship it with them in case one is ever rendered on demand
    "/*/[slug]/opengraph-image": ["./node_modules/@fontsource/frank-ruhl-libre/files/frank-ruhl-libre-latin-*-normal.woff"],
  },
  outputFileTracingExcludes: {
    "/api/live/*": BROWSER,
    "/api/!(runner|live)/**": BROWSER,
    "/api/runner/!(work)": BROWSER,
    "/api/runner/!(work)/**": BROWSER,
  },
};

// baseline security headers. pages can't be framed by other sites (clickjacking), except the embeddable
// scholarship finder, which exists to be put in other sites' pages. the microphone is allowed for voice chat.
const BASE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=()" },
];
nextConfig.headers = async () => [
  { source: "/((?!embed/).*)", headers: [...BASE_HEADERS, { key: "X-Frame-Options", value: "SAMEORIGIN" }, { key: "Content-Security-Policy", value: "frame-ancestors 'self'" }] },
  { source: "/embed/:path*", headers: BASE_HEADERS },
];

export default nextConfig;
