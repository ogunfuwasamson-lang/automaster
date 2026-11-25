// which searches grow the checked programme list most usefully (agents/library): the (field, level, destination)
// pairs applicants ask for that have the fewest programmes on file. pure, so it's tested without a database.
import { fieldScore, levelOfDegree } from "@/lib/match-rules";
import { REGIONS } from "@/lib/profile";

export type Want = { fields: string[]; level: string | null; regions: string[] };
export type LibraryRow = { name: string; degree: string | null; school: string; region: string };
export type Target = { field: string; level: string; region: string; have: number; people: number };

// enough programmes in one field, level and destination that another search there adds little
export const ENOUGH = 12;

// when applicants' own choices are covered: the fields international applicants ask for most
const COMMON: string[] = [
  "Computer Science", "Data Science", "Business Administration", "Public Health", "Human Resource Management", "Finance",
  "Supply Chain Management", "Project Management", "Information Technology", "Economics", "Electrical Engineering",
  "Mechanical Engineering", "Civil Engineering", "Nursing", "International Relations", "Environmental Science",
  "Biotechnology", "Accounting", "Marketing", "Education", "Public Policy", "Cybersecurity", "Petroleum Engineering",
  "Agricultural Economics", "Social Work",
];
const COMMON_REGIONS = ["us", "uk", "canada", "europe", "australia_nz"];

const fold = (s: string) => s.trim().replace(/\s+/g, " ");

export function pickTargets(wants: Want[], rows: LibraryRow[], n: number): Target[] {
  // field (as most people wrote it) x level x destination, with how many asked
  const asked = new Map<string, Target>();
  const add = (field: string, level: string, region: string, people: number) => {
    const k = `${level}|${field.toLowerCase()}|${region}`;
    const e = asked.get(k);
    if (e) e.people += people;
    else asked.set(k, { field, level, region, have: 0, people });
  };
  for (const w of wants) {
    const level = w.level === "phd" || w.level === "undergraduate" ? w.level : "masters";
    const regions = (w.regions.length ? w.regions : ["us", "uk", "canada"]).filter((r) => REGIONS[r]).slice(0, 4);
    for (const raw of w.fields.slice(0, 3)) {
      const field = fold(raw);
      if (field.length < 3 || field.length > 60) continue;
      for (const r of regions) add(field, level, r, 1);
    }
  }
  for (const f of COMMON) for (const r of COMMON_REGIONS) add(f, "masters", r, 0);

  // what's on file for each
  const byRegion = new Map<string, LibraryRow[]>();
  for (const r of rows) byRegion.set(r.region, [...(byRegion.get(r.region) ?? []), r]);
  const out: Target[] = [];
  for (const t of asked.values()) {
    t.have = (byRegion.get(t.region) ?? []).filter((r) => (levelOfDegree(r.degree, r.name) ?? "masters") === t.level && fieldScore(`${r.name} ${r.degree ?? ""}`, [t.field]) >= 40).length;
    if (t.have < ENOUGH) out.push(t);
  }
  // the most asked-for first, then the thinnest; one search per field a day, so a day covers several fields
  out.sort((a, b) => b.people - a.people || a.have - b.have || a.field.localeCompare(b.field));
  const picked: Target[] = [];
  const fields = new Set<string>();
  for (const t of out) {
    if (picked.length >= n) break;
    if (fields.has(`${t.level}|${t.field.toLowerCase()}`)) continue;
    fields.add(`${t.level}|${t.field.toLowerCase()}`);
    picked.push(t);
  }
  // fewer distinct fields than searches: a second destination for the same fields
  for (const t of out) {
    if (picked.length >= n) break;
    if (!picked.includes(t)) picked.push(t);
  }
  return picked;
}
