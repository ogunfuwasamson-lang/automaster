// "study abroad from <country>" pages: what's open to citizens of each country, from lists we've checked.
// Commonwealth eligibility: CSC Master's list for 2027/28. US entry restrictions: the proclamation effective
// 1 January 2026 (NAFSA summary). Re-check both before each cycle.

export type Origin = {
  slug: string;
  name: string;
  demonym: string;
  region: "Africa" | "Asia" | "Latin America" | "Middle East" | "Caribbean" | "Europe and Central Asia";
  iso: string;
  exam?: string; // school-leaving English results many universities accept
  french?: boolean; // francophone: France and Québec are natural options
  spanish?: boolean;
  portuguese?: boolean;
  local?: string[]; // well-known home-country awards for study abroad
  guide?: string; // a dedicated guide on /guides
};

export const COMMONWEALTH_ELIGIBLE = new Set([
  "Bangladesh", "Belize", "Botswana", "Dominica", "Eswatini", "Fiji", "Gabon", "The Gambia", "Ghana", "Grenada", "Guyana", "India", "Jamaica", "Kenya", "Kiribati", "Lesotho", "Malawi", "Malaysia", "Maldives", "Mauritius", "Montserrat", "Mozambique", "Namibia", "Nauru", "Nigeria", "Pakistan", "Papua New Guinea", "Rwanda", "Saint Helena", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "Sierra Leone", "Solomon Islands", "South Africa", "Sri Lanka", "Tanzania", "Togo", "Tonga", "Tuvalu", "Uganda", "Vanuatu", "Zambia",
]);

export const US_FULL = new Set(["Afghanistan", "Burkina Faso", "Myanmar", "Chad", "Equatorial Guinea", "Eritrea", "Haiti", "Iran", "Laos", "Libya", "Mali", "Niger", "Republic of the Congo", "Sierra Leone", "Somalia", "South Sudan", "Sudan", "Syria", "Yemen"]);
export const US_PARTIAL = new Set(["Angola", "Antigua and Barbuda", "Benin", "Burundi", "Côte d'Ivoire", "Cuba", "Dominica", "Gabon", "The Gambia", "Malawi", "Mauritania", "Nigeria", "Senegal", "Tanzania", "Togo", "Tonga", "Venezuela", "Zambia", "Zimbabwe"]);

const WAEC = "a credit in English in WAEC/WASSCE";

