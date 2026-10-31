"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

// a quick, honest eligibility screen over the scholarship profiles. it never says "eligible" outright: rules have
// details a form can't capture, so results are "worth applying" or "check the rules", with the reason shown.
export type FinderItem = { slug: string; name: string; country: string; levels: string[]; funding: string };

const COMMONWEALTH = ["Bangladesh", "Ghana", "India", "Jamaica", "Kenya", "Malawi", "Malaysia", "Mauritius", "Mozambique", "Namibia", "Nigeria", "Pakistan", "Rwanda", "Sierra Leone", "South Africa", "Sri Lanka", "Tanzania", "Uganda", "Zambia", "Botswana", "Cameroon", "Gambia", "Lesotho", "Eswatini", "Togo", "Gabon", "Guyana", "Belize", "Fiji", "Papua New Guinea"];
const AFRICA = ["Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Ethiopia", "Uganda", "Tanzania", "Rwanda", "Zambia", "Zimbabwe", "Malawi", "Cameroon", "Senegal", "Côte d'Ivoire", "Morocco", "Tunisia", "Sierra Leone", "Gambia", "Botswana", "Namibia", "Mozambique", "Lesotho", "Eswatini", "Togo", "Benin", "Gabon", "Sudan", "Somalia", "Liberia", "Mauritius", "Algeria", "Angola", "Burkina Faso", "Mali", "Niger", "Chad", "DR Congo", "Burundi"];
const DEVELOPING_EXTRA = ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Indonesia", "Philippines", "Vietnam", "Cambodia", "Myanmar", "Laos", "Mongolia", "Bolivia", "Peru", "Colombia", "Ecuador", "Guatemala", "Honduras", "Nicaragua", "Haiti", "Jamaica", "Guyana", "Belize", "Fiji", "Papua New Guinea", "Jordan", "Lebanon", "Afghanistan", "Yemen", "Syria", "Iran", "Iraq", "Brazil", "Mexico", "Malaysia", "Turkey"];
const US_RESTRICTED = ["Afghanistan", "Burkina Faso", "Myanmar", "Chad", "Equatorial Guinea", "Eritrea", "Haiti", "Iran", "Laos", "Libya", "Mali", "Niger", "Republic of the Congo", "Sierra Leone", "Somalia", "South Sudan", "Sudan", "Syria", "Yemen", "Angola", "Antigua and Barbuda", "Benin", "Burundi", "Côte d'Ivoire", "Cuba", "Dominica", "Gabon", "Gambia", "Malawi", "Mauritania", "Nigeria", "Senegal", "Tanzania", "Togo", "Tonga", "Venezuela", "Zambia", "Zimbabwe"];
const OTHER = ["United States", "United Kingdom", "Canada", "Germany", "France", "China", "Japan", "South Korea", "Australia", "Saudi Arabia", "United Arab Emirates", "Russia", "Ukraine", "Poland", "Italy", "Spain", "Chile", "Argentina", "Thailand", "Singapore"];
const COUNTRIES = [...new Set([...AFRICA, ...DEVELOPING_EXTRA, ...COMMONWEALTH, ...OTHER])].sort();

type Verdict = { ok: boolean; why: string } | null;

