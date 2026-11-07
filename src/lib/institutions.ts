import "server-only";
import { admin } from "@/lib/supabase/admin";

// the official institution inventory (hed_institutions, loaded from national registries such as IPEDS). the research
// agents look a school up here before searching the web: the record gives the official name, whether the school is
// still open, and its official admissions, aid and application pages to start from.

export type Institution = {
  id: string;
  country: string;
  registry: string;
  registry_id: string;
  name: string;
  aliases: string[];
  region: string | null;
  city: string | null;
  type: string | null;
  control: string | null;
  highest_award: string | null;
  status: string;
  recognition: string | null;
  website: string | null;
  domain: string | null;
  admissions_url: string | null;
  financial_aid_url: string | null;
  application_url: string | null;
  net_price_url: string | null;
  international_url: string | null;
  school_id: string | null;
  checked_at: string;
};

const COLS =
  "id, country, registry, registry_id, name, aliases, region, city, type, control, highest_award, status, recognition, website, domain, admissions_url, financial_aid_url, application_url, net_price_url, international_url, school_id, checked_at";

// "https://www.gsb.stanford.edu/x" -> ["gsb.stanford.edu", "stanford.edu"]; never a bare suffix like "co.uk"
export function domainCandidates(url: string | null | undefined): string[] {
  if (!url?.trim()) return [];
  let host: string;
  try {
    host = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`).hostname.toLowerCase();
  } catch {
    return [];
  }
  host = host.replace(/^www\./, "");
  if (!host.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return [];
  const labels = host.split(".");
  const out: string[] = [];
  for (let i = 0; i < labels.length - 1; i++) {
    const d = labels.slice(i).join(".");
    // stop before public suffixes such as ac.uk, edu.ng, com.au
    if (labels.length - i === 2 && /^(ac|edu|co|com|gov|org|net|sch)$/.test(labels[i])) break;
    out.push(d);
  }
  return out;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/\bthe\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const statusRank = (s: string) => (s === "active" ? 0 : s === "candidate" || s === "unverified" ? 1 : 2);

function best(rows: Institution[], name?: string): Institution | null {
  if (!rows.length) return null;
  const want = name ? norm(name) : "";
  const score = (r: Institution) => {
    const names = [r.name, ...(r.aliases ?? [])].map(norm);
    const exact = want && names.includes(want) ? 0 : 1;
    const close = want && names.some((n) => n.startsWith(want) || want.startsWith(n)) ? 0 : 1;
    return statusRank(r.status) * 100 + exact * 10 + close;
  };
  return [...rows].sort((a, b) => score(a) - score(b))[0];
}

// find the registry record for a school: by website domain first (most reliable), then by official name or alias
export async function findInstitution(q: { name: string; url?: string | null; country?: string | null }): Promise<Institution | null> {
  const db = admin();
  const domains = domainCandidates(q.url);
  for (const d of domains) {
    const { data } = await db.from("hed_institutions").select(COLS).eq("domain", d).limit(20);
    const hit = best((data ?? []) as Institution[], q.name);
    if (hit) return hit;
  }
  const name = q.name.trim();
  if (name.length < 4) return null;
  const like = name.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: byName } = await db.from("hed_institutions").select(COLS).ilike("name", like).limit(10);
  let hit = best((byName ?? []) as Institution[], name);
  if (!hit) {
    const { data: byAlias } = await db.from("hed_institutions").select(COLS).contains("aliases", [name]).limit(10);
    hit = best((byAlias ?? []) as Institution[], name);
  }
  return hit;
}

// a short block the research prompt starts from
export function registryBrief(i: Institution): string {
  const lines = [
    `official registry record (${i.registry.toUpperCase()} ${i.registry_id}, checked ${i.checked_at.slice(0, 10)}):`,
    `- official name: ${i.name}${i.aliases?.length ? ` (also: ${i.aliases.slice(0, 4).join(", ")})` : ""}`,
    `- status: ${i.status}${i.recognition ? `; ${i.recognition}` : ""}`,
    `- location: ${[i.city, i.region, i.country].filter(Boolean).join(", ")}`,
    i.type || i.control ? `- type: ${[i.type, i.control?.replace(/_/g, " ")].filter(Boolean).join(", ")}${i.highest_award ? `; highest award: ${i.highest_award}` : ""}` : "",
    i.website ? `- website: ${i.website}` : "",
    i.admissions_url ? `- admissions: ${i.admissions_url}` : "",
    i.application_url ? `- apply: ${i.application_url}` : "",
    i.financial_aid_url ? `- financial aid: ${i.financial_aid_url}` : "",
    i.net_price_url ? `- net price calculator: ${i.net_price_url}` : "",
    i.international_url ? `- international students: ${i.international_url}` : "",
    "start from these official pages; they were published by the school to the registry. graduate admissions may live on a different page.",
  ];
  return lines.filter(Boolean).join("\n");
}

export const isDefunct = (i: Institution | null) => !!i && (i.status === "closed" || i.status === "merged");

// tie an Ivyward school to its registry record (first link wins) and fill the school's website if it has none
export async function linkSchool(schoolId: string, i: Institution): Promise<void> {
  const db = admin();
  if (!i.school_id) await db.from("hed_institutions").update({ school_id: schoolId }).eq("id", i.id).is("school_id", null);
  if (i.website) await db.from("schools").update({ website: i.website }).eq("id", schoolId).is("website", null);
}
