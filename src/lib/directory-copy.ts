import { COUNTRY_NOTES } from "@/content/universities";
import { COUNTRY_NAME, controlLabel, registryName, type Country, type DirSchool } from "@/lib/directory";

// what a school page says about applying from abroad, country by country. general rules only, each checked on the
// official pages named beside it (25 nov 2026): what differs by programme stays with the school's own pages.

export type Copy = {
  answer: string;
  how: string; // the faq's "how do I apply"
  visaQ: [string, string];
  apply: string[]; // paragraphs before the list
  lead: string; // "Most applications ask for:"
  needs: string[];
  after?: string;
  visa: string;
  guide: { href: string; label: string };
};

const AU_VISA =
  "After you accept an offer, the provider issues a Confirmation of Enrolment (CoE), which you need to apply for a Student visa (subclass 500) from the Department of Home Affairs. The base application charge is AUD 2,500 from 1 July 2026 (some nationalities, including ASEAN and Pacific countries, pay less). You also need Overseas Student Health Cover for your stay.";
const CN_VISA =
  "After admission the university sends an admission notice and a Visa Application for Study in China form (JW201 or JW202). For study longer than 180 days you apply for an X1 visa at a Chinese embassy or consulate, then for a residence permit at the local public security bureau's exit-entry office within 30 days of arriving.";

