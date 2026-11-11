// most universities run their application on one of a handful of systems. each has its own way of moving through:
// a short playbook per system, given to the navigator when the page is one of them. dependency-free: the chrome
// extension bundles the engine, and this goes with it.

export type Platform = "slate" | "peoplesoft" | "liaison_cas" | "collegenet" | "salesforce" | "ellucian" | "applyyourself" | "ucas" | "dreamapply" | "kira";

const SIGNS: [Platform, RegExp, RegExp?][] = [
  // [platform, url, page text]
  ["liaison_cas", /liaisoncas\.com|\.liaisonedu\.com|cas\.liaison/i, /\b(gradcas|businesscas|liaison international)\b/i],
  ["slate", /\/apply\/(\?|frm|portal|status|login|account|page)|\/register\/|technolutions/i, /\b(powered by slate|technolutions)\b/i],
  ["peoplesoft", /\/ps[cp]\/|\/psp\/|peoplesoft|\/EMPLOYEE\/|\/CAMPUS\/HRMS|psc\/.*\/c\//i, /\b(peoplesoft|oracle)\b.*\b(campus|self service)\b/i],
  ["collegenet", /collegenet\.com|\/cgi-bin\/WebObjects/i, /\bcollegenet\b/i],
  ["salesforce", /\.my\.site\.com|\.force\.com|salesforce-sites|\/s\/(application|login)/i, /\blightning\b/i],
  ["ellucian", /bwskalog|bwskwpro|\/admissions\/apply|elluciancrmrecruit|ellucian/i, /\bellucian\b/i],
  ["applyyourself", /applyyourself\.com|hobsons|radius\.hobsons|apply\.\w+\.edu\/ayapp/i, /\bapply ?yourself\b/i],
  ["ucas", /ucas\.com/i],
  ["dreamapply", /dreamapply\.com/i, /\bdreamapply\b/i],
  ["kira", /kiratalent\.com/i],
];

export function platformOf(url: string, text = ""): Platform | null {
  for (const [p, u, t] of SIGNS) if (u.test(url) || (t && t.test(text.slice(0, 6000)))) return p;
  return null;
}

export const PLAYBOOK: Record<Platform, string> = {
  slate: `this portal runs on Slate. accounts: "Create an account" takes email, name and birthdate, then emails a temporary PIN or link (wait for the email). the first page after signing in lists applications: "Start New Application", then pick the application type, then the term, then "Create Application". the form is several pages; each ends with "Continue" (or "Save and Continue"); the left or top menu lists the pages. required questions show a red asterisk; the page won't move on until they're answered. "Review" or "Submit Application" is the last page, and the submit button is on it.`,
  peoplesoft: `this portal runs on PeopleSoft (Campus Solutions). code fields (country, state, school, program) have a magnifying-glass "Look up" link next to them: open it, search, and pick from the list. pages move with "Next" or "Save" at the bottom, sometimes a numbered step list at the top. dates are MM/DD/YYYY. after many changes the page reloads itself: wait for it. pop-up messages need "OK". the last step is usually "Application Summary" or "Submit Application" with a submit button.`,
  liaison_cas: `this portal is a Liaison CAS (GradCAS, BusinessCAS...). the order matters: first "Add Program" and choose the program and term, then fill the four quadrants (Personal Information, Academic History, Supporting Information, Program Materials). each section has its own "Save and Continue". transcripts are often entered course by course. submit from the "Submit Application" tab at the top once every quadrant shows complete.`,
  collegenet: `this portal runs on CollegeNET. the application's pages are listed in a side panel; each page ends with "Save and Continue" or "Next Page". the last page has a "Submit" button after a certification checkbox.`,
  salesforce: `this portal runs on Salesforce (Lightning). dropdowns are buttons that open a list: click, then click the option. dates are typed key by key in the format shown. sections are tabs or accordions: open each one. "Next" or "Save & Next" moves on; the submit button is on the last tab.`,
  ellucian: `this portal runs on Ellucian (Banner or Recruit). sign up with "Create Account", then "Start a new application" or "Fill Out Application", choose the application type and term. a checklist of sections follows; open each one, complete it, "Continue". "Application is complete" or "Submit" on the checklist finishes it.`,
  applyyourself: `this portal runs on ApplyYourself (Hobsons). after signing in, open the application; the "Navigation Menu" lists sections. complete each section and "Save and Continue". the last section is "Review & Submit" with the submit button.`,
  ucas: `this is UCAS. undergraduate applications to UK universities go through the UCAS Hub, not a school portal, and the agents don't submit through it. hand off with a note that this program applies through UCAS.`,
  dreamapply: `this portal runs on DreamApply. sections are in the left menu (Profile, Contacts, Education, Languages, Courses, Documents, Submit); fill each and "Save". choose the program under "Courses". "Submit" is the last menu item.`,
  kira: `this is a Kira Talent video or written assessment. it is timed and recorded: never start it. hand off: the applicant takes it themselves.`,
};

export function playbookFor(url: string, text = ""): string {
  const p = platformOf(url, text);
  return p ? PLAYBOOK[p] : "";
}

// a page, as the same page on every run and for every applicant: host and path with ids and numbers taken out,
// and the page's title. two applicants on the same step of the same portal get the same key
export function pageKey(url: string, title: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "";
  }
  const path = u.pathname
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:n")
    .replace(/[^a-z0-9/:._-]+/g, "")
    .slice(0, 120);
  // peoplesoft and slate keep the page in the query (?page=, ?cmd=, PAGE=)
  const q = ["page", "cmd", "PAGE", "tab", "section", "step", "frm"].map((k) => u.searchParams.get(k)).filter(Boolean).join(",").toLowerCase().slice(0, 60);
  const t = title.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z /&-]+/g, "").trim().slice(0, 60);
  return `${u.hostname.replace(/^www\./, "")}${path}${q ? `?${q}` : ""}#${t}`;
}
