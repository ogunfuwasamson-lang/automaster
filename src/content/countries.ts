// "study abroad from <country>" pages: what's open to citizens of each country, from lists we've checked.
// Commonwealth eligibility: CSC Master's list for 2027/28. US entry restrictions: the proclamation effective
// 1 January 2026 (NAFSA summary). Re-check both before each cycle.

export type Origin = {
  slug: string;
  name: string;
  demonym: string;
  region: "Africa" | "Asia" | "Latin America" | "Middle East" | "Caribbean" | "Europe and Central Asia" | "Europe" | "North America" | "Oceania";
  iso: string;
  exam?: string; // school-leaving English results many universities accept
  french?: boolean; // francophone: France and Québec are natural options
  spanish?: boolean;
  portuguese?: boolean;
  local?: string[]; // well-known home-country awards for study abroad
  guide?: string; // a dedicated guide on /guides
  highIncome?: boolean; // World Bank high-income: not eligible for EPOS or JJ/WBGSP
  // high-income countries whose students mostly fund themselves: the page leads with home funding, costs and
  // visas rather than development scholarships
  outbound?: boolean;
  english?: boolean; // majority English-speaking: usually exempt from English tests
  eu?: boolean; // EU or EEA citizen: no visa and local tuition elsewhere in the EU and EEA
  fundAbroad?: string; // home grants or loans that can pay for a full degree abroad (checked on the official sites)
};

export const COMMONWEALTH_ELIGIBLE = new Set([
  "Bangladesh", "Belize", "Botswana", "Dominica", "Eswatini", "Fiji", "Gabon", "The Gambia", "Ghana", "Grenada", "Guyana", "India", "Jamaica", "Kenya", "Kiribati", "Lesotho", "Malawi", "Malaysia", "Maldives", "Mauritius", "Montserrat", "Mozambique", "Namibia", "Nauru", "Nigeria", "Pakistan", "Papua New Guinea", "Rwanda", "Saint Helena", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "Sierra Leone", "Solomon Islands", "South Africa", "Sri Lanka", "Tanzania", "Togo", "Tonga", "Tuvalu", "Uganda", "Vanuatu", "Zambia",
]);

export const US_FULL = new Set(["Afghanistan", "Burkina Faso", "Myanmar", "Chad", "Equatorial Guinea", "Eritrea", "Haiti", "Iran", "Laos", "Libya", "Mali", "Niger", "Republic of the Congo", "Sierra Leone", "Somalia", "South Sudan", "Sudan", "Syria", "Yemen"]);
export const US_PARTIAL = new Set(["Angola", "Antigua and Barbuda", "Benin", "Burundi", "Côte d'Ivoire", "Cuba", "Dominica", "Gabon", "The Gambia", "Malawi", "Mauritania", "Nigeria", "Senegal", "Tanzania", "Togo", "Tonga", "Venezuela", "Zambia", "Zimbabwe"]);

