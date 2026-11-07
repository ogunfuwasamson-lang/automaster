// the public door on :3000. the Cloudflare worker in front of tryivyward.com sends the visitor's real host and
// country with a shared secret; only then is the host passed on to Next (so redirects, cookies and absolute URLs
// use tryivyward.com instead of the agent37.app address). a request without the secret keeps its own host, and
// a visitor can never set the country or host themselves.
import http from "node:http";

const SECRET = process.env.FRONT_PROXY_SECRET || "";
const UPSTREAM = { host: "127.0.0.1", port: 3001 };
const SPOOFABLE = ["x-vercel-ip-country", "x-original-host", "x-ivw-proxy", "x-forwarded-host"];

http
  .createServer((req, res) => {
    const h = { ...req.headers };
    const trusted = SECRET && h["x-ivw-proxy"] === SECRET;
    const host = trusted ? String(h["x-original-host"] || "") : "";
    const country = trusted ? String(h["x-vercel-ip-country"] || "") : "";
    for (const k of SPOOFABLE) delete h[k];
    if (host) {
      h.host = host;
      h["x-forwarded-host"] = host;
      h["x-forwarded-proto"] = "https";
    }
    if (/^[A-Z]{2}$/.test(country)) h["x-vercel-ip-country"] = country;
    // next builds redirects from its own address (127.0.0.1:3001): point them back at the address the visitor used
    const publicOrigin = `https://${host || req.headers.host || "localhost"}`;
    const up = http.request({ ...UPSTREAM, method: req.method, path: req.url, headers: h }, (r) => {
      const out = { ...r.headers };
      if (typeof out.location === "string") out.location = out.location.replace(/^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0):3001/, publicOrigin);
      res.writeHead(r.statusCode || 502, out);
      r.pipe(res);
    });
    up.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
      res.end("Ivyward is starting up. Try again in a moment.");
    });
    req.pipe(up);
  })
  .listen(3000, "0.0.0.0");
