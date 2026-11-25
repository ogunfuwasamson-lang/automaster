// a school's password rules, read from its sign-up page or its error message, so the password the agents make for
// the applicant is one the site accepts. hkust (nov 2026) takes "letters and numbers only, 12-20 characters": our
// usual password has a symbol, so its sign-up refused it four times and the applicant was asked to do it by hand.
// pure, with the random source passed in (the engine that reads the rules also runs inside the chrome extension).

export type PasswordPolicy = {
  min: number;
  max: number;
  symbols: "none" | "required" | "allowed";
  allowed?: string; // the only symbols the site takes, when it lists them
};

export const DEFAULT_POLICY: PasswordPolicy = { min: 12, max: 64, symbols: "required" };

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?-_";

// only the sentences that talk about the password
function aboutPassword(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;])\s+|\n|•|·/)
    .filter((s) => /pass ?word|passphrase|mot de passe|contraseña|kennwort/i.test(s) || /\b(characters?|letters?|digits?|numbers?|symbols?|special)\b/i.test(s))
    .join(" ")
    .slice(0, 2000);
}

export function passwordPolicy(text: string | null | undefined): PasswordPolicy | null {
  if (!text) return null;
  const t = aboutPassword(text).toLowerCase();
  if (!t || !/(character|letter|digit|number|symbol|special|alphanumeric)/.test(t)) return null;
  let min: number | null = null;
  let max: number | null = null;
  const range = t.match(/(\d{1,2})\s*(?:-|–|—|to|and)\s*(\d{1,3})\s*(?:alphanumeric\s+)?(?:characters?|chars?|letters)/) ?? t.match(/between\s+(\d{1,2})\s+and\s+(\d{1,3})/);
  if (range) {
    min = Number(range[1]);
    max = Number(range[2]);
  }
  const least = t.match(/(?:at least|minimum(?: of)?|min\.?|no (?:fewer|less) than)\s+(\d{1,2})\s*(?:characters?|chars?)/) ?? t.match(/(\d{1,2})\s*(?:characters?|chars?)\s+(?:or more|minimum|at least)/);
  if (least && min == null) min = Number(least[1]);
  const most = t.match(/(?:at most|maximum(?: of)?|max\.?|no more than|up to|not exceed(?:ing)?)\s+(\d{1,3})\s*(?:characters?|chars?)/);
  if (most && max == null) max = Number(most[1]);

  const none =
    /\b(letters and (numbers|digits) only|only (letters|alphabets?) and (numbers|digits)|alphanumeric( characters)? only|only alphanumeric|no (special )?(characters|symbols)|(special characters|symbols) (are )?not (allowed|permitted|accepted)|must not contain (any )?(special characters|symbols)|cannot contain (special characters|symbols)|consist(ing|s)? (only )?of (letters|alphabets?) and (numbers|digits))\b/.test(t);
  const required = !none && /\b(must|should|requires?d?|needs? to|at least|one or more|include)\b[^.;]{0,80}\b(special characters?|symbols?|non-?alphanumeric|punctuation)/.test(t);
  const listed = t.match(/(?:special characters?|symbols?)\s*(?:such as|like|from|:|\()\s*([!-/:-@[-`{-~ ]{2,40})/);
  const allowed = listed ? [...new Set(listed[1].replace(/\s+/g, "").split(""))].filter((c) => SYMBOLS.includes(c) || "^&+=.,".includes(c)).join("") : "";

  const symbols: PasswordPolicy["symbols"] = none ? "none" : required ? "required" : "allowed";
  if (min == null && max == null && symbols === "allowed") return null;
  const lo = Math.max(8, min ?? 12);
  const hi = Math.max(lo, Math.min(64, max ?? 64));
  return { min: lo, max: hi, symbols, ...(allowed ? { allowed } : {}) };
}

export function fitsPolicy(pw: string, p: PasswordPolicy): boolean {
  if (pw.length < p.min || pw.length > p.max) return false;
  if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw)) return false;
  const syms = pw.replace(/[A-Za-z0-9]/g, "");
  if (p.symbols === "none" && syms) return false;
  if (p.symbols === "required" && !syms) return false;
  if (p.allowed && [...syms].some((c) => !p.allowed!.includes(c))) return false;
  return true;
}

// a password that meets the policy: upper, lower and digits always (most sites ask for all three), a symbol only
// when the site takes one, no look-alike characters, 16 long when the site allows it
export function buildPassword(p: PasswordPolicy, randomInt: (n: number) => number): string {
  const length = Math.min(p.max, Math.max(p.min, 16));
  const symbols = p.symbols === "none" ? "" : p.allowed || SYMBOLS;
  const sets = [UPPER, LOWER, DIGITS, ...(symbols ? [symbols] : [])];
  const all = sets.join("");
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
