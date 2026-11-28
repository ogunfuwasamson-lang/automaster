import "server-only";
import { publicProgrammes } from "@/lib/programme-data";
import { fieldScore } from "@/lib/match-rules";
import { nextDeadline, publishable } from "@/lib/programme-pages";
import { SCHOLARSHIPS } from "@/content/scholarships";
import { CALENDAR, phaseOf } from "@/content/scholarship-calendar";
import { openScholarships } from "@/lib/open-scholarships";
import { directory, schoolPath, COUNTRY_NAME } from "@/lib/directory";
import { arrivalSteps, visaSteps } from "@/lib/journey-steps";
import { regionOfCountry } from "@/lib/admission-rules";
import { REGIONS } from "@/lib/profile";
import { SITE } from "@/lib/site";

// Ivyward inside ChatGPT, Claude and other assistants (app/mcp): read-only tools over what Ivyward has checked on
// official pages: programmes, scholarships, deadlines, schools and student-visa steps. every answer links to the
// official page, plus one plain link to the matching Ivyward page. no accounts, nothing about the person is stored.
// review rules (OpenAI plugin guidelines, Anthropic connector review): no instructions to the model, no sales pitch
// in descriptions or answers, no prices or plans.

type Json = Record<string, unknown>;
export type ToolResult = { content: { type: "text"; text: string }[]; structuredContent?: Json; isError?: boolean };
type Tool = { name: string; title: string; description: string; inputSchema: Json; run: (args: Json) => Promise<ToolResult> };

const ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true };
const link = (path: string, campaign: string) => `${SITE.url}${path}${path.includes("?") ? "&" : "?"}utm_source=ai-app&utm_campaign=${campaign}`;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "Canada", "UK", "Europe", "the US" → a region key on Ivyward's list (lib/profile REGIONS)
function regionOf(where: string): string | null {
  const w = fold(where).replace(/^the /, "").trim();
  if (!w) return null;
  if (REGIONS[w]) return w;
  const named = Object.entries(REGIONS).find(([, name]) => fold(name) === w);
  if (named) return named[0];
  if (/^(us|usa|america|united states)/.test(w)) return "us";
  if (/^(uk|britain|england|scotland)/.test(w)) return "uk";
  if (/australia|new zealand/.test(w)) return "australia_nz";
  return regionOfCountry(where);
}

const ok = (text: string, structuredContent: Json): ToolResult => ({ content: [{ type: "text", text }], structuredContent });