export const ORIGINS: Origin[] = [
  // Africa
  { slug: "nigeria", name: "Nigeria", demonym: "Nigerian", region: "Africa", iso: "NG", exam: `${WAEC} or NECO`, local: ["PTDF Overseas Scholarship Scheme (petroleum-related fields)"], guide: "scholarships-for-nigerian-and-african-students" },
  { slug: "ghana", name: "Ghana", demonym: "Ghanaian", region: "Africa", iso: "GH", exam: WAEC, guide: "scholarships-for-ghanaian-students" },
  { slug: "kenya", name: "Kenya", demonym: "Kenyan", region: "Africa", iso: "KE", exam: "a strong English grade in the KCSE", guide: "scholarships-for-kenyan-students" },
  { slug: "south-africa", name: "South Africa", demonym: "South African", region: "Africa", iso: "ZA", exam: "English Home Language or First Additional Language in the NSC (matric)" },
  { slug: "egypt", name: "Egypt", demonym: "Egyptian", region: "Africa", iso: "EG" },
  { slug: "ethiopia", name: "Ethiopia", demonym: "Ethiopian", region: "Africa", iso: "ET" },
  { slug: "uganda", name: "Uganda", demonym: "Ugandan", region: "Africa", iso: "UG", exam: "English in the UCE/UACE" },
  { slug: "tanzania", name: "Tanzania", demonym: "Tanzanian", region: "Africa", iso: "TZ", exam: "English in the CSEE/ACSEE" },
  { slug: "rwanda", name: "Rwanda", demonym: "Rwandan", region: "Africa", iso: "RW" },
  { slug: "zambia", name: "Zambia", demonym: "Zambian", region: "Africa", iso: "ZM" },
  { slug: "zimbabwe", name: "Zimbabwe", demonym: "Zimbabwean", region: "Africa", iso: "ZW", exam: "English at ZIMSEC O level" },
  { slug: "malawi", name: "Malawi", demonym: "Malawian", region: "Africa", iso: "MW", exam: "English in the MSCE" },
  { slug: "cameroon", name: "Cameroon", demonym: "Cameroonian", region: "Africa", iso: "CM", french: true },
  { slug: "senegal", name: "Senegal", demonym: "Senegalese", region: "Africa", iso: "SN", french: true },
  { slug: "cote-divoire", name: "Côte d'Ivoire", demonym: "Ivorian", region: "Africa", iso: "CI", french: true },
  { slug: "benin", name: "Benin", demonym: "Beninese", region: "Africa", iso: "BJ", french: true },
  { slug: "togo", name: "Togo", demonym: "Togolese", region: "Africa", iso: "TG", french: true },
  { slug: "sierra-leone", name: "Sierra Leone", demonym: "Sierra Leonean", region: "Africa", iso: "SL", exam: WAEC },
  { slug: "the-gambia", name: "The Gambia", demonym: "Gambian", region: "Africa", iso: "GM", exam: WAEC },
  { slug: "botswana", name: "Botswana", demonym: "Botswana", region: "Africa", iso: "BW", exam: "English in the BGCSE" },
  { slug: "namibia", name: "Namibia", demonym: "Namibian", region: "Africa", iso: "NA" },
  { slug: "mozambique", name: "Mozambique", demonym: "Mozambican", region: "Africa", iso: "MZ", portuguese: true },
  { slug: "morocco", name: "Morocco", demonym: "Moroccan", region: "Africa", iso: "MA", french: true },
  { slug: "tunisia", name: "Tunisia", demonym: "Tunisian", region: "Africa", iso: "TN", french: true },
  // Asia
  { slug: "india", name: "India", demonym: "Indian", region: "Asia", iso: "IN", exam: "English in CBSE or ISC Class 12", local: ["Fulbright-Nehru Master's Fellowships (USIEF)", "Inlaks Shivdasani Foundation Scholarships", "JN Tata Endowment loan scholarships"], guide: "scholarships-for-indian-students" },
  { slug: "pakistan", name: "Pakistan", demonym: "Pakistani", region: "Asia", iso: "PK", local: ["Fulbright Pakistan (USEFP)", "Higher Education Commission (HEC) overseas scholarships"], guide: "scholarships-for-pakistani-students" },
  { slug: "bangladesh", name: "Bangladesh", demonym: "Bangladeshi", region: "Asia", iso: "BD" },
  { slug: "sri-lanka", name: "Sri Lanka", demonym: "Sri Lankan", region: "Asia", iso: "LK" },
  { slug: "nepal", name: "Nepal", demonym: "Nepali", region: "Asia", iso: "NP" },
  { slug: "indonesia", name: "Indonesia", demonym: "Indonesian", region: "Asia", iso: "ID", local: ["LPDP scholarships (Indonesia Endowment Fund for Education)"] },
  { slug: "philippines", name: "Philippines", demonym: "Filipino", region: "Asia", iso: "PH" },
  { slug: "vietnam", name: "Vietnam", demonym: "Vietnamese", region: "Asia", iso: "VN" },
  { slug: "malaysia", name: "Malaysia", demonym: "Malaysian", region: "Asia", iso: "MY" },
  // Middle East, Europe and Central Asia
  { slug: "turkiye", name: "Türkiye", demonym: "Turkish", region: "Middle East", iso: "TR", local: ["Ministry of National Education (YLSY) study-abroad scholarships"] },
  { slug: "jordan", name: "Jordan", demonym: "Jordanian", region: "Middle East", iso: "JO" },
  { slug: "kazakhstan", name: "Kazakhstan", demonym: "Kazakhstani", region: "Europe and Central Asia", iso: "KZ", local: ["Bolashak International Scholarship"] },
  // Latin America and the Caribbean
  { slug: "brazil", name: "Brazil", demonym: "Brazilian", region: "Latin America", iso: "BR", portuguese: true, local: ["CAPES scholarships for postgraduate study abroad"] },
  { slug: "mexico", name: "Mexico", demonym: "Mexican", region: "Latin America", iso: "MX", spanish: true },
  { slug: "colombia", name: "Colombia", demonym: "Colombian", region: "Latin America", iso: "CO", spanish: true, local: ["COLFUTURO loan-scholarships"] },
  { slug: "peru", name: "Peru", demonym: "Peruvian", region: "Latin America", iso: "PE", spanish: true, local: ["PRONABEC scholarships"] },
  { slug: "chile", name: "Chile", demonym: "Chilean", region: "Latin America", iso: "CL", spanish: true, local: ["ANID Becas Chile"] },
  { slug: "jamaica", name: "Jamaica", demonym: "Jamaican", region: "Caribbean", iso: "JM", exam: "English in CSEC" },
];

