import "server-only";
import { admin } from "@/lib/supabase/admin";

// the public school directory: every degree-granting institution in the official registries Ivyward loads
// (IPEDS for the US; the OfS register, SFC, Medr and DfENI for the UK; IRCC's designated learning institutions for
// Canada; CRICOS for Australia; the MESR list for France; the Ministry of Education's list for China), one page each,
// with the official links an applicant needs. it's what search engines and AI assistants cite when someone asks how
// to apply to a school.

export type Country = "US" | "GB" | "CA" | "AU" | "FR" | "CN";
export const COUNTRIES: Country[] = ["US", "GB", "CA", "AU", "FR", "CN"];

export interface DirSchool {
  id: string;
  slug: string;
  country: Country;
  region: string; // US state, Canadian province or Australian state code; UK nation or region; French region; Chinese province
  regionSlug: string;
  name: string;
  aliases: string[];
  city: string | null;
  kind: string | null; // "Public, 4-year or above", "Scottish higher education institution", ...
  control: string | null;
  highest: string | null;
  recognition: string | null;
  registry: string;
  website: string | null;
  admissions: string | null;
  apply: string | null;
  international: string | null;
  aid: string | null;
  netPrice: string | null;
  checked: string;
  nameLocal: string | null; // the official name in the local script when the page leads with an English one (China)
  issues: string[]; // where a value came from outside the register ("website from Wikidata ...")
}

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico", GU: "Guam", VI: "U.S. Virgin Islands", AS: "American Samoa", MP: "Northern Mariana Islands",
};

export const CA_PROVINCES: Record<string, string> = {
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories",
  NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon",
};
export const AU_STATES: Record<string, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia", SA: "South Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory",
};

export const COUNTRY_NAME: Record<Country, string> = { US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia", FR: "France", CN: "China" };
// "the United States", "Canada": for running text
export const COUNTRY_IN: Record<Country, string> = { US: "the United States", GB: "the United Kingdom", CA: "Canada", AU: "Australia", FR: "France", CN: "China" };
export const COUNTRY_SLUG: Record<Country, string> = { US: "us", GB: "uk", CA: "canada", AU: "australia", FR: "france", CN: "china" };
export const SLUG_COUNTRY: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [COUNTRY_SLUG[c], c]));
// what a country's regions are called
export const REGION_WORD: Record<Country, string> = { US: "state", GB: "nation and region", CA: "province", AU: "state and territory", FR: "region", CN: "province" };

const REGISTRY: Record<string, string> = {
  ipeds: "U.S. Department of Education, Integrated Postsecondary Education Data System (IPEDS)",
  ofs: "Office for Students register (England)",
  sfc: "Scottish Funding Council list of fundable bodies",
  medr: "Medr register (Wales)",
  dfeni: "Department for the Economy, Northern Ireland",
  ircc_dli: "Immigration, Refugees and Citizenship Canada list of designated learning institutions",
  cricos: "Australian Government's CRICOS register (Department of Education)",
  mesr: "French Ministry of Higher Education and Research (MESR) list of higher education institutions",
  moe_cn: "Ministry of Education of China's national list of higher education institutions",
};
export const registryName = (r: string) => REGISTRY[r] ?? r;

// degree-level institutions only: an applicant abroad applies for a bachelor's, master's or doctorate
const US_LEVELS = ["Bachelor's degree", "Master's degree", "Doctor's degree", "Post-master's certificate", "Postbaccalaureate certificate"];

export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

export const regionLabel = (country: Country, region: string) => (country === "US" ? US_STATES[region] : country === "CA" ? CA_PROVINCES[region] : country === "AU" ? AU_STATES[region] : null) ?? region;
// region slugs: US state codes as before (/schools/us/ca); full names elsewhere (/schools/canada/ontario)
const regionSlugOf = (country: Country, region: string) => slugify(country === "US" || country === "GB" ? region : regionLabel(country, region));

// canada's list has career colleges, language schools and vocational centres too: the directory keeps universities,
// public colleges, cegeps, polytechnics and institutes, and any institution with graduate programs
const CA_KEEP = (r: Row) => r.type === "university" || /graduate programs: yes/.test(r.local_type ?? "") || (r.control === "public" && ["college", "polytechnic", "institute"].includes(r.type ?? ""));
// who's in the directory, country by country: degree-granting institutions
function inScope(r: Row): boolean {
  if (!r.region) return false;
  if (r.country === "US") return US_LEVELS.includes(r.highest_award ?? "") && !!r.website;
  if (r.country === "GB") return !!r.website;
  if (r.country === "CA") return CA_KEEP(r);
  if (r.country === "CN") return r.highest_award === "Bachelor's degree";
  return true; // australia (CRICOS degree providers only) and france (the ministry's list)
}

