// the big named scholarships a citizenship opens, in the regions the applicant picked: the payoff for telling us
// their passport (lib/sharpen). from the country guides (content/countries), so it needs no lookup. pure.
import { ORIGINS, fitsFor } from "@/content/countries";

const WHERE: [RegExp, string[]][] = [
  [/\(UK|Oxford|Cambridge|Chevening|Commonwealth/, ["uk"]],
  [/Erasmus|DAAD|Hungary/, ["europe"]],
  [/Stanford|Fulbright|\(USA/, ["us"]],
  [/Japan|Korea|Chinese/, ["asia"]],
  [/Türkiye/, ["europe", "middle_east"]],
];

export const CITIZENSHIPS = ORIGINS.map((o) => o.name).sort((a, b) => a.localeCompare(b));

export function openScholarships(citizenship: string | null | undefined, regions: string[]): { name: string; href: string; note: string }[] {
  if (!citizenship) return [];
  const o = ORIGINS.find((x) => x.name.toLowerCase() === citizenship.toLowerCase() || x.demonym.toLowerCase() === citizenship.toLowerCase());
  if (!o) return [];
  return fitsFor(o)
    .filter((f) => f.status === "open")
    .filter((f) => {
      const where = WHERE.find(([re]) => re.test(f.name))?.[1];
      return !where || !regions.length || where.some((r) => regions.includes(r));
    })
    .map((f) => ({ name: f.name, href: f.href, note: f.note }));
}
