// is this link really where an application starts? a link that merely looks like a portal ("/english/apply" on ku
// leuven's main site, an "Apply via Studielink" page meant for dutch-diploma bachelor's students) sent the agents
// into information pages. this reads the page itself: a sign-in or sign-up form, or one of the application systems
// most schools use, is a portal; a page of text and links is not. pure, so it's tested.
import { platformOf, type Platform } from "@/lib/portal-platforms";

export type Verdict = "signin" | "signup" | "application" | "platform" | "info" | "unknown";
export const ACCEPT = new Set<Verdict>(["signin", "signup", "application", "platform"]);

const strip = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

// application systems that draw their page in the browser: the html a plain fetch gets is an empty shell, so the
// address has to speak for them
const APP_HOSTS = /(^|\.)(myliaison\.com|liaisoncas\.com|my\.site\.com|force\.com|studielink\.nl|uni-assist\.de|dreamapply\.com|ucas\.com|applyweb\.com|embark\.com|collegenet\.com|kiratalent\.com|mobility-online\.de|ouac\.on\.ca|campusfrance\.org)$/i;
const SIGNUP = /\b(create (an |your |a new )?account|register (now|here|for an account)?|sign ?up|new (user|applicant)s?|first[- ]time (user|applicant)s?|create (a )?(login|profile)|start (a )?new application|créer (un )?compte|inscription)\b/i;
const SIGNIN = /\b(log ?in|sign ?in|log on|returning (user|applicant)s?|forgot (your )?password|connexion|se connecter|anmelden)\b/i;
const APPLY_FORM = /\b(start (your |an |a new )?application|continue (your |an )?application|my applications?|application (portal|form|status)|begin (your |an )?application)\b/i;

export function portalVerdict(url: string, html: string | null): { verdict: Verdict; platform: Platform | null } {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return { verdict: "unknown", platform: null };
  }
  const text = html ? strip(html).slice(0, 20000) : "";
  const platform = platformOf(url, text);
  if (!html) return { verdict: APP_HOSTS.test(host) ? "platform" : "unknown", platform };
  const pw = (html.match(/<input[^>]+type\s*=\s*["']?password/gi) ?? []).length;
  const forms = (html.match(/<form\b/gi) ?? []).length;
  const inputs = (html.match(/<input\b(?![^>]*type\s*=\s*["']?(hidden|search|submit|button))/gi) ?? []).length;
  if (pw >= 2) return { verdict: "signup", platform };
  if (pw === 1) return { verdict: SIGNUP.test(text) && inputs >= 4 ? "signup" : "signin", platform };
  if (APP_HOSTS.test(host)) return { verdict: "platform", platform };
  // slate and its kind: the sign-in sits one click away on an "/account/login" link, from a page that says so
  const loginLink = /href\s*=\s*["'][^"']*(\/account\/(login|register)|\/login|\/signin|\/register|\/sign-?in|\/sign-?up|\/psp\/|\/psc\/)/i.test(html);
  if (platform && (loginLink || SIGNIN.test(text) || SIGNUP.test(text))) return { verdict: "platform", platform };
  // a short page with a form, a sign-in and a create-account link: an application site's front door
  if (forms && inputs >= 2 && (SIGNIN.test(text) || SIGNUP.test(text)) && text.length < 6000) return { verdict: "application", platform };
  if (loginLink && SIGNUP.test(text) && SIGNIN.test(text) && text.length < 4000) return { verdict: "application", platform };
  if (APPLY_FORM.test(text) && forms && inputs >= 3 && text.length < 6000) return { verdict: "application", platform };
  return { verdict: "info", platform };
}

// what level a degree is, so a master's applicant isn't sent through the bachelor's or phd route
export type Level = "undergrad" | "master" | "doctoral" | "other";
export function levelOf(degree: string | null | undefined, name = ""): Level {
  const d = `${degree ?? ""} ${name}`.toLowerCase();
  if (/\b(ph\.?\s?d|doctor(al|ate)?|dphil|d\.?phil)\b/.test(d)) return "doctoral";
  if (/\b(m\.?\s?sc|m\.?\s?a\b|mba|m\.?\s?eng|mphil|llm|master|msc|ma|mres|mfa|mpp|mpa|meng|mim|m\.s\.|ms)\b/.test(d)) return "master";
  if (/\b(b\.?\s?sc|b\.?\s?a\b|bachelor|bsc|beng|undergraduate|bba|associate)\b/.test(d)) return "undergrad";
  return "other";
}

// a link or page meant for someone else: another degree level, exchange or visiting students, or applicants with a
// home-country diploma (tu delft's "bsc-dutch-diploma" page)
const FOR: Record<Exclude<Level, "other">, RegExp> = {
  undergrad: /\b(bachelor'?s?|undergraduate|b\.?sc|bsc|first[- ]year|freshm[ae]n)\b/i,
  master: /\b(master'?s?|postgraduate taught|pgt|m\.?sc|msc)\b/i,
  doctoral: /\b(doctoral|ph\.?d|doctorate|pgr|postgraduate research|research degrees?)\b/i,
};
const ELSEWHERE = /\b(exchange|visiting|study abroad (students|programme)|erasmus incoming|short courses?|summer school|continuing education|executive education|alumni|staff|employees?)\b|dutch[- ]diploma|domestic (students|applicants)|home (students|applicants)|(eu|eea)[- ]students only/i;

export function wrongAudience(text: string, level: Level): boolean {
  let raw = text;
  try {
    raw = decodeURIComponent(text);
  } catch {
    // a malformed escape in a link: read it as it is
  }
  const t = raw.replace(/[-_/]+/g, " ");
  if (ELSEWHERE.test(t)) return true;
  if (level === "other") return false;
  const others = (Object.keys(FOR) as Exclude<Level, "other">[]).filter((l) => l !== level);
  // "graduate" names both masters and doctoral programmes: only a named other level counts
  return others.some((l) => FOR[l].test(t)) && !FOR[level].test(t);
}
