// most universities run their application on one of a handful of systems. each has its own way of moving through:
// a short playbook per system, given to the navigator when the page is one of them. dependency-free: the chrome
// extension bundles the engine, and this goes with it.

export type Platform = "slate" | "peoplesoft" | "liaison_cas" | "collegenet" | "salesforce" | "ellucian" | "applyyourself" | "ucas" | "dreamapply" | "kira" | "sits" | "studielink" | "uni_assist";

const SIGNS: [Platform, RegExp, RegExp?][] = [
  // [platform, url, page text]
  ["liaison_cas", /liaisoncas\.com|\.liaisonedu\.com|cas\.liaison|cas\.myliaison\.com/i, /\b(gradcas|businesscas|liaison international)\b/i],
  ["studielink", /studielink\.nl/i, /\bstudielink\b.*\b(enrol|inschrijving|verzoek tot inschrijving)/i],
  ["uni_assist", /uni-assist\.de|my\.uni-assist/i, /\bmy ?assist\b/i],
  ["sits", /sits\.urd|\/urd\/sits|siw_(ipp|lgn|portal|sso)|e-?vision/i, /\b(e:vision|tribal sits)\b/i],
  ["slate", /\/apply\/(\?|frm|portal|status|login|account|page)|\/register\/|technolutions|\/account\/(login|register|reset)\?r=/i, /\b(powered by slate|technolutions)\b/i],
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
  sits: `this portal runs on SITS e:Vision (many UK and Irish universities). new applicants "Register" or "Create an account" with email, name and date of birth; an activation link is emailed. after signing in, "Apply" or "Start a new application", search the course, and pick the entry year and mode (full-time). the application is a list of sections with a status each (Incomplete, Complete): open each incomplete one, fill it, "Save and continue" or "Next". "Submit" appears once every section shows complete.`,
  studielink: `this is Studielink, the Dutch national enrolment system. Dutch universities ask for a Studielink enrolment first: create a Studielink account (email, name, date of birth, nationality), confirm the email, then "Add enrolment" and choose the university, the programme and the start date. after that the university emails a link to its own portal, where the documents go. never leave Studielink for DUO (student finance) or other government sites: they are not part of the application.`,
  uni_assist: `this is uni-assist (My assist), which checks international applications for many German universities. "Register" with email and password, confirm the email, fill in personal details, then "Search for a programme", pick the university and programme and "Add to applications". upload the documents under each application, then "Submit". uni-assist charges its own fee at the end: stop there.`,
};

// how each system's accounts work: where the create-account and sign-in pages are, and what the portal sends to
// confirm the email. used when the usual buttons aren't on the page (slate hides "create an account" behind a
// link on its login page; salesforce sites keep it at /s/login/SelfRegister)
export type AccountWay = { create: string; signIn: string; confirm: "pin" | "link" | "code" | "none" | "varies" };
export const ACCOUNT: Partial<Record<Platform, AccountWay>> = {
  slate: { create: "Create an account", signIn: "Log in", confirm: "pin" },
  peoplesoft: { create: "Create Account / New User", signIn: "Sign In", confirm: "varies" },
  liaison_cas: { create: "Create an Account", signIn: "Sign In", confirm: "none" },
  salesforce: { create: "Register / Sign Up", signIn: "Log In", confirm: "link" },
  ellucian: { create: "Create Account", signIn: "Log In", confirm: "link" },
  sits: { create: "Register / Create an account", signIn: "Log in", confirm: "link" },
  dreamapply: { create: "Register", signIn: "Log in", confirm: "link" },
  studielink: { create: "Create account", signIn: "Log in", confirm: "code" },
  uni_assist: { create: "Register", signIn: "Log in", confirm: "link" },
};

// the create-account and sign-in pages, worked out from any page of the portal. null when the system has no
// fixed address for them
export function accountUrls(url: string, text = ""): { create?: string; signIn?: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const p = platformOf(url, text);
  if (p === "slate") {
    // the page to come back to after signing in: the one slate itself names (?r=), else the application's start
    const back = u.searchParams.get("r") ?? `${u.origin}${/\/portal\//.test(u.pathname) ? u.pathname.replace(/(\/portal\/[^/]+).*/, "$1") : "/apply/"}`;
    const r = encodeURIComponent(back);
    return { create: `${u.origin}/account/register?r=${r}`, signIn: `${u.origin}/account/login?r=${r}&cookie=1` };
  }
  if (p === "salesforce") {
    const at = u.pathname.indexOf("/s/");
    const base = `${u.origin}${at > 0 ? u.pathname.slice(0, at) : ""}`;
    return { create: `${base}/s/login/SelfRegister`, signIn: `${base}/s/login/` };
  }
  return null;
}

const CONFIRM: Record<AccountWay["confirm"], string> = {
  pin: "it emails a temporary PIN or link to confirm the email; the agents read it from the inbox",
  link: "it emails a link to activate the account; the agents open it from the inbox",
  code: "it emails a code to type in",
  none: "no email confirmation is usually needed",
  varies: "some send an activation email",
};

export function playbookFor(url: string, text = ""): string {
  const p = platformOf(url, text);
  if (!p) return "";
  const a = ACCOUNT[p];
  return a ? `${PLAYBOOK[p]} accounts here: new applicants use "${a.create}", returning ones "${a.signIn}"; ${CONFIRM[a.confirm]}.` : PLAYBOOK[p];
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
