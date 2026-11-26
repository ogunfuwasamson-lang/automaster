// what comes after an admission, by destination country: the visa, fees, travel and the first days, as steps the
// applicant ticks off on their journey (lib/journey-map). general rules and the official pages for each, as the
// governments publish them (checked 26 nov 2026); amounts and dates that change are left to those pages.

export type Step = { id: string; label: string; href?: string };

const fold = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();

export function visaSteps(country: string | null | undefined): { name: string; steps: Step[]; guide?: string } {
  const c = fold(country);
  if (/united states|^usa?$/.test(c))
    return {
      name: "F-1 student visa",
      guide: "us-f1-student-visa-after-admission",
      steps: [
        { id: "doc", label: "Get your I-20 from the school (it asks for proof of funds)" },
        { id: "fee", label: "Pay the SEVIS I-901 fee", href: "https://www.fmjfee.com" },
        { id: "form", label: "Fill in the DS-160 visa form", href: "https://ceac.state.gov/genniv/" },
        { id: "interview", label: "Book and attend your visa interview", href: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html" },
        { id: "granted", label: "Visa granted" },
      ],
    };
  if (/united kingdom|^uk$|england|scotland|wales/.test(c))
    return {
      name: "UK Student visa",
      guide: "uk-student-visa-after-admission",
      steps: [
        { id: "doc", label: "Get your CAS from the university" },
        { id: "funds", label: "Hold the funds you need for 28 days in a row" },
        { id: "tb", label: "Take a TB test if your country is on the UK's list", href: "https://www.gov.uk/tb-test-visa" },
        { id: "apply", label: "Apply online and pay the Immigration Health Surcharge", href: "https://www.gov.uk/student-visa" },
        { id: "granted", label: "Visa granted" },
      ],
    };
  if (/canada/.test(c))
    return {
      name: "Canadian study permit",
      guide: "canada-study-permit-after-admission",
      steps: [
        { id: "doc", label: "Get your letter of acceptance (and a provincial attestation letter if your programme needs one)" },
        { id: "funds", label: "Gather your proof of funds" },
        { id: "apply", label: "Apply for the study permit online", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html" },
        { id: "bio", label: "Give your biometrics" },
        { id: "granted", label: "Study permit approved" },
      ],
    };
  if (/australia/.test(c))
    return {
      name: "Student visa (subclass 500)",
      steps: [
        { id: "doc", label: "Get your Confirmation of Enrolment (CoE)" },
        { id: "oshc", label: "Buy Overseas Student Health Cover" },
        { id: "apply", label: "Apply online in ImmiAccount", href: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500" },
        { id: "granted", label: "Visa granted" },
      ],
    };
  if (/france/.test(c))
    return {
      name: "Long-stay student visa (VLS-TS)",
      steps: [
        { id: "doc", label: "Complete your Campus France file, if your country uses Études en France", href: "https://www.campusfrance.org/en" },
        { id: "apply", label: "Apply for the student visa", href: "https://france-visas.gouv.fr" },
        { id: "granted", label: "Visa granted" },
      ],
    };
  if (/china/.test(c))
    return {
      name: "X1 student visa",
      steps: [
        { id: "doc", label: "Get your admission notice and JW201 or JW202 form" },
        { id: "apply", label: "Apply for the X1 visa at a Chinese embassy or consulate" },
        { id: "granted", label: "Visa granted" },
      ],
    };
  if (/germany/.test(c))
    return {
      name: "German student visa",
      steps: [
        { id: "funds", label: "Prove your funds, usually with a blocked account" },
        { id: "apply", label: "Apply at the German embassy or consulate", href: "https://www.auswaertiges-amt.de/en/visa-service" },
        { id: "granted", label: "Visa granted" },
      ],
    };
  return {
    name: "Student visa",
    steps: [
      { id: "doc", label: "Ask the school for the document its visa needs" },
      { id: "funds", label: "Gather your proof of funds" },
      { id: "apply", label: "Apply at the embassy or on the official visa site" },
      { id: "granted", label: "Visa granted" },
    ],
  };
}

export const FEE_STEPS: Step[] = [
  { id: "deposit", label: "Pay the deposit to hold your place, if the school asks for one" },
  { id: "tuition", label: "Pay tuition on the school's own payment page, and keep every receipt" },
];

export const TRAVEL_STEPS: Step[] = [
  { id: "housing", label: "Book where you'll live: school housing or private" },
  { id: "flight", label: "Book your flight once the visa is granted" },
  { id: "arrival", label: "Plan your arrival: airport pickup, first nights, a local SIM" },
];

export function arrivalSteps(country: string | null | undefined): Step[] {
  const c = fold(country);
  const extra: Step[] = /china/.test(c)
    ? [{ id: "permit", label: "Apply for your residence permit within 30 days of arriving" }]
    : /france/.test(c)
      ? [{ id: "permit", label: "Validate your VLS-TS online within 3 months of arriving", href: "https://administration-etrangers-en-france.interieur.gouv.fr" }]
      : /germany/.test(c)
        ? [{ id: "permit", label: "Register your address and apply for your residence permit" }]
        : [];
  return [{ id: "register", label: "Arrive, register with your school and go to orientation" }, ...extra, { id: "first", label: "Your first day in class" }];
}