const WAEC = "a credit in English in WAEC/WASSCE";
const CSEC = "English in CSEC";

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
  // more of Africa
  { slug: "angola", name: "Angola", demonym: "Angolan", region: "Africa", iso: "AO", portuguese: true },
  { slug: "dr-congo", name: "Democratic Republic of the Congo", demonym: "Congolese", region: "Africa", iso: "CD", french: true },
  { slug: "republic-of-the-congo", name: "Republic of the Congo", demonym: "Congolese", region: "Africa", iso: "CG", french: true },
  { slug: "burkina-faso", name: "Burkina Faso", demonym: "Burkinabè", region: "Africa", iso: "BF", french: true },
  { slug: "mali", name: "Mali", demonym: "Malian", region: "Africa", iso: "ML", french: true },
  { slug: "niger", name: "Niger", demonym: "Nigerien", region: "Africa", iso: "NE", french: true },
  { slug: "chad", name: "Chad", demonym: "Chadian", region: "Africa", iso: "TD", french: true },
  { slug: "guinea", name: "Guinea", demonym: "Guinean", region: "Africa", iso: "GN", french: true },
  { slug: "liberia", name: "Liberia", demonym: "Liberian", region: "Africa", iso: "LR", exam: WAEC },
  { slug: "madagascar", name: "Madagascar", demonym: "Malagasy", region: "Africa", iso: "MG", french: true },
  { slug: "burundi", name: "Burundi", demonym: "Burundian", region: "Africa", iso: "BI", french: true },
  { slug: "somalia", name: "Somalia", demonym: "Somali", region: "Africa", iso: "SO" },
  { slug: "south-sudan", name: "South Sudan", demonym: "South Sudanese", region: "Africa", iso: "SS" },
  { slug: "sudan", name: "Sudan", demonym: "Sudanese", region: "Africa", iso: "SD" },
  { slug: "eritrea", name: "Eritrea", demonym: "Eritrean", region: "Africa", iso: "ER" },
  { slug: "lesotho", name: "Lesotho", demonym: "Mosotho", region: "Africa", iso: "LS" },
  { slug: "eswatini", name: "Eswatini", demonym: "Swazi", region: "Africa", iso: "SZ" },
  { slug: "mauritius", name: "Mauritius", demonym: "Mauritian", region: "Africa", iso: "MU" },
  { slug: "gabon", name: "Gabon", demonym: "Gabonese", region: "Africa", iso: "GA", french: true },
  { slug: "mauritania", name: "Mauritania", demonym: "Mauritanian", region: "Africa", iso: "MR", french: true },
  { slug: "algeria", name: "Algeria", demonym: "Algerian", region: "Africa", iso: "DZ", french: true },
  { slug: "libya", name: "Libya", demonym: "Libyan", region: "Africa", iso: "LY" },
  { slug: "cabo-verde", name: "Cabo Verde", demonym: "Cabo Verdean", region: "Africa", iso: "CV", portuguese: true },
  // more of Asia
  { slug: "china", name: "China", demonym: "Chinese", region: "Asia", iso: "CN", local: ["China Scholarship Council (CSC) state-sponsored study abroad programmes"] },
  { slug: "south-korea", name: "South Korea", demonym: "South Korean", region: "Asia", iso: "KR", highIncome: true },
  { slug: "taiwan", name: "Taiwan", demonym: "Taiwanese", region: "Asia", iso: "TW", highIncome: true },
  { slug: "thailand", name: "Thailand", demonym: "Thai", region: "Asia", iso: "TH" },
  { slug: "myanmar", name: "Myanmar", demonym: "Burmese", region: "Asia", iso: "MM" },
  { slug: "cambodia", name: "Cambodia", demonym: "Cambodian", region: "Asia", iso: "KH" },
  { slug: "laos", name: "Laos", demonym: "Lao", region: "Asia", iso: "LA" },
  { slug: "mongolia", name: "Mongolia", demonym: "Mongolian", region: "Asia", iso: "MN" },
  { slug: "afghanistan", name: "Afghanistan", demonym: "Afghan", region: "Asia", iso: "AF" },
  { slug: "bhutan", name: "Bhutan", demonym: "Bhutanese", region: "Asia", iso: "BT" },
  { slug: "maldives", name: "Maldives", demonym: "Maldivian", region: "Asia", iso: "MV" },
  { slug: "singapore", name: "Singapore", demonym: "Singaporean", region: "Asia", iso: "SG", highIncome: true },
  { slug: "fiji", name: "Fiji", demonym: "Fijian", region: "Asia", iso: "FJ" },
  { slug: "papua-new-guinea", name: "Papua New Guinea", demonym: "Papua New Guinean", region: "Asia", iso: "PG" },
  // more of the Middle East
  { slug: "saudi-arabia", name: "Saudi Arabia", demonym: "Saudi", region: "Middle East", iso: "SA", highIncome: true },
  { slug: "united-arab-emirates", name: "United Arab Emirates", demonym: "Emirati", region: "Middle East", iso: "AE", highIncome: true },
  { slug: "qatar", name: "Qatar", demonym: "Qatari", region: "Middle East", iso: "QA", highIncome: true },
  { slug: "kuwait", name: "Kuwait", demonym: "Kuwaiti", region: "Middle East", iso: "KW", highIncome: true },
  { slug: "oman", name: "Oman", demonym: "Omani", region: "Middle East", iso: "OM", highIncome: true },
  { slug: "bahrain", name: "Bahrain", demonym: "Bahraini", region: "Middle East", iso: "BH", highIncome: true },
  { slug: "iran", name: "Iran", demonym: "Iranian", region: "Middle East", iso: "IR" },
  { slug: "iraq", name: "Iraq", demonym: "Iraqi", region: "Middle East", iso: "IQ" },
  { slug: "lebanon", name: "Lebanon", demonym: "Lebanese", region: "Middle East", iso: "LB", french: true },
  { slug: "syria", name: "Syria", demonym: "Syrian", region: "Middle East", iso: "SY" },
  { slug: "yemen", name: "Yemen", demonym: "Yemeni", region: "Middle East", iso: "YE" },
  { slug: "palestine", name: "Palestine", demonym: "Palestinian", region: "Middle East", iso: "PS" },
  // more of Europe and Central Asia
  { slug: "uzbekistan", name: "Uzbekistan", demonym: "Uzbek", region: "Europe and Central Asia", iso: "UZ", local: ["El-Yurt Umidi Foundation scholarships for study abroad"] },
  { slug: "kyrgyzstan", name: "Kyrgyzstan", demonym: "Kyrgyz", region: "Europe and Central Asia", iso: "KG" },
  { slug: "tajikistan", name: "Tajikistan", demonym: "Tajik", region: "Europe and Central Asia", iso: "TJ" },
  { slug: "turkmenistan", name: "Turkmenistan", demonym: "Turkmen", region: "Europe and Central Asia", iso: "TM" },
  { slug: "ukraine", name: "Ukraine", demonym: "Ukrainian", region: "Europe and Central Asia", iso: "UA" },
  { slug: "georgia", name: "Georgia", demonym: "Georgian", region: "Europe and Central Asia", iso: "GE" },
  { slug: "armenia", name: "Armenia", demonym: "Armenian", region: "Europe and Central Asia", iso: "AM" },
  { slug: "azerbaijan", name: "Azerbaijan", demonym: "Azerbaijani", region: "Europe and Central Asia", iso: "AZ" },
  { slug: "moldova", name: "Moldova", demonym: "Moldovan", region: "Europe and Central Asia", iso: "MD" },
  { slug: "serbia", name: "Serbia", demonym: "Serbian", region: "Europe and Central Asia", iso: "RS" },
  { slug: "albania", name: "Albania", demonym: "Albanian", region: "Europe and Central Asia", iso: "AL" },
  { slug: "bosnia-and-herzegovina", name: "Bosnia and Herzegovina", demonym: "Bosnian", region: "Europe and Central Asia", iso: "BA" },
  { slug: "north-macedonia", name: "North Macedonia", demonym: "North Macedonian", region: "Europe and Central Asia", iso: "MK" },
  { slug: "kosovo", name: "Kosovo", demonym: "Kosovar", region: "Europe and Central Asia", iso: "XK" },
  // more of Latin America and the Caribbean
  { slug: "argentina", name: "Argentina", demonym: "Argentine", region: "Latin America", iso: "AR", spanish: true },
  { slug: "ecuador", name: "Ecuador", demonym: "Ecuadorian", region: "Latin America", iso: "EC", spanish: true },
  { slug: "bolivia", name: "Bolivia", demonym: "Bolivian", region: "Latin America", iso: "BO", spanish: true },
  { slug: "venezuela", name: "Venezuela", demonym: "Venezuelan", region: "Latin America", iso: "VE", spanish: true },
  { slug: "paraguay", name: "Paraguay", demonym: "Paraguayan", region: "Latin America", iso: "PY", spanish: true },
  { slug: "uruguay", name: "Uruguay", demonym: "Uruguayan", region: "Latin America", iso: "UY", spanish: true, highIncome: true },
  { slug: "guatemala", name: "Guatemala", demonym: "Guatemalan", region: "Latin America", iso: "GT", spanish: true },
  { slug: "honduras", name: "Honduras", demonym: "Honduran", region: "Latin America", iso: "HN", spanish: true },
  { slug: "el-salvador", name: "El Salvador", demonym: "Salvadoran", region: "Latin America", iso: "SV", spanish: true },
  { slug: "nicaragua", name: "Nicaragua", demonym: "Nicaraguan", region: "Latin America", iso: "NI", spanish: true },
  { slug: "costa-rica", name: "Costa Rica", demonym: "Costa Rican", region: "Latin America", iso: "CR", spanish: true },
  { slug: "panama", name: "Panama", demonym: "Panamanian", region: "Latin America", iso: "PA", spanish: true, highIncome: true },
  { slug: "dominican-republic", name: "Dominican Republic", demonym: "Dominican", region: "Caribbean", iso: "DO", spanish: true },
  { slug: "cuba", name: "Cuba", demonym: "Cuban", region: "Caribbean", iso: "CU", spanish: true },
  { slug: "haiti", name: "Haiti", demonym: "Haitian", region: "Caribbean", iso: "HT", french: true },
  { slug: "trinidad-and-tobago", name: "Trinidad and Tobago", demonym: "Trinidadian and Tobagonian", region: "Caribbean", iso: "TT", exam: CSEC, highIncome: true },
  { slug: "guyana", name: "Guyana", demonym: "Guyanese", region: "Caribbean", iso: "GY", exam: CSEC },
  { slug: "barbados", name: "Barbados", demonym: "Barbadian", region: "Caribbean", iso: "BB", exam: CSEC, highIncome: true },
  { slug: "saint-lucia", name: "Saint Lucia", demonym: "Saint Lucian", region: "Caribbean", iso: "LC", exam: CSEC },
  { slug: "grenada", name: "Grenada", demonym: "Grenadian", region: "Caribbean", iso: "GD", exam: CSEC },
  { slug: "belize", name: "Belize", demonym: "Belizean", region: "Caribbean", iso: "BZ", exam: CSEC },
  { slug: "dominica", name: "Dominica", demonym: "Dominican (Dominica)", region: "Caribbean", iso: "DM", exam: CSEC },
  // high-income countries whose students mostly fund themselves. home funding checked 15 Nov 2026 on
  // studentaid.gov (federal loans at foreign schools), provincial Canada Student Loans pages, BAföG, DUO, CSN,
  // Lånekassen, borger.dk (SU) and Kela.
  { slug: "united-states", name: "United States", demonym: "American", region: "North America", iso: "US", highIncome: true, outbound: true, english: true, local: ["Fulbright U.S. Student Program", "Marshall Scholarships (UK)", "Mitchell Scholarship (Ireland)", "Rhodes Scholarships (US constituency)", "Schwarzman Scholars (Tsinghua University, China)"], fundAbroad: "US federal Direct Loans (not Pell Grants) can pay for a full degree at a foreign university that takes part in the federal loan programme" },
  { slug: "canada", name: "Canada", demonym: "Canadian", region: "North America", iso: "CA", highIncome: true, outbound: true, english: true, local: ["Fulbright Canada student awards for graduate study in the US", "Rhodes Scholarships (Canada constituency)"], fundAbroad: "Canada Student Loans can be used at designated universities outside Canada; check that yours is designated before you enrol" },
  { slug: "united-kingdom", name: "United Kingdom", demonym: "British", region: "Europe", iso: "GB", highIncome: true, outbound: true, english: true, local: ["US-UK Fulbright Commission postgraduate awards", "Kennedy Scholarships (Harvard and MIT)", "Frank Knox Fellowships (Harvard)", "Thouron Award (University of Pennsylvania)"] },
  { slug: "ireland", name: "Ireland", demonym: "Irish", region: "Europe", iso: "IE", highIncome: true, outbound: true, english: true, eu: true, local: ["Fulbright Ireland awards for graduate study in the US"] },
  { slug: "germany", name: "Germany", demonym: "German", region: "Europe", iso: "DE", highIncome: true, outbound: true, eu: true, local: ["DAAD scholarships for German graduates studying abroad", "Fulbright Germany awards for graduate study in the US"], fundAbroad: "Auslands-BAföG can fund a full degree elsewhere in the EU or in Switzerland, and part of a degree further afield" },
  { slug: "france", name: "France", demonym: "French", region: "Europe", iso: "FR", highIncome: true, outbound: true, eu: true, local: ["Fulbright France awards for graduate study in the US"] },
  { slug: "italy", name: "Italy", demonym: "Italian", region: "Europe", iso: "IT", highIncome: true, outbound: true, eu: true, local: ["Fulbright Italy awards for graduate study in the US"] },
  { slug: "spain", name: "Spain", demonym: "Spanish", region: "Europe", iso: "ES", highIncome: true, outbound: true, eu: true, local: ["Fulbright Spain awards for graduate study in the US"] },
  { slug: "netherlands", name: "Netherlands", demonym: "Dutch", region: "Europe", iso: "NL", highIncome: true, outbound: true, eu: true, local: ["Fulbright Netherlands awards for graduate study in the US"], fundAbroad: "Dutch student finance from DUO can go with you for a full degree abroad if you meet its residence rule (living in the Netherlands for three of the last six years)" },
  { slug: "belgium", name: "Belgium", demonym: "Belgian", region: "Europe", iso: "BE", highIncome: true, outbound: true, eu: true, local: ["Fulbright Belgium awards for graduate study in the US"] },
  { slug: "sweden", name: "Sweden", demonym: "Swedish", region: "Europe", iso: "SE", highIncome: true, outbound: true, eu: true, local: ["Fulbright Sweden awards for graduate study in the US"], fundAbroad: "CSN study grants and loans can fund a full degree at an approved university abroad" },
  { slug: "norway", name: "Norway", demonym: "Norwegian", region: "Europe", iso: "NO", highIncome: true, outbound: true, eu: true, local: ["Fulbright Norway awards for graduate study in the US"], fundAbroad: "Lånekassen grants and loans, including help with tuition, can fund a full degree at an approved university abroad" },
  { slug: "denmark", name: "Denmark", demonym: "Danish", region: "Europe", iso: "DK", highIncome: true, outbound: true, eu: true, local: ["Fulbright Denmark awards for graduate study in the US"], fundAbroad: "SU can be paid for a full degree abroad if you meet its conditions" },
  { slug: "finland", name: "Finland", demonym: "Finnish", region: "Europe", iso: "FI", highIncome: true, outbound: true, eu: true, local: ["Fulbright Finland awards for graduate study in the US"], fundAbroad: "Kela student financial aid can be paid for a full degree at a university abroad" },
  { slug: "austria", name: "Austria", demonym: "Austrian", region: "Europe", iso: "AT", highIncome: true, outbound: true, eu: true, local: ["Fulbright Austria awards for graduate study in the US"] },
  { slug: "portugal", name: "Portugal", demonym: "Portuguese", region: "Europe", iso: "PT", highIncome: true, outbound: true, eu: true, local: ["Fulbright Portugal awards for graduate study in the US"] },
  { slug: "poland", name: "Poland", demonym: "Polish", region: "Europe", iso: "PL", highIncome: true, outbound: true, eu: true, local: ["Fulbright Poland awards for graduate study in the US"] },
  { slug: "greece", name: "Greece", demonym: "Greek", region: "Europe", iso: "GR", highIncome: true, outbound: true, eu: true, local: ["Fulbright Greece awards for graduate study in the US"] },
  { slug: "australia", name: "Australia", demonym: "Australian", region: "Oceania", iso: "AU", highIncome: true, outbound: true, english: true, local: ["General Sir John Monash Scholarships", "Fulbright Australia scholarships for graduate study in the US", "Rhodes Scholarships (Australia constituency)"] },
  { slug: "new-zealand", name: "New Zealand", demonym: "New Zealander", region: "Oceania", iso: "NZ", highIncome: true, outbound: true, english: true, local: ["Fulbright New Zealand awards for graduate study in the US", "Rhodes Scholarships (New Zealand constituency)"] },
  { slug: "japan", name: "Japan", demonym: "Japanese", region: "Asia", iso: "JP", highIncome: true, outbound: true, local: ["JASSO scholarships for degree-seeking graduate study abroad", "Fulbright Japan awards for graduate study in the US"] },
  { slug: "israel", name: "Israel", demonym: "Israeli", region: "Middle East", iso: "IL", highIncome: true, outbound: true, local: ["Fulbright Israel awards for graduate study in the US", "Rhodes Scholarships (Israel constituency)"] },
];

