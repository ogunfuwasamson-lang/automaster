// telling whether an admission letter or email backs what the applicant said (founder's call, 26 nov 2026: an
// admission counts once a letter or the school's email backs it; then funding and visa preparation start).
// pure, so it's tested without a model or a database.

// the outcome label for an admission the school's email or the letter backs
export const VERIFIED = "admission_verified";

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TITLES = new Set(["mr", "mrs", "ms", "miss", "dr", "prof", "mx", "sir", "madam", "dear"]);
const nameTokens = (s: string) => fold(s).split(" ").filter((t) => t.length > 1 && !TITLES.has(t));

// the name on the letter is the applicant's: every part of the shorter name appears in the longer one, in any
// order ("OGUNFUWA Samson"), a middle name on one side only is fine. null when it can't be told: a name missing,
// or a letter that gives a first name only ("Dear Samson") that does appear on the profile.
export function sameName(onLetter: string | null | undefined, onProfile: string | null | undefined): boolean | null {
  const a = nameTokens(onLetter ?? "");
  const b = nameTokens(onProfile ?? "");
  if (!a.length || !b.length) return null;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (!short.every((t) => long.includes(t))) return false;
  if (short.length >= 2 || long.length === 1) return true;
  return null;
}

const SCHOOL_STOP = new Set(["the", "of", "and", "at", "in", "for", "de", "du", "la", "le", "des", "di", "del"]);
const schoolTokens = (s: string) => fold(s).split(" ").filter((t) => t && !SCHOOL_STOP.has(t));

// a school on the applicant's list that the letter names: the same words in any order, one name inside the other
// ("University of Toronto" in "University of Toronto, School of Graduate Studies"). the reading model also says
// whether a letter comes from the school it was checked against; this is for finding the application when the
// letter was added on its own.
export function sameSchool(onLetter: string, onList: string): boolean {
  const a = schoolTokens(onLetter);
  const b = schoolTokens(onList);
  if (!a.length || !b.length) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  // "University of Toronto" vs "Toronto Metropolitan University": all of the short name's words appear, but the
  // long one has a word of its own besides faculty words, so they're different schools
  const FACULTY = new Set(["school", "graduate", "studies", "faculty", "college", "business", "admissions", "office", "international"]);
  if (!short.every((t) => long.includes(t))) return false;
  return long.filter((t) => !short.includes(t)).every((t) => FACULTY.has(t));
}

export type OfferRead = {
  is_offer: boolean;
  conditional: boolean;
  school: string;
  applicant_name: string;
  same_school: boolean;
};

// whether the evidence confirms the admission, and why not when it doesn't (shown to the applicant)
export function verdict(
  read: OfferRead,
  ctx: { profileName: string | null; source: "letter" | "mail"; checkSchool: boolean },
): { ok: boolean; why: string } {
  if (!read.is_offer) return { ok: false, why: ctx.source === "mail" ? "no admission email from this school" : "this doesn't read as an offer of admission" };
  if (ctx.checkSchool && !read.same_school) return { ok: false, why: `the offer is from ${read.school || "another school"}` };
  // an email in their own inbox was sent to them; a letter could be anyone's, so its name must match
  if (ctx.source === "letter" && sameName(read.applicant_name, ctx.profileName) === false)
    return { ok: false, why: `the name on the letter (${read.applicant_name}) isn't the name on your profile` };
  return { ok: true, why: read.conditional ? "conditional offer" : "offer" };
}

// a gmail search for the school's admission email: from its domains or naming it, with offer words, last 2 years
export function admitQuery(domains: string[], school: string): string {
  const from = domains.filter(Boolean).map((d) => `from:${d}`);
  const who = [...from, school ? `"${school.replace(/"/g, "")}"` : ""].filter(Boolean);
  const words = ["admission", "admitted", "offer", "congratulations", '"pleased to inform"', '"pleased to offer"'];
  return `${who.length ? `(${who.join(" OR ")}) ` : ""}(${words.join(" OR ")}) newer_than:2y`;
}

// the destination country's region on the applicant's profile (lib/profile REGIONS keys), for a school added from a letter
const REGION_OF: Record<string, string> = {
  "united states": "us", usa: "us", "united kingdom": "uk", uk: "uk", england: "uk", scotland: "uk", wales: "uk", "northern ireland": "uk",
  canada: "canada", australia: "australia_nz", "new zealand": "australia_nz",
  germany: "europe", france: "europe", netherlands: "europe", ireland: "europe", italy: "europe", spain: "europe", sweden: "europe", finland: "europe",
  denmark: "europe", norway: "europe", belgium: "europe", switzerland: "europe", austria: "europe", poland: "europe", portugal: "europe",
  hungary: "europe", "czech republic": "europe", czechia: "europe", estonia: "europe", lithuania: "europe", latvia: "europe",
  china: "asia", japan: "asia", "south korea": "asia", korea: "asia", singapore: "asia", malaysia: "asia", "hong kong": "asia", taiwan: "asia", india: "asia", thailand: "asia",
  "united arab emirates": "middle_east", uae: "middle_east", qatar: "middle_east", "saudi arabia": "middle_east", turkey: "europe", turkiye: "europe",
  "south africa": "africa", ghana: "africa", nigeria: "africa", kenya: "africa", rwanda: "africa", egypt: "africa", morocco: "africa",
  brazil: "latin_america", mexico: "latin_america", chile: "latin_america", argentina: "latin_america", colombia: "latin_america",
};
export const regionOfCountry = (country: string | null | undefined): string | null => REGION_OF[fold(country ?? "")] ?? null;