function judge(slug: string, c: string, level: string, work: number, age: number): Verdict {
  const developing = AFRICA.includes(c) || DEVELOPING_EXTRA.includes(c);
  switch (slug) {
    case "chevening":
      if (c === "United Kingdom") return { ok: false, why: "Not open to British citizens" };
      return work >= 2 ? { ok: true, why: "Needs about two years' work experience; you have it" } : { ok: false, why: "Needs about two years' (2,800 hours) work experience" };
    case "commonwealth-masters":
      return COMMONWEALTH.includes(c) ? { ok: true, why: `${c} is a Commonwealth-eligible country; apply through your nominating agency` } : { ok: false, why: "Only for citizens of eligible Commonwealth countries" };
    case "mastercard-foundation":
      return AFRICA.includes(c) ? { ok: true, why: "For young Africans with financial need" } : { ok: false, why: "Only for African citizens" };
    case "daad":
      return developing && work >= 2 ? { ok: true, why: "EPOS suits professionals from developing countries with two years' experience" } : { ok: false, why: developing ? "EPOS usually needs two years' work experience; other DAAD awards may fit" : "EPOS is for developing countries; check other DAAD awards" };
    case "joint-japan-world-bank":
      return developing && work >= 3 ? { ok: true, why: "Development professionals with three years' experience" } : { ok: false, why: "Needs three years' development work and citizenship of a developing member country" };
    case "swedish-institute-global-professionals":
      return work >= 1.5 ? { ok: true, why: "Needs 3,000 hours' work and leadership; check that year's country list" } : { ok: false, why: "Needs at least 3,000 hours of work experience" };
    case "mext":
      return age < 35 ? { ok: true, why: "Research students must be under 35" } : { ok: false, why: "Research students must be under 35" };
    case "global-korea-scholarship":
      return age < 40 ? { ok: true, why: "Graduate applicants must be under 40" } : { ok: false, why: "Graduate applicants must be under 40" };
    case "turkiye-burslari":
      return (level === "PhD" ? age < 35 : age < 30) ? { ok: true, why: "Within the age limit for your level" } : { ok: false, why: "Under 30 for master's, under 35 for PhD" };
    case "chinese-government-scholarship":
      return (level === "PhD" ? age < 40 : age < 35) ? { ok: true, why: "Within the usual age limit" } : { ok: false, why: "Usually under 35 for master's and 40 for PhD" };
    case "rhodes":
      return age <= 28 ? { ok: true, why: "Age limits vary by constituency (often 18 to 24, up to 28 in some)" } : { ok: false, why: "Above most constituencies' age limits" };
    case "gates-cambridge":
      return c !== "United Kingdom" ? { ok: true, why: "Open to all non-UK citizens" } : { ok: false, why: "Not open to UK citizens" };
    case "fulbright-foreign-student":
      return US_RESTRICTED.includes(c) ? { ok: false, why: `${c} is under the 2026 US visa restrictions; check the US embassy first` } : { ok: true, why: "Apply through the Fulbright office in your country" };
    case "knight-hennessy":
      return US_RESTRICTED.includes(c) ? { ok: false, why: `${c} is under the 2026 US visa restrictions, which affect student visas` } : { ok: true, why: "Open to all nationalities; bachelor's within about seven years" };
    case "eiffel-excellence":
      return c !== "France" ? { ok: true, why: "Nominated by a French institution; partly funded" } : { ok: false, why: "Not open to French citizens" };
    case "stipendium-hungaricum":
      return { ok: developing, why: developing ? "Many developing countries are partners; check the list" : "Check whether your country is a partner" };
    default:
      return { ok: true, why: "Open to most nationalities; check the rules" };
  }
}

export function Finder({ items }: { items: FinderItem[] }) {
  const [country, setCountry] = useState("Nigeria");
  const [level, setLevel] = useState("Master's");
  const [work, setWork] = useState(2);
  const [age, setAge] = useState(27);
  const results = useMemo(
    () =>
      items
        .filter((s) => s.levels.includes(level))
        .map((s) => ({ s, v: judge(s.slug, country, level, work, age) }))
        .filter((r) => r.v)
        .sort((a, b) => Number(b.v!.ok) - Number(a.v!.ok)),
    [items, country, level, work, age],
  );
  const field = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] outline-none focus:border-accent";
  return (
    <div>
      <form className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
        <label className="text-[13.5px] font-medium">
          Citizenship
          <select className={`${field} mt-1.5`} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-[13.5px] font-medium">
          Level
          <select className={`${field} mt-1.5`} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option>{"Master's"}</option>
            <option>PhD</option>
            <option>{"Bachelor's"}</option>
          </select>
        </label>
        <label className="text-[13.5px] font-medium">
          Years of work experience
          <input type="number" min={0} max={40} step={0.5} className={`${field} mt-1.5`} value={work} onChange={(e) => setWork(Number(e.target.value))} />
        </label>
        <label className="text-[13.5px] font-medium">
          Age
          <input type="number" min={15} max={70} className={`${field} mt-1.5`} value={age} onChange={(e) => setAge(Number(e.target.value))} />
        </label>
      </form>
      <p className="mt-4 text-[14px] text-muted" aria-live="polite">
        {results.filter((r) => r.v!.ok).length} worth applying for, {results.filter((r) => !r.v!.ok).length} to check.
      </p>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {results.map(({ s, v }) => (
          <li key={s.slug} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-baseline sm:gap-6">
            <Link href={`/scholarships/${s.slug}`} className="font-serif text-[19px] hover:text-brand">
              {s.name}
            </Link>
            <span className="text-[14.5px] text-muted">
              {s.country}. {v!.why}.
            </span>
            <span className={`text-[13px] font-medium ${v!.ok ? "text-go" : "text-muted"}`}>{v!.ok ? "Worth applying" : "Check the rules"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
