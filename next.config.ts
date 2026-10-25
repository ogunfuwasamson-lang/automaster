import type { NextConfig } from "next";

const BROWSER = ["./node_modules/@sparticuz/chromium/**", "./node_modules/playwright-core/**"];

const nextConfig: NextConfig = {
  // the cloud runner launches chromium in /api/runner/work and the live browser in /api/live: keep these out of the bundle and ship the binary
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  // route keys match as substrings ("/api/live" also matches "/api/live/[id]"), so the 70 MB chromium binary is
  // shipped to exactly the two routes that open a browser and stripped from every other one. each deployment keeps
  // a copy of every function, so this is what keeps vercel's functions storage small.
  outputFileTracingIncludes: {
    "/api/runner/work": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/live": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  outputFileTracingExcludes: {
    "/api/live/*": BROWSER,
    "/api/!(runner|live)/**": BROWSER,
    "/api/runner/!(work)": BROWSER,
    "/api/runner/!(work)/**": BROWSER,
  },
};

export default nextConfig;