type Row = {
  id: string;
  country: Country;
  registry: string;
  registry_id: string;
  local_name: string | null;
  type: string | null;
  issues: string[] | null;
  name: string;
  aliases: string[] | null;
  region: string | null;
  city: string | null;
  local_type: string | null;
  control: string | null;
  highest_award: string | null;
  recognition: string | null;
  website: string | null;
  admissions_url: string | null;
  application_url: string | null;
  international_url: string | null;
  financial_aid_url: string | null;
  net_price_url: string | null;
  checked_at: string | null;
  updated_at: string | null;
};

async function load(): Promise<DirSchool[]> {
  const db = admin();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("hed_institutions")
      .select("id, country, registry, registry_id, type, issues, name, local_name, aliases, region, city, local_type, control, highest_award, recognition, website, admissions_url, application_url, international_url, financial_aid_url, net_price_url, checked_at, updated_at")
      .in("country", COUNTRIES)
      .eq("status", "active")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  const keep = rows.filter(inScope);
  // slugs: the name, unique within its country and region; a second school of the same name gets its city. a name
  // with no latin letters (a chinese name with no english one found) gets its register code
  const taken = new Set<string>();
  const out: DirSchool[] = [];
  for (const r of keep.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))) {
    const regionSlug = regionSlugOf(r.country, r.region!);
    let slug = slugify(r.name) || `${r.country.toLowerCase()}-${slugify(r.registry_id)}`;
    if (taken.has(`${r.country}/${regionSlug}/${slug}`)) slug = slugify(`${r.name} ${r.city ?? ""}`);
    if (taken.has(`${r.country}/${regionSlug}/${slug}`)) slug = `${slug}-${r.id.slice(0, 6)}`;
    taken.add(`${r.country}/${regionSlug}/${slug}`);
    out.push({
      id: r.id,
      slug,
      country: r.country,
      region: r.region!,
      regionSlug,
      name: r.name,
      aliases: r.aliases ?? [],
      city: r.city,
      kind: r.local_type,
      control: r.control,
      highest: r.highest_award,
      recognition: r.recognition,
      registry: r.registry,
      website: r.website,
      admissions: r.admissions_url,
      apply: r.application_url,
      international: r.international_url,
      aid: r.financial_aid_url,
      netPrice: r.net_price_url,
      checked: (r.checked_at ?? r.updated_at ?? new Date().toISOString()).slice(0, 10),
      nameLocal: r.country === "CN" ? (r.local_name ?? null) : null,
      issues: r.issues ?? [],
    });
  }
  return out;
}

// read once a day per server: the registries change a few times a year (kept in memory: the whole list is too big
// for next's data cache)
let memo: { at: number; data: Promise<DirSchool[]> } | null = null;
export function directory(): Promise<DirSchool[]> {
  if (!memo || Date.now() - memo.at > 86_400_000) {
    const data = load();
    memo = { at: Date.now(), data };
    data.catch(() => (memo = null));
  }
  return memo.data;
}

export async function regions(country: Country) {
  const all = (await directory()).filter((s) => s.country === country);
  const by = new Map<string, { region: string; slug: string; count: number }>();
  for (const s of all) {
    const r = by.get(s.regionSlug) ?? { region: s.region, slug: s.regionSlug, count: 0 };
    r.count++;
    by.set(s.regionSlug, r);
  }
  return [...by.values()].sort((a, b) => regionLabel(country, a.region).localeCompare(regionLabel(country, b.region)));
}

export async function inRegion(country: Country, regionSlug: string) {
  return (await directory()).filter((s) => s.country === country && s.regionSlug === regionSlug);
}

export async function findSchool(country: Country, regionSlug: string, slug: string) {
  return (await directory()).find((s) => s.country === country && s.regionSlug === regionSlug && s.slug === slug) ?? null;
}

export const schoolPath = (s: Pick<DirSchool, "country" | "regionSlug" | "slug">) => `/schools/${COUNTRY_SLUG[s.country]}/${s.regionSlug}/${s.slug}`;

// plain words for a registry's control value
export function controlLabel(c: string | null) {
  if (!c) return null;
  return { public: "Public", private_nonprofit: "Private, not-for-profit", private_forprofit: "Private, for-profit", private_for_profit: "Private, for-profit" }[c] ?? c.replace(/_/g, " ");
}

// a page we can stand behind in search: the school has official admissions links (US), is a university (UK), or has
// its official website (everywhere else: a page with no link to the school helps nobody)
export const worthIndexing = (s: DirSchool) => (s.country === "US" ? !!(s.admissions || s.apply) : s.country === "GB" ? /universit/i.test(`${s.name} ${s.kind ?? ""}`) : !!s.website);
