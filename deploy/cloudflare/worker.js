// tryivyward.com -> the Agent37 instance. Cloudflare keeps the domain's DNS (mail forwarding and Resend records
// stay as they are); this worker forwards every request to the instance's public URL with the real host and the
// visitor's country, signed with FRONT_PROXY_SECRET so nobody else can set them.
// deployed as Worker "ivyward" with route *tryivyward.com/*; secret FRONT_PROXY_SECRET (Settings > Variables and
// Secrets) = the same value as on the instance. ORIGIN is the instance's public port URL.
const ORIGIN = "https://ivyward-lniotgh85f.agent37.app";
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.tryivyward.com") return Response.redirect(`https://tryivyward.com${url.pathname}${url.search}`, 308);
    const target = new URL(url.pathname + url.search, ORIGIN);
    const headers = new Headers(request.headers);
    headers.set("x-original-host", url.hostname);
    headers.set("x-ivw-proxy", env.FRONT_PROXY_SECRET || "");
    headers.set("x-vercel-ip-country", request.cf?.country || "");
    const res = await fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, redirect: "manual" });
    // keep redirects on our own domain
    const loc = res.headers.get("location");
    if (loc && loc.startsWith(ORIGIN)) {
      const out = new Response(res.body, res);
      out.headers.set("location", loc.replace(ORIGIN, `https://${url.hostname}`));
      return out;
    }
    return res;
  },
};
