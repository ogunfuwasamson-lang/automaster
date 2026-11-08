// country name -> [ISO 3166 alpha-2, alpha-3], for portal boxes that take a code (peoplesoft's 3-letter
// country prompt). the countries applicants come from and apply to most; anything else is left as typed.
const CODES: Record<string, [string, string]> = {
  nigeria: ["NG", "NGA"], ghana: ["GH", "GHA"], kenya: ["KE", "KEN"], "south africa": ["ZA", "ZAF"], egypt: ["EG", "EGY"],
  ethiopia: ["ET", "ETH"], uganda: ["UG", "UGA"], tanzania: ["TZ", "TZA"], rwanda: ["RW", "RWA"], cameroon: ["CM", "CMR"],
  senegal: ["SN", "SEN"], "cote d'ivoire": ["CI", "CIV"], "ivory coast": ["CI", "CIV"], morocco: ["MA", "MAR"], tunisia: ["TN", "TUN"],
  algeria: ["DZ", "DZA"], zimbabwe: ["ZW", "ZWE"], zambia: ["ZM", "ZMB"], botswana: ["BW", "BWA"], namibia: ["NA", "NAM"],
  malawi: ["MW", "MWI"], mozambique: ["MZ", "MOZ"], angola: ["AO", "AGO"], "sierra leone": ["SL", "SLE"], liberia: ["LR", "LBR"],
  gambia: ["GM", "GMB"], "the gambia": ["GM", "GMB"], benin: ["BJ", "BEN"], togo: ["TG", "TGO"], niger: ["NE", "NER"], mali: ["ML", "MLI"],
  sudan: ["SD", "SDN"], somalia: ["SO", "SOM"], mauritius: ["MU", "MUS"],
  "united kingdom": ["GB", "GBR"], uk: ["GB", "GBR"], "great britain": ["GB", "GBR"], england: ["GB", "GBR"], scotland: ["GB", "GBR"], wales: ["GB", "GBR"],
  ireland: ["IE", "IRL"], france: ["FR", "FRA"], germany: ["DE", "DEU"], netherlands: ["NL", "NLD"], belgium: ["BE", "BEL"], spain: ["ES", "ESP"],
  portugal: ["PT", "PRT"], italy: ["IT", "ITA"], switzerland: ["CH", "CHE"], austria: ["AT", "AUT"], sweden: ["SE", "SWE"], norway: ["NO", "NOR"],
  denmark: ["DK", "DNK"], finland: ["FI", "FIN"], poland: ["PL", "POL"], greece: ["GR", "GRC"], turkey: ["TR", "TUR"], russia: ["RU", "RUS"], ukraine: ["UA", "UKR"],
  "united states": ["US", "USA"], usa: ["US", "USA"], "united states of america": ["US", "USA"], canada: ["CA", "CAN"], mexico: ["MX", "MEX"],
  brazil: ["BR", "BRA"], argentina: ["AR", "ARG"], chile: ["CL", "CHL"], colombia: ["CO", "COL"], peru: ["PE", "PER"], jamaica: ["JM", "JAM"],
  "trinidad and tobago": ["TT", "TTO"], india: ["IN", "IND"], pakistan: ["PK", "PAK"], bangladesh: ["BD", "BGD"], "sri lanka": ["LK", "LKA"], nepal: ["NP", "NPL"],
  china: ["CN", "CHN"], "hong kong": ["HK", "HKG"], taiwan: ["TW", "TWN"], japan: ["JP", "JPN"], "south korea": ["KR", "KOR"], korea: ["KR", "KOR"],
  singapore: ["SG", "SGP"], malaysia: ["MY", "MYS"], indonesia: ["ID", "IDN"], philippines: ["PH", "PHL"], vietnam: ["VN", "VNM"], thailand: ["TH", "THA"],
  "united arab emirates": ["AE", "ARE"], uae: ["AE", "ARE"], "saudi arabia": ["SA", "SAU"], qatar: ["QA", "QAT"], kuwait: ["KW", "KWT"], israel: ["IL", "ISR"],
  jordan: ["JO", "JOR"], lebanon: ["LB", "LBN"], iran: ["IR", "IRN"], iraq: ["IQ", "IRQ"], australia: ["AU", "AUS"], "new zealand": ["NZ", "NZL"],
};

export function countryCode(name: string, length: 2 | 3): string | null {
  const hit = CODES[name.trim().toLowerCase().replace(/\s+/g, " ")];
  return hit ? hit[length === 2 ? 0 : 1] : null;
}
