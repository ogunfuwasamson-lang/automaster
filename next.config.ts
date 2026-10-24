import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the cloud runner launches chromium in /api/runner/work and the live browser in /api/live: keep these out of the bundle and ship the binary
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/runner/work": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/live": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