// when the country pages were last checked (and the 85 added for every region of the world)
export const ORIGINS_UPDATED = "2026-11-15";

export const origin = (slug: string) => ORIGINS.find((o) => o.slug === slug);

// names that take "the" in a sentence ("study abroad from the United Kingdom")
const THE = new Set(["United States", "United Kingdom", "Netherlands", "United Arab Emirates", "Philippines", "Maldives", "Dominican Republic", "Democratic Republic of the Congo", "Republic of the Congo"]);
export const inText = (o: Pick<Origin, "name">) => (THE.has(o.name) ? `the ${o.name}` : o.name);
export const atStart = (o: Pick<Origin, "name">) => (THE.has(o.name) ? `The ${o.name}` : o.name);

export type Fit = { name: string; href: string; status: "open" | "check" | "no"; note: string };

// EPOS and JJ/WBGSP are for developing countries: every listed country except the high-income ones
const DEVELOPING = (o: Origin) => !o.highIncome && o.name !== "Chile";

// which major scholarships a citizen can go for, with the reason
export function fitsFor(o: Origin): Fit[] {
  // (status per award; the home-country exceptions are the award's own rules: Gates and Chevening exclude UK
  // citizens, MEXT Japanese, DAAD's inbound awards Germans, the Fulbright Foreign Student Program Americans)
  const africa = o.region === "Africa";
  const cw = COMMONWEALTH_ELIGIBLE.has(o.name);
  const usFull = US_FULL.has(o.name);
  const usPartial = US_PARTIAL.has(o.name);
  const us = usFull || usPartial;
  return [
    o.iso === "GB"
      ? { name: "Chevening (UK, master's)", href: "/scholarships/chevening", status: "no", note: "Not for British citizens" }
      : { name: "Chevening (UK, master's)", href: "/scholarships/chevening", status: "check", note: "Open to most countries. Confirm yours is on the Chevening country list" },
    { name: "Commonwealth Master's (UK)", href: "/scholarships/commonwealth-masters", status: cw ? "open" : "no", note: cw ? `${atStart(o)} is on the 2027/28 eligible list` : `${atStart(o)} is not on the 2027/28 eligible list` },
    { name: "Gates Cambridge (UK)", href: "/scholarships/gates-cambridge", status: o.iso === "GB" ? "no" : "open", note: o.iso === "GB" ? "Only for citizens of countries outside the UK" : "Open to all non-UK citizens" },
    { name: "Clarendon (Oxford)", href: "/scholarships/clarendon", status: "open", note: "Open to all nationalities, automatic consideration" },
    { name: "Rhodes (Oxford)", href: "/scholarships/rhodes", status: "check", note: "Check whether there's a constituency for your country, or apply in the Global round" },
    { name: "Erasmus Mundus (Europe)", href: "/scholarships/erasmus-mundus", status: "open", note: "Open to all nationalities" },
    o.iso === "DE"
      ? { name: "DAAD / EPOS (Germany)", href: "/scholarships/daad", status: "no", note: "For international students coming to Germany. German graduates can apply for DAAD's study-abroad scholarships instead" }
      : { name: "DAAD / EPOS (Germany)", href: "/scholarships/daad", status: DEVELOPING(o) ? "open" : "check", note: DEVELOPING(o) ? "EPOS is aimed at professionals from developing countries" : "Check DAAD's database for your country" },
    { name: "Mastercard Foundation Scholars", href: "/scholarships/mastercard-foundation", status: africa ? "open" : "no", note: africa ? "For young Africans with financial need" : "Only for African citizens" },
    { name: "Knight-Hennessy (Stanford)", href: "/scholarships/knight-hennessy", status: us ? "check" : "open", note: us ? "Open to all, but new US student visas are restricted for your nationality" : "Open to all nationalities" },
    o.iso === "US"
      ? { name: "Fulbright (USA)", href: "/scholarships/fulbright-foreign-student", status: "no", note: "For non-US citizens. Americans apply to the Fulbright U.S. Student Program to study abroad" }
      : { name: "Fulbright (USA)", href: "/scholarships/fulbright-foreign-student", status: "check", note: us ? "Its J-1 visa falls under the 2026 US restrictions for your nationality" : "Run by your country's Fulbright office or US embassy; check this year's call" },
    o.iso === "JP"
      ? { name: "MEXT (Japan)", href: "/scholarships/mext", status: "no", note: "Not for Japanese citizens" }
      : { name: "MEXT (Japan)", href: "/scholarships/mext", status: "open", note: "Through the Japanese embassy in your country" },
    { name: "GKS (South Korea)", href: "/scholarships/global-korea-scholarship", status: o.name === "South Korea" ? "no" : "open", note: o.name === "South Korea" ? "Not for South Korean citizens" : "Embassy or university track" },
    { name: "Türkiye Bursları", href: "/scholarships/turkiye-burslari", status: o.name === "Türkiye" ? "no" : "open", note: o.name === "Türkiye" ? "Not for Turkish citizens" : "All nationalities, within age limits" },
    { name: "Chinese Government Scholarship", href: "/scholarships/chinese-government-scholarship", status: o.name === "China" ? "no" : o.name === "Taiwan" ? "check" : "open", note: o.name === "China" ? "Not for Chinese citizens" : o.name === "Taiwan" ? "Check the current rules for applicants from Taiwan" : "Through the Chinese embassy or a university" },
    { name: "Stipendium Hungaricum (Hungary)", href: "/scholarships/stipendium-hungaricum", status: "check", note: "Check that your country is a partner this year" },
    { name: "JJ/WBGSP (development master's)", href: "/scholarships/joint-japan-world-bank", status: DEVELOPING(o) ? "open" : "no", note: DEVELOPING(o) ? "Needs three years of development work" : "For developing World Bank member countries" },
  ];
}

export function usLine(o: Origin) {
  if (o.iso === "US") return "US citizens don't need a student visa to study in the United States.";
  if (US_FULL.has(o.name)) return `${atStart(o)} is under full US entry restrictions since 1 January 2026, so new US student visas are suspended for ${o.demonym} nationals, with limited exceptions.`;
  if (US_PARTIAL.has(o.name)) return `${atStart(o)} is under partial US entry restrictions since 1 January 2026: new F, M and J (student and exchange) visas are suspended for ${o.demonym} nationals. Students already holding valid visas are not affected.`;
  return `${atStart(o)} is not on the US entry restriction lists that took effect on 1 January 2026, so ${o.demonym} students can apply for F-1 visas as usual.`;
}