const pretty = (u: string) => u.replace(/^https?:\/\//, "");

export function schoolCopy(s: DirSchool, where: string): Copy {
  const control = controlLabel(s.control);
  const official = s.apply ?? s.admissions ?? s.website;
  const c: Country = s.country;
  if (c === "US")
    return {
      answer: `${s.name} is a ${control ? control.toLowerCase() + " " : ""}institution in ${where}${s.highest ? ` whose highest award is a ${s.highest.toLowerCase()}` : ""}. International students apply online through the school's own application${s.apply ? "" : " (linked from its admissions site)"}; after admission the school issues an I-20 for the F-1 student visa, provided it is certified by SEVP to enrol international students.`,
      how: `Start from ${s.name}'s official admissions site${official ? ` (${pretty(official)})` : ""}. Graduate programs use the school's own online application; for undergraduate study, check whether it accepts the Common App or its own form.`,
      visaQ: [`Can ${s.name} sponsor an F-1 student visa?`, `Only schools certified by the Student and Exchange Visitor Program (SEVP) can issue an I-20. Check ${s.name} on the SEVP school search (studyinthestates.dhs.gov) or ask its international admissions office before you apply.`],
      apply: [`Graduate programs at ${s.name} take applications through the school's own online application, usually run by the graduate school or the department. For undergraduate study, check whether ${s.name} accepts the Common App or uses its own form.`],
      lead: "Most applications ask for:",
      needs: [
        "Transcripts and degree certificates, sometimes with a credential evaluation (WES or ECE)",
        "English test scores (TOEFL, IELTS or Duolingo) unless you qualify for a waiver",
        "A statement of purpose and a CV for graduate programs",
        "Two or three recommendation letters",
        "Proof of funds for the I-20, and a passport copy",
      ],
      after: "Application fees in the US are usually $50 to $150. Many schools waive them for event attendees, financial hardship or partner programs.",
      visa: COUNTRY_NOTES["United States"].visa,
      guide: { href: COUNTRY_NOTES["United States"].guide, label: "US application guide" },
    };
  if (c === "GB")
    return {
      answer: `${s.name} is a higher education provider in ${where}. Undergraduates apply through UCAS; postgraduate applicants usually apply directly to the university online. After an unconditional offer the university issues a CAS for the UK Student visa, if it holds a student sponsor licence.`,
      how: `Undergraduate courses: apply through UCAS. Postgraduate courses: apply on ${s.name}'s own website, course by course.`,
      visaQ: [`Can ${s.name} sponsor a UK Student visa?`, `Only licensed student sponsors can issue a CAS. Check ${s.name} on the UK government's register of student sponsors before you apply.`],
      apply: [`Undergraduate courses at ${s.name} are applied for through UCAS. For a master's or PhD you apply on the university's own website, course by course, and many UK universities charge no application fee for postgraduate courses.`],
      lead: "Most postgraduate applications ask for:",
      needs: ["Transcripts and degree certificate", "A personal statement and a CV", "One or two references", "English test scores (often IELTS Academic) or an accepted exemption", "A passport copy; some subjects also need an ATAS certificate"],
      visa: COUNTRY_NOTES["United Kingdom"].visa,
      guide: { href: COUNTRY_NOTES["United Kingdom"].guide, label: "UK application guide" },
    };
  if (c === "CA")
    return {
      answer: `${s.name} is a ${control ? control.toLowerCase() + " " : ""}institution in ${where}, on Immigration, Refugees and Citizenship Canada's list of designated learning institutions, so it can enrol international students on a study permit. International students apply to ${s.name} directly, online, programme by programme.`,
      how: `Apply on ${s.name}'s own website${official ? ` (${pretty(official)})` : ""}: graduate programmes through its graduate studies application, undergraduate and college programmes through its admissions application (in Ontario, many undergraduate programmes go through OUAC).`,
      visaQ: [`Can ${s.name} enrol international students?`, `Yes: ${s.name} is a designated learning institution (${s.recognition?.replace(/^.*DLI /, "DLI ") ?? "on IRCC's list"}). With its letter of acceptance you apply for a Canadian study permit; check whether your programme leads to a post-graduation work permit on the IRCC list.`],
      apply: [`International students apply to ${s.name} directly, programme by programme. Graduate programmes usually ask for a supervisor or a research statement as well as the documents below; college diplomas and certificates often admit on transcripts alone.`],
      lead: "Most applications ask for:",
      needs: ["Transcripts and degree certificates, translated into English or French", "English or French test scores (IELTS, TOEFL, CELPIP, TEF) unless you're exempt", "A statement of intent and a CV for graduate programmes", "Two or three references for graduate programmes", "A passport copy, and proof of funds for the study permit"],
      visa: COUNTRY_NOTES.Canada.visa,
      guide: { href: COUNTRY_NOTES.Canada.guide, label: "guide to applying in Canada" },
    };
  if (c === "AU")
    return {
      answer: `${s.name} is a ${control ? control.toLowerCase() + " " : ""}higher education provider in ${where}, registered on CRICOS to teach overseas students bachelor's${s.highest === "Master's degree" || s.highest === "Doctor's degree" ? ", master's" : ""}${s.highest === "Doctor's degree" ? " and doctoral" : ""} degrees. International students apply to ${s.name} directly or through one of its authorised education agents; after accepting an offer you get a Confirmation of Enrolment for the Student visa.`,
      how: `Apply on ${s.name}'s own website${official ? ` (${pretty(official)})` : ""}, course by course, or through an education agent it authorises. Most international students apply directly rather than through the state admission centres domestic students use.`,
      visaQ: [`Can ${s.name} enrol international students?`, `Yes: ${s.name} is registered on CRICOS (${s.recognition?.replace(/^.*provider /, "provider ") ?? "the Commonwealth register"}). Only courses listed on CRICOS can be studied on a Student visa, so check your course is one of them.`],
      apply: [`International students apply to ${s.name} directly, course by course, or through an education agent it authorises. Research degrees usually need a supervisor's agreement before you apply.`],
      lead: "Most applications ask for:",
      needs: ["Transcripts and degree certificates", "English test scores (IELTS, TOEFL, PTE or similar) at the course's level", "A CV, and a research proposal for a research degree", "A passport copy"],
      visa: AU_VISA,
      guide: { href: "/guides/study-in-australia", label: "guide to studying in Australia" },
    };
  if (c === "FR")
    return {
      answer: `${s.name} is a ${s.kind ? s.kind.split(";")[0].toLowerCase() : "higher education institution"} in ${where}, on the French Ministry of Higher Education and Research's list. How you apply depends on where you live: in the countries covered by Campus France's Études en France procedure you apply through it; elsewhere a master's at a public university goes through the national Mon Master platform, and many écoles run their own admissions.`,
      how: `It depends on where you live and the level. In the countries covered by Campus France's Études en France procedure, you apply through that platform. Otherwise: a first-year bachelor's at a public university through the prior application (DAP) between October and mid-December; a master's through the Mon Master platform; a doctorate, or a programme at an école with its own admissions, directly on ${s.name}'s website${official ? ` (${pretty(official)})` : ""}.`,
      visaQ: [`Do I need a visa to study at ${s.name}?`, `Students from outside the EU, the EEA and Switzerland need a long-stay student visa (VLS-TS). In countries covered by Études en France, the same Campus France file leads to the visa application.`],
      apply: [
        `Where you live decides the route. In the countries covered by Campus France's Études en France procedure, applications for a bachelor's (second year on) or a master's go through that platform, which also leads to the visa. Elsewhere, a master's at a public university goes through Mon Master, and a first-year bachelor's through the DAP. Doctoral applicants contact the doctoral school directly.`,
        `Grandes écoles and private schools often run their own admissions, sometimes with a fee, so check ${s.name}'s website for its route.`,
      ],
      lead: "Most applications ask for:",
      needs: ["Transcripts and diplomas, with certified translations into French (or English for English-taught programmes)", "French test results (DELF/DALF, TCF) for French-taught programmes, or English results for English-taught ones", "A cover letter (lettre de motivation) and a CV", "Recommendation letters for some master's programmes", "A passport copy"],
      visa: COUNTRY_NOTES.France.visa,
      guide: { href: "/guides/study-in-france", label: "guide to studying in France" },
    };
  // china
  const local = s.nameLocal && s.nameLocal !== s.name ? ` (${s.nameLocal})` : "";
  return {
    answer: `${s.name}${local} is a ${s.control === "public" ? "public" : "private"} university-level institution in ${where}, on China's Ministry of Education national list of higher education institutions. International students apply to the university's international students office online, programme by programme; Chinese Government Scholarship applicants also apply through the Campus China (CSC) system or a Chinese embassy.`,
    how: `Apply through ${s.name}'s international student admissions${official ? ` (${pretty(official)})` : ""}, usually an online application system. If you're applying for a Chinese Government Scholarship, you also apply through the CSC's Campus China system (Type B, through the university) or a Chinese embassy (Type A).`,
    visaQ: [`What visa do I need to study at ${s.name}?`, CN_VISA],
    apply: [`International students apply to ${s.name} directly through its international students office. Chinese-taught programmes usually ask for an HSK level; English-taught programmes ask for English test scores or a medium-of-instruction letter.`],
    lead: "Most applications ask for:",
    needs: ["Notarised transcripts and degree certificates", "HSK results for Chinese-taught programmes, or English test scores for English-taught ones", "A study plan or research proposal, and a CV", "Two recommendation letters for master's and PhD programmes", "A passport copy; many universities also ask for a physical examination form"],
    visa: CN_VISA,
    guide: { href: "/guides/study-in-china", label: "guide to studying in China" },
  };
}

export const officialFrom = (s: DirSchool) => `the ${registryName(s.registry)}`;
export const countryOf = (s: DirSchool) => COUNTRY_NAME[s.country];