export const origin = (slug: string) => ORIGINS.find((o) => o.slug === slug);

export type Fit = { name: string; href: string; status: "open" | "check" | "no"; note: string };

const DEVELOPING = (o: Origin) => !["Chile"].includes(o.name); // every listed country except high-income Chile counts for EPOS and JJ/WBGSP

// which major scholarships a citizen can go for, with the reason
export function fitsFor(o: Origin): Fit[] {
  const africa = o.region === "Africa";
  const cw = COMMONWEALTH_ELIGIBLE.has(o.name);
  const usFull = US_FULL.has(o.name);
  const usPartial = US_PARTIAL.has(o.name);
  const us = usFull || usPartial;
  return [
    { name: "Chevening (UK, master's)", href: "/scholarships/chevening", status: "check", note: "Open to most countries. Confirm yours is on the Chevening country list" },
    { name: "Commonwealth Master's (UK)", href: "/scholarships/commonwealth-masters", status: cw ? "open" : "no", note: cw ? `${o.name} is on the 2027/28 eligible list` : `${o.name} is not on the 2027/28 eligible list` },
    { name: "Gates Cambridge (UK)", href: "/scholarships/gates-cambridge", status: "open", note: "Open to all non-UK citizens" },
    { name: "Clarendon (Oxford)", href: "/scholarships/clarendon", status: "open", note: "Open to all nationalities, automatic consideration" },
    { name: "Rhodes (Oxford)", href: "/scholarships/rhodes", status: "check", note: "Check whether there's a constituency for your country, or apply in the Global round" },
    { name: "Erasmus Mundus (Europe)", href: "/scholarships/erasmus-mundus", status: "open", note: "Open to all nationalities" },
    { name: "DAAD / EPOS (Germany)", href: "/scholarships/daad", status: DEVELOPING(o) ? "open" : "check", note: DEVELOPING(o) ? "EPOS is aimed at professionals from developing countries" : "Check DAAD's database for your country" },
    { name: "Mastercard Foundation Scholars", href: "/scholarships/mastercard-foundation", status: africa ? "open" : "no", note: africa ? "For young Africans with financial need" : "Only for African citizens" },
    { name: "Knight-Hennessy (Stanford)", href: "/scholarships/knight-hennessy", status: us ? "check" : "open", note: us ? "Open to all, but new US student visas are restricted for your nationality" : "Open to all nationalities" },
    { name: "Fulbright (USA)", href: "/scholarships/fulbright-foreign-student", status: us ? "check" : "check", note: us ? "Its J-1 visa falls under the 2026 US restrictions for your nationality" : "Run by your country's Fulbright office or US embassy; check this year's call" },
    { name: "MEXT (Japan)", href: "/scholarships/mext", status: "open", note: "Through the Japanese embassy in your country" },
    { name: "GKS (South Korea)", href: "/scholarships/global-korea-scholarship", status: "open", note: "Embassy or university track" },
    { name: "Türkiye Bursları", href: "/scholarships/turkiye-burslari", status: o.name === "Türkiye" ? "no" : "open", note: o.name === "Türkiye" ? "Not for Turkish citizens" : "All nationalities, within age limits" },
    { name: "Chinese Government Scholarship", href: "/scholarships/chinese-government-scholarship", status: "open", note: "Through the Chinese embassy or a university" },
    { name: "Stipendium Hungaricum (Hungary)", href: "/scholarships/stipendium-hungaricum", status: "check", note: "Check that your country is a partner this year" },
    { name: "JJ/WBGSP (development master's)", href: "/scholarships/joint-japan-world-bank", status: DEVELOPING(o) ? "open" : "no", note: DEVELOPING(o) ? "Needs three years of development work" : "For developing World Bank member countries" },
  ];
}

export function usLine(o: Origin) {
  if (US_FULL.has(o.name)) return `${o.name} is under full US entry restrictions since 1 January 2026, so new US student visas are suspended for ${o.demonym} nationals, with limited exceptions.`;
  if (US_PARTIAL.has(o.name)) return `${o.name} is under partial US entry restrictions since 1 January 2026: new F, M and J (student and exchange) visas are suspended for ${o.demonym} nationals. Students already holding valid visas are not affected.`;
  return `${o.name} is not on the US entry restriction lists that took effect on 1 January 2026, so ${o.demonym} students can apply for F-1 visas as usual.`;
}
