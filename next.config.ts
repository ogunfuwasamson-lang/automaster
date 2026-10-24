import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the cloud runner launches chromium in /api/runner/work: keep these out of the bundle and ship the binary
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/runner/work": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
