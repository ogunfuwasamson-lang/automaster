// where an applicant's chances look better than the places they picked (founder's call, 26 nov 2026: Ivyward AI
// should say so, and act on their answer). measured on Ivyward's checked programme list, for their field, level,
// funding need and tests: how many programmes fit, and how many of those make full funding realistic. no model
// calls. pure, so it's tested; lib/advice-server and agents/advisor use it.
import { fieldScore } from "@/lib/match-rules";
import { REGIONS } from "@/lib/profile";
import type { PublicProgramme } from "@/lib/programme-pages";

export type Want = {
  level: "masters" | "phd" | "undergraduate";
  fields: string[];
  regions: string[]; // what they picked
  fundingNeed: "full" | "partial" | "self" | null;
  gre: boolean; // has or will take the GRE/GMAT
  blocked?: string[]; // regions where they can't get a student visa now (lib/us-visa-suspension)
  blockedNote?: string; // why, in a sentence
};
export type Option = { region: string; name: string; fit: number; funded: number; score: number; scholarships: string[] };
export type Advice = { add: Option[]; picked: Option[]; text: string; title: string };

// short names for a sentence ("the US", "Europe")
const SHORT: Record<string, string> = { us: "the US", uk: "the UK", canada: "Canada", europe: "Europe", asia: "Asia", australia_nz: "Australia and New Zealand", middle_east: "the Middle East", africa: "Africa", latin_america: "Latin America" };
const NAME = (r: string) => SHORT[r] ?? REGIONS[r] ?? r;

export function destinationOptions(w: Want, programmes: PublicProgramme[], scholarshipsIn: (region: string) => string[] = () => []): Option[] {
  const fields = w.fields.filter(Boolean);
  if (!fields.length) return [];
  const fit = programmes.filter((p) => (p.level ?? "masters") === w.level && fieldScore(`${p.name} ${p.degree}`, fields) >= 40 && (w.gre || p.testPolicy !== "required"));
  return Object.keys(REGIONS)
    .filter((region) => !w.blocked?.includes(region))
    .map((region) => {
      const here = fit.filter((p) => p.region === region);
      const funded = here.filter((p) => p.funding === "likely" || p.funding === "possible");
      const named = scholarshipsIn(region);
      // what decides it: for someone who needs full funding, the programmes where it's realistic
      const score = (w.fundingNeed === "full" ? funded.length * 2 + here.filter((p) => p.funding === "likely").length : here.length) + Math.min(named.length, 3);
      return { region, name: NAME(region), fit: here.length, funded: funded.length, score, scholarships: named };
    })
    .sort((a, b) => b.score - a.score);
}

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const LEVEL = { masters: "master's", phd: "PhD", undergraduate: "bachelor's" } as const;

// advice only when another place is clearly better: at least 3 on the measure, and twice what their best pick has.
// a pick they can't get a student visa for doesn't count, and then anywhere better than their other picks is worth
// saying, with why first
export function adviceFor(w: Want, options: Option[]): Advice | null {
  if (!options.length || !w.regions.length) return null;
  const picked = options.filter((o) => w.regions.includes(o.region));
  const best = Math.max(0, ...picked.map((o) => o.score));
  const shut = w.regions.filter((r) => w.blocked?.includes(r));
  const enough = (o: Option) => o.score >= 3 && (shut.length ? o.score > best : o.score >= 2 * best + 1);
  const add = options.filter((o) => !w.regions.includes(o.region) && enough(o)).slice(0, 2);
  if (!add.length) return null;
  const full = w.fundingNeed === "full";
  const measure = (o: Option) => (full ? o.funded : o.fit);
  const what = full ? "where full funding is realistic" : "that fit you";
  const field = w.fields[0];
  const pickedNames = list(picked.map((o) => o.name));
  const top = add[0];
  const counts = add.map((o, i) => `${measure(o)}${i === 0 ? (measure(o) === 1 ? " programme" : " programmes") : ""} in ${o.name}`);
  const pickedCount = picked.reduce((s, o) => s + measure(o), 0);
  const named = top.scholarships.slice(0, 2);
  const course = `For a ${full ? "fully funded " : ""}${LEVEL[w.level]} in ${field}, Ivyward's checked list has ${list(counts)} ${what}`;
  const also = named.length ? ` ${list(named)} ${named.length === 1 ? "is" : "are"} also open to you there.` : "";
  const ask = `Add ${list(add.map((o) => o.name))} to your search?`;
  const places = list(add.map((o) => o.name));
  if (shut.length) {
    // why first, then what's open instead
    const note = w.blockedNote ? `${w.blockedNote} ` : "";
    const against = picked.length ? `, against ${pickedCount} in ${pickedNames}` : "";
    return { add, picked, text: `${note}${course}${against}.${also} ${ask}`, title: `Where to apply instead: ${places}` };
  }
  const text = `You picked ${pickedNames || "your regions"}. ${course}, against ${pickedCount} in your picks.${also} ${ask}`;
  return { add, picked, text, title: `Your chances look better in ${places}` };
}
