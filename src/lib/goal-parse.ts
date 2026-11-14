// "a master's in finance, in Canada or the UK" -> level, fields and regions, for the matcher on the home page.
// a best guess from plain words: the visitor sees what was understood and can change any of it. pure.
import type { StudyLevel } from "@/lib/match-rules";

const REGION_WORDS: [RegExp, string][] = [
  [/\b(usa|u\.s\.a?|united states|america|american|us)\b/i, "us"],
  [/\bcanada|canadian\b/i, "canada"],
  [/\b(uk|u\.k\.|united kingdom|britain|british|england|scotland|wales|london)\b/i, "uk"],
  [/\b(europe|european|eu|germany|german|france|french|netherlands|dutch|holland|ireland|italy|spain|sweden|finland|denmark|norway|belgium|switzerland|swiss|austria|portugal|poland|hungary|czech)\b/i, "europe"],
  [/\b(australia|new zealand|nz|aussie)\b/i, "australia_nz"],
  [/\b(asia|china|chinese|japan|korea|singapore|hong kong|malaysia|taiwan|india)\b/i, "asia"],
  [/\b(middle east|uae|dubai|qatar|saudi|turkey|israel)\b/i, "middle_east"],
  [/\b(africa|south africa|rwanda|ghana|kenya|egypt|morocco)\b/i, "africa"],
  [/\b(latin america|brazil|mexico|chile|argentina|colombia)\b/i, "latin_america"],
];

const LEVEL_WORDS: [RegExp, StudyLevel][] = [
  [/\b(ph\.?\s?d|doctorate|doctoral|dphil)\b/i, "phd"],
  [/\b(master'?s?|msc|m\.sc|ms|ma|mba|mres|mphil|meng|llm|postgrad\w*|graduate)\b/i, "masters"],
  [/\b(bachelor'?s?|bsc|b\.sc|ba|beng|undergrad\w*|first degree|degree course)\b/i, "undergraduate"],
];

// words that aren't the subject
const FILLER = /\b(a|an|the|in|at|on|to|or|and|for|of|study|studying|program|programme|programs|programmes|course|courses|degree|degrees|abroad|fully|funded|funding|scholarship|scholarships|with|i|want|wanna|would|like|looking|my|do|get|apply|applying|university|universities|school|schools|college|online|full|time|part|country|countries|somewhere|anywhere|either)\b/gi;

export function parseGoal(text: string): { level: StudyLevel | null; fields: string[]; regions: string[] } {
  const t = ` ${text.replace(/[’`]/g, "'")} `;
  let level: StudyLevel | null = null;
  for (const [re, l] of LEVEL_WORDS) if (re.test(t)) {
    level = l;
    break;
  }
  if (!level && /\bmba\b/i.test(t)) level = "masters";
  const regions = [...new Set(REGION_WORDS.filter(([re]) => re.test(t)).map(([, r]) => r))];
  // the subject: what's left once level and place words are gone, split on commas and "or"/"and"
  let rest = t;
  for (const [re] of [...LEVEL_WORDS, ...REGION_WORDS]) rest = rest.replace(new RegExp(re.source, "gi"), " ");
  const mba = /\bmba\b/i.test(t);
  const fields = rest
    .split(/,|\/|\bor\b|\band\b|;|\./i)
    .map((s) => s.replace(FILLER, " ").replace(/[^A-Za-z&+ -]/g, " ").replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 2 && s.length <= 40)
    .map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()))
    .slice(0, 4);
  if (mba && !fields.length) fields.push("Business Administration");
  return { level, fields: [...new Set(fields)], regions };
}
