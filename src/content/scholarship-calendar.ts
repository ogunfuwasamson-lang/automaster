// when the big scholarships close for 2027 entry, checked 15 Nov 2026. exact dates only where the official
// page publishes them (Gates Cambridge timeline, Knight-Hennessy, Chevening, the CSC, ENS de Lyon for Eiffel);
// otherwise the usual window. re-check before each cycle and bump CALENDAR_CHECKED.

export const CALENDAR_CHECKED = "2026-11-15";

export type CalendarEntry = {
  name: string;
  href: string; // our profile, or the official page
  who: string;
  when: string; // what the applicant sees
  closes?: string; // ISO date of the published deadline, when there is one
  phase: "open" | "soon" | "closed"; // as checked; an exact `closes` date in the past always reads as closed
  next?: string; // for closed rounds: when the next one opens
};

export const CALENDAR: CalendarEntry[] = [
  // open now or closing soon
  { name: "Gates Cambridge (international round)", href: "/scholarships/gates-cambridge", who: "Non-UK citizens, any Cambridge postgraduate course", when: "8 December 2026 or 6 January 2027, depending on the course", closes: "2027-01-06", phase: "open" },
  { name: "Clarendon (Oxford)", href: "/scholarships/clarendon", who: "All nationalities, automatic with your Oxford application", when: "Your Oxford course's December or January deadline (the one marked for funding)", phase: "open" },
  { name: "Eiffel Excellence (France)", href: "/scholarships/eiffel-excellence", who: "International master's and PhD applicants, nominated by a French institution", when: "Institutions set internal deadlines in November and December 2026; results in April 2027", phase: "open" },
  { name: "Erasmus Mundus", href: "/scholarships/erasmus-mundus", who: "All nationalities", when: "Set by each programme, mostly October to February", phase: "open" },
  { name: "DAAD scholarships (Germany)", href: "/scholarships/daad", who: "International graduates; EPOS for professionals from developing countries", when: "Set by each programme, many between August and October; check the DAAD database for later ones", phase: "open" },
  { name: "Mastercard Foundation Scholars", href: "/scholarships/mastercard-foundation", who: "Young Africans with financial need", when: "Set by each partner university, often November to March", phase: "open" },
  { name: "Fulbright Foreign Student Program (USA)", href: "/scholarships/fulbright-foreign-student", who: "Non-US citizens, through their country's Fulbright office", when: "Set by each country, often February to October, more than a year ahead", phase: "open" },
  { name: "Lester B. Pearson (Toronto)", href: "/scholarships/lester-b-pearson", who: "International students finishing secondary school", when: "School nominations and Toronto applications are due in early to mid November 2026, so the round may already have closed: check the official page today", phase: "open" },
  { name: "Swedish Institute Scholarships for Global Professionals", href: "/scholarships/swedish-institute-global-professionals", who: "Professionals from eligible countries", when: "University application in mid-January 2027, then the SI application in February", phase: "soon" },
  { name: "Stipendium Hungaricum (Hungary)", href: "/scholarships/stipendium-hungaricum", who: "Citizens of partner countries", when: "Usually mid-January for a September start; your sending authority may set an earlier date", phase: "soon" },
  // opening in early 2027
  { name: "Türkiye Bursları", href: "/scholarships/turkiye-burslari", who: "All nationalities except Turkish, within age limits", when: "Usually January to February for an autumn start", phase: "soon" },
  { name: "Chinese Government Scholarship", href: "/scholarships/chinese-government-scholarship", who: "Non-Chinese citizens, through an embassy or university", when: "Usually January to April for a September start", phase: "soon" },
  { name: "Global Korea Scholarship", href: "/scholarships/global-korea-scholarship", who: "Non-Korean citizens, embassy or university track", when: "Usually February to March", phase: "soon" },
  { name: "MEXT embassy route (Japan)", href: "/scholarships/mext", who: "Non-Japanese citizens, through the Japanese embassy", when: "Usually April to May, for a start in 2028", phase: "soon" },
  // closed for 2027 entry
  { name: "Chevening", href: "/scholarships/chevening", who: "Citizens of Chevening-eligible countries", when: "Closed on 6 October 2026", closes: "2026-10-06", phase: "closed", next: "Opens again in early August 2027" },
  { name: "Knight-Hennessy (Stanford)", href: "/scholarships/knight-hennessy", who: "All nationalities", when: "Closed on 6 October 2026", closes: "2026-10-06", phase: "closed", next: "The 2028 cohort application opens in summer 2027" },
  { name: "Gates Cambridge (US round)", href: "/scholarships/gates-cambridge", who: "US citizens resident in the US", when: "Closed on 14 October 2026", closes: "2026-10-14", phase: "closed", next: "Opens again in September 2027" },
  { name: "Commonwealth Master's (UK)", href: "/scholarships/commonwealth-masters", who: "Citizens of eligible Commonwealth countries", when: "The CSC form closed on 20 October 2026", closes: "2026-10-20", phase: "closed", next: "Nominating agencies open from mid-2027" },
  { name: "Rhodes (Oxford)", href: "/scholarships/rhodes", who: "By constituency, or the Global round", when: "Most constituencies closed between July and October 2026", phase: "closed", next: "Next round mid-2027" },
];

const today = () => new Date().toISOString().slice(0, 10);

// an exact deadline that has passed is closed whatever the checked phase said
export function phaseOf(e: CalendarEntry, now = today()): CalendarEntry["phase"] {
  return e.closes && e.closes < now ? "closed" : e.phase;
}
