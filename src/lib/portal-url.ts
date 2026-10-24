// portal links come from research and from people: normalize them, and tell a real application site from a
// program brochure page (which only has an "apply" link somewhere on it). pure, so it's tested.

export function normalizeUrl(raw: string | null | undefined): string | null {
  let u = (raw ?? "").trim().replace(/^["'<(]+|[>"')\].,;]+$/g, "");
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u.replace(/^\/+/, "")}`;
  try {
    const p = new URL(u);
    if (!p.hostname.includes(".")) return null;
    p.protocol = "https:";
    return p.toString();
  } catch {
    return null;
  }
}

const PORTAL = /(^|\.)(apply|applygrad|gradapply|admissions?|apply\w*|slate|application|portal|register|my\w*apply)\.|\/(apply|application|portal|account\/(login|register)|register|login|signin)\b|slate|technolutions|collegenet|liaisoncas|ucas\.com|studylink|uni-assist|campusnet|\.jsp\b|applyweb|embark|hobsons|radius/i;

export function looksLikePortal(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.pathname === "/" && !PORTAL.test(u.hostname + "/")) return false;
    return PORTAL.test(u.hostname + u.pathname);
  } catch {
    return false;
  }
}
