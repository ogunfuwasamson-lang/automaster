// new US student visas suspended by nationality: Presidential Proclamation 10998 (signed 16 dec 2025, in force
// 1 jan 2026). "full" countries: all visas. "partial": B, F, M, J and immigrant visas, so new F-1 student visas
// too. visas issued before 1 jan 2026 stand; a second, unaffected passport may still qualify; national-interest
// exceptions are case by case. lists as the State Department publishes them (checked 26 nov 2026); a later
// proclamation can change them. pure, so it's tested. used by the destination advice and the journey map.
export const US_SUSPENSION_SOURCE =
  "https://travel.state.gov/en/newsroom/visas/2026/suspension-of-visa-issuance-to-foreign-nationals-to-protect-the-security-of-the-united-states.html";
export const US_SUSPENSION_CHECKED = "26 November 2026";
export const US_SUSPENSION_GUIDE = "/guides/us-f1-student-visa-after-admission";

type Entry = { country: string; level: "full" | "partial"; match: RegExp };
// each matches the country or its demonym ("Nigerian", "Burkinabé"); ambiguous names ("Congolese", "Dominican")
// match nothing rather than guess
const LIST: Entry[] = [
  ["Afghanistan", "full", /afghan/],
  ["Burma", "full", /burm|myanmar/],
  ["Burkina Faso", "full", /burkina|burkinab/],
  ["Chad", "full", /\bchad/],
  ["Republic of the Congo", "full", /republic of (the )?congo|congo[- ]brazzaville|congo republic/],
  ["Equatorial Guinea", "full", /equatorial guinea|equatoguinean/],
  ["Eritrea", "full", /eritre/],
  ["Haiti", "full", /haiti/],
  ["Iran", "full", /\biran/],
  ["Laos", "full", /\blao(s|tian)?\b/],
  ["Libya", "full", /libya/],
  ["Mali", "full", /\bmali(an)?\b/],
  ["Niger", "full", /\bniger\b|nigerien/],
  ["Sierra Leone", "full", /sierra leon/],
  ["Somalia", "full", /somali/],
  ["South Sudan", "full", /south sudan/],
  ["Sudan", "full", /\bsudan/],
  ["Syria", "full", /syria/],
  ["Yemen", "full", /yemen/],
  ["Angola", "partial", /angol/],
  ["Antigua and Barbuda", "partial", /antigua/],
  ["Benin", "partial", /\benin/],
  ["Burundi", "partial", /burundi/],
  ["Côte d'Ivoire", "partial", /c[oô]te d.?ivoire|ivory coast|ivorian/],
  ["Cuba", "partial", /\bcuba/],
  ["Dominica", "partial", /\bdominica\b(?! republic)/],
  ["Gabon", "partial", /gabon/],
  ["The Gambia", "partial", /gambia/],
  ["Malawi", "partial", /malawi/],
  ["Mauritania", "partial", /mauritania/],
  ["Nigeria", "partial", /nigeria/],
  ["Senegal", "partial", /senegal/],
  ["Tanzania", "partial", /tanzania/],
  ["Togo", "partial", /\btogo/],
  ["Tonga", "partial", /\btonga/],
  ["Venezuela", "partial", /venezuela/],
  ["Zambia", "partial", /zambia/],
  ["Zimbabwe", "partial", /zimbabwe/],
].map(([country, level, match]) => ({ country, level, match }) as Entry);

export type UsSuspension = { country: string; level: "full" | "partial" };

export function usSuspension(citizenship: string | null | undefined): UsSuspension | null {
  const c = (citizenship ?? "").toLowerCase().normalize("NFC").trim();
  if (!c || /democratic|\bdrc\b|kinshasa/.test(c)) return null;
  const hit = LIST.find((e) => e.match.test(c));
  return hit ? { country: hit.country, level: hit.level } : null;
}

// "nationals of Nigeria", "nationals of the Gambia"
export const nationalsOf = (s: UsSuspension) => `nationals of ${s.country.replace(/^The /, "the ")}`;

// one sentence, for the advice, the map and the assistant
export function usSuspensionNote(s: UsSuspension): string {
  return `New US student visas for ${nationalsOf(s)} have been suspended since 1 January 2026 under a presidential proclamation. Visas issued before then still stand, and a second passport from an unaffected country may still qualify.`;
}