export const TOOLS: Tool[] = [
  {
    name: "find_programmes",
    title: "Find university programmes",
    description:
      "Find bachelor's, master's and PhD programmes that international students can apply to, from Ivyward's list checked on each university's official pages: next deadline, tuition, whether full funding is realistic, GRE rules and whether an English-medium letter is accepted. Use for questions like 'funded master's in data science in Canada'.",
    inputSchema: {
      type: "object",
      properties: {
        field: { type: "string", description: "What to study, e.g. 'data science', 'public health', 'human resource management'" },
        level: { type: "string", enum: ["masters", "phd", "undergraduate"], description: "Degree level. Defaults to master's." },
        destination: { type: "string", description: "Country or region to study in, e.g. 'Canada', 'UK', 'Germany', 'Europe', 'Asia'" },
        fully_funded: { type: "boolean", description: "Only programmes where full funding is likely or possible" },
        without_gre: { type: "boolean", description: "Only programmes that don't require the GRE" },
      },
      required: ["field"],
      additionalProperties: false,
    },
    run: async (a) => {
      const field = str(a.field);
      const level = (str(a.level) || "masters") as "masters" | "phd" | "undergraduate";
      const where = str(a.destination);
      const region = where ? regionOf(where) : null;
      const today = new Date().toISOString().slice(0, 10);
      const all = (await publicProgrammes()).filter(publishable);
      // a one-country region (the US, the UK, Canada) or a region by name; otherwise the country, falling back to
      // its region when nothing in that country is checked yet ("Belgium" → Europe)
      const w = fold(where).replace(/^the /, "");
      const regionWord = !!region && (["us", "uk", "canada"].includes(region) || !!REGIONS[w] || Object.values(REGIONS).some((n) => fold(n) === w));
      const inCountry = all.filter((p) => !!p.country && (fold(p.country) === w || fold(p.country).includes(w)));
      const pool = !where ? all : regionWord ? all.filter((p) => p.region === region) : inCountry.length ? inCountry : region ? all.filter((p) => p.region === region) : [];
      const rows = pool
        .filter((p) => (p.level ?? "masters") === level)
        .filter((p) => !a.fully_funded || p.funding === "likely" || p.funding === "possible")
        .filter((p) => !a.without_gre || p.testPolicy === "not_required" || p.testPolicy === "optional" || p.testPolicy === "waivable")
        .map((p) => ({ p, score: fieldScore(`${p.name} ${p.degree}`, [field]) }))
        .filter((x) => x.score >= 40)
        .sort((x, y) => y.score - x.score || (nextDeadline(x.p, today) ?? "9999").localeCompare(nextDeadline(y.p, today) ?? "9999"))
        .slice(0, 8)
        .map(({ p }) => ({
          school: p.school,
          programme: p.name,
          degree: p.degree,
          country: p.country,
          next_deadline: nextDeadline(p, today),
          total_tuition_usd: p.tuition,
          full_funding: p.funding ?? "unknown",
          gre: p.testPolicy ?? "unknown",
          english_medium_letter: p.moi ?? "unknown",
          official_page: p.url,
          last_checked: p.checked,
        }));
      const start = link(`/match?goal=${encodeURIComponent(`${level === "phd" ? "a PhD" : level === "undergraduate" ? "a bachelor's" : "a master's"} in ${field}${where ? ` in ${where}` : ""}`)}`, "find_programmes");
      if (!rows.length)
        return ok(
          `No ${level} programmes in ${field}${where ? ` in ${where}` : ""} on Ivyward's checked list yet. Try a broader field or another country. This search on Ivyward: ${start}`,
          { programmes: [], ivyward: start },
        );
      // the degree only when it adds something short ("MSc"); some are stored as a sentence
      const deg = (r: (typeof rows)[number]) => (r.degree && r.degree.length <= 24 && !r.programme.toLowerCase().includes(r.degree.toLowerCase()) ? ` (${r.degree})` : "");
      const lines = rows.map((r) => `- ${r.programme}${deg(r)}, ${r.school}${r.country ? `, ${r.country}` : ""}. Next deadline: ${r.next_deadline ?? "see the school's site"}. Cost: ${r.total_tuition_usd ? `about $${r.total_tuition_usd.toLocaleString("en-US")} total tuition` : "see the school's site"}. Full funding: ${r.full_funding}.${r.official_page ? ` Official page: ${r.official_page}` : ""}`);
      return ok(
        `${rows.length} ${level} programme${rows.length === 1 ? "" : "s"} in ${field}${where ? ` in ${where}` : ""}, checked by Ivyward on each university's official pages (confirm details there before applying):\n${lines.join("\n")}\n\nMore matches for this search on Ivyward: ${start}`,
        { programmes: rows, ivyward: start },
      );
    },
  },
  {
    name: "find_scholarships",
    title: "Find scholarships for international students",
    description:
      "Find well-known scholarships international students can apply for, with who can apply, what they cover, the usual deadline window and the official page. Filter by the applicant's nationality, degree level and where they want to study.",
    inputSchema: {
      type: "object",
      properties: {
        nationality: { type: "string", description: "The applicant's citizenship, e.g. 'Nigeria', 'Pakistan', 'Kenya'" },
        level: { type: "string", enum: ["Bachelor's", "Master's", "PhD"], description: "Degree level" },
        destination: { type: "string", description: "Country to study in, e.g. 'United Kingdom', 'Germany'" },
      },
      additionalProperties: false,
    },
    run: async (a) => {
      const level = str(a.level);
      const where = fold(str(a.destination));
      const rows = SCHOLARSHIPS.filter((s) => !level || (s.levels as string[]).includes(level))
        .filter((s) => !where || fold(s.country).includes(where) || where.includes(fold(s.country)))
        .slice(0, 10)
        .map((s) => ({ name: s.name, study_in: s.country, funding: s.funding, levels: s.levels, who_can_apply: s.forWhom, deadline: s.deadline, official_page: s.url, ivyward_page: link(`/scholarships/${s.slug}`, "find_scholarships") }));
      const nat = str(a.nationality);
      const region = where ? regionOf(where) : null;
      const forNat = nat ? openScholarships(nat, region ? [region] : []).map((o) => ({ name: o.name, note: o.note, ivyward_page: link(o.href, "find_scholarships") })) : [];
      const lines = rows.map((r) => `- ${r.name} (${r.study_in}, ${r.funding}): ${r.who_can_apply}. Deadline: ${r.deadline} Official page: ${r.official_page}`);
      const extra = forNat.length ? `\n\nAlso open to citizens of ${nat}:\n${forNat.map((o) => `- ${o.name}: ${o.note}`).join("\n")}` : "";
      return ok(
        `${rows.length ? `Scholarships Ivyward tracks${level ? ` for ${level}` : ""}${where ? ` in ${str(a.destination)}` : ""}:\n${lines.join("\n")}` : "No tracked scholarships match those filters."}${extra}\n\nIvyward's scholarship finder: ${link("/tools/scholarship-finder", "find_scholarships")}`,
        { scholarships: rows, for_nationality: forNat },
      );
    },
  },
  {
    name: "scholarship_deadlines",
    title: "Scholarship deadlines now",
    description: "Which major international scholarships are open now, opening soon, or closed until the next round, with their dates as published.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => {
      const rows = CALENDAR.map((e) => ({ name: e.name, status: phaseOf(e), who: e.who, when: e.when, next_round: e.next ?? null, page: e.href.startsWith("http") ? e.href : link(e.href, "scholarship_deadlines") }));
      const by = (ph: string) => rows.filter((r) => r.status === ph);
      const section = (t: string, list: typeof rows) => (list.length ? `${t}:\n${list.map((r) => `- ${r.name}: ${r.when}${r.next_round ? ` (next round: ${r.next_round})` : ""}`).join("\n")}` : "");
      return ok([section("Open now", by("open")), section("Opening soon", by("soon")), section("Closed for this round", by("closed"))].filter(Boolean).join("\n\n") + `\n\nFull calendar: ${link("/scholarships/deadlines", "scholarship_deadlines")}`, { scholarships: rows });
    },
  },
  {
    name: "find_school",
    title: "Look up a university",
    description:
      "Look up a university or college in the United States, the United Kingdom, Canada, Australia, France or China from official registers: where it is, what kind of institution it is, its official website and admissions pages, and how international students apply.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "The school's name, e.g. 'University of Toronto'" } },
      required: ["name"],
      additionalProperties: false,
    },
    run: async (a) => {
      const q = fold(str(a.name));
      if (q.length < 3) return { content: [{ type: "text", text: "Give at least three letters of the school's name." }], isError: true };
      const all = await directory();
      const hits = all
        .map((s) => ({ s, at: [s.name, ...s.aliases].map((n) => fold(n)).reduce((best, n) => (n === q ? 0 : n.startsWith(q) ? Math.min(best, 1) : n.includes(q) ? Math.min(best, 2) : best), 9) }))
        .filter((x) => x.at < 9)
        .sort((x, y) => x.at - y.at || x.s.name.length - y.s.name.length)
        .slice(0, 5)
        .map(({ s }) => ({ name: s.name, country: COUNTRY_NAME[s.country], city: s.city, kind: s.kind, website: s.website, admissions: s.admissions ?? s.apply, register: s.recognition, ivyward_page: link(schoolPath(s), "find_school") }));
      if (!hits.length) return ok(`No school called "${str(a.name)}" in the registers Ivyward covers (US, UK, Canada, Australia, France, China).`, { schools: [] });
      return ok(hits.map((h) => `- ${h.name}, ${[h.city, h.country].filter(Boolean).join(", ")}. ${h.kind ?? ""} Website: ${h.website ?? "n/a"}. Admissions: ${h.admissions ?? "n/a"}. How international students apply: ${h.ivyward_page}`).join("\n"), { schools: hits });
    },
  },
  {
    name: "student_visa_steps",
    title: "Student visa and arrival steps",
    description:
      "The steps from an admission to the first day in school for a destination country: the student visa (with the government's official pages), then fees, travel and what to do on arrival. Covers the US, UK, Canada, Australia, France, China and Germany, with general steps elsewhere.",
    inputSchema: {
      type: "object",
      properties: { destination: { type: "string", description: "The country the student will study in, e.g. 'United Kingdom'" } },
      required: ["destination"],
      additionalProperties: false,
    },
    run: async (a) => {
      const where = str(a.destination);
      const v = visaSteps(where);
      const arrive = arrivalSteps(where);
      // Ivyward's own guide for the three biggest destinations (content/guides/after-admission)
      const r = regionOf(where);
      const guide = r === "uk" ? "/guides/uk-student-visa-after-admission" : r === "canada" ? "/guides/canada-study-permit-after-admission" : r === "us" ? "/guides/us-f1-student-visa-after-admission" : null;
      const text = `${v.name} for ${where}:\n${v.steps.map((s, i) => `${i + 1}. ${s.label}${s.href ? ` (${s.href})` : ""}`).join("\n")}\n\nAfter the visa: pay the deposit and tuition on the school's own payment page and keep the receipts, book housing, then your flight.\nOn arrival:\n${arrive.map((s) => `- ${s.label}${s.href ? ` (${s.href})` : ""}`).join("\n")}\n\nFees and processing times change: read them on the official pages.${guide ? `\nStep-by-step guide: ${link(guide, "student_visa_steps")}` : ""}`;
      return ok(text, { visa: v.name, visa_steps: v.steps, arrival_steps: arrive });
    },
  },
];

export const SERVER_INFO = { name: "ivyward", title: "Ivyward", version: "1.0.0" };
export const INSTRUCTIONS =
  "Ivyward's checked information for international students applying to universities abroad: programmes (deadlines, tuition, funding), scholarships, scholarship deadlines, university look-ups and student visa steps. Facts come from official pages that Ivyward's agents checked, and answers link to those pages.";

export const toolList = () => TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema, annotations: { title, ...ANNOTATIONS } }));
export const findTool = (name: string) => TOOLS.find((t) => t.name === name) ?? null;
