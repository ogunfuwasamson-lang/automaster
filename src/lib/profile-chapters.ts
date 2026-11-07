// the application profile in chapters: every question schools commonly ask, grouped into short themed rounds so
// nobody faces 150 questions at once. each chapter is a few minutes; answers go into profiles.portal_details,
// where the form-filling agents, the essay writer and Ivyward AI read them. no server imports: the card deck and
// the onboarding use this too.
import { PORTAL_DETAIL_FIELDS, type DetailField, type PortalDetails } from "@/lib/portal-fields";

export type Level = "undergraduate" | "masters" | "phd";

export interface Chapter {
  id: string;
  title: string;
  blurb: string; // one line on why it matters
  keys: string[];
  style: "quick" | "story"; // quick: taps and short answers; story: a conversation
}

export const CHAPTERS: Chapter[] = [
  { id: "basics", title: "The basics", blurb: "Your name exactly as schools need it, and how to reach you.", style: "quick", keys: ["legal_first_name", "legal_middle_name", "legal_last_name", "preferred_name", "date_of_birth", "phone", "gender", "pronouns", "title", "other_names"] },
  { id: "home", title: "Where you're from", blurb: "Address, birthplace and citizenship: the first page of every form.", style: "quick", keys: ["address_line1", "address_line2", "city", "state", "postal_code", "country", "hometown", "country_of_birth", "city_of_birth", "second_citizenship", "passport_country", "passport_expiry", "mailing_address"] },
  { id: "plans", title: "How you want to study", blurb: "Campus or online, full-time or not, and a back-up subject.", style: "quick", keys: ["study_mode", "attendance", "entry_route", "transfer_student", "second_choice_field", "contacted_department"] },
  { id: "school", title: "Your school record", blurb: "The questions behind your grades, and your languages.", style: "quick", keys: ["strongest_subjects", "weakest_subjects", "class_rank", "awaiting_results", "retaking_tests", "repeated_year", "education_gap", "education_gap_reason", "transferred_schools", "academic_probation", "first_language", "home_language", "other_languages", "instruction_language_school", "english_medium_education", "years_in_english"] },
  { id: "family", title: "Your family", blurb: "Parents, siblings and who to call in an emergency.", style: "quick", keys: ["parent1_relationship", "parent1_name", "parent1_email", "parent1_education", "parent1_occupation", "parent2_relationship", "parent2_name", "parent2_email", "parent2_education", "parent2_occupation", "siblings", "first_generation", "family_alumni", "dependents", "emergency_contact_name", "emergency_contact_relationship", "emergency_contact_phone", "emergency_contact_email"] },
  { id: "travel", title: "Visas and travel", blurb: "What student-visa questions on application forms need.", style: "quick", keys: ["current_visa", "studied_in_country_before", "previous_visa_refusal", "visa_overstay", "travelled_abroad", "dependants_travelling", "family_in_destination", "housing_plan"] },
  { id: "money", title: "Paying for it", blurb: "Funding questions, and the words for need-based aid.", style: "quick", keys: ["funding_source", "sponsor_name", "sponsor_relationship", "funds_available", "employer_sponsored", "receiving_aid_now", "other_scholarships", "household_income", "need_statement"] },
  { id: "beyond", title: "Beyond the classroom", blurb: "Activities, leadership, awards: the activities list on every form.", style: "story", keys: ["leadership", "volunteering", "awards", "sports", "arts_music", "hobbies", "interests", "skills", "publications", "linkedin", "website"] },
  { id: "story", title: "Your story", blurb: "The moments your essays are written from. Best as a conversation.", style: "story", keys: ["three_words", "proudest_achievement", "intellectual_spark", "challenge_overcome", "failure_lesson", "leadership_moment", "teamwork_disagreement", "problem_to_solve", "community_impact", "not_in_grades", "circumstances", "anything_else"] },
  { id: "background", title: "About you (optional)", blurb: "Background questions some forms ask. Every one has Prefer not to say.", style: "quick", keys: ["marital_status", "race_ethnicity", "hispanic_latino", "religion", "first_generation", "refugee_or_displaced", "military_service", "disability", "lgbtq", "accessibility_needs", "accessibility_details"] },
  { id: "fineprint", title: "The fine print", blurb: "The declarations at the end of every form, answered once.", style: "quick", keys: ["how_heard", "previously_applied", "disciplinary_history", "criminal_history"] },
];

const FIELD = new Map(PORTAL_DETAIL_FIELDS.map((f) => [f.key, f]));
export const fieldFor = (key: string): DetailField | undefined => FIELD.get(key);

// follow-ups only make sense after a yes
const ONLY_IF: Record<string, [string, string]> = {
  education_gap_reason: ["education_gap", "Yes"],
  accessibility_details: ["accessibility_needs", "Yes"],
  parent2_name: ["parent2_relationship", "!None"],
  parent2_email: ["parent2_relationship", "!None"],
  parent2_education: ["parent2_relationship", "!None"],
  parent2_occupation: ["parent2_relationship", "!None"],
};

export const skippedKeys = (d: PortalDetails | null | undefined): Set<string> => {
  const raw = (d as Record<string, unknown> | null | undefined)?._skipped;
  return new Set(Array.isArray(raw) ? (raw as string[]) : []);
};

const answered = (d: PortalDetails | null | undefined, key: string) => !!(d?.[key] ?? "").toString().trim();

// the questions in a chapter that apply to this applicant, in order
export function chapterQuestions(c: Chapter, level: Level | null, d: PortalDetails | null | undefined): DetailField[] {
  return c.keys
    .map((k) => FIELD.get(k))
    .filter((f): f is DetailField => !!f)
    .filter((f) => !f.levels || !level || f.levels.includes(level))
    .filter((f) => {
      const cond = ONLY_IF[f.key];
      if (!cond) return true;
      const v = (d?.[cond[0]] ?? "").toString();
      return cond[1].startsWith("!") ? v !== cond[1].slice(1) : v === cond[1];
    });
}

export interface ChapterState {
  chapter: Chapter;
  total: number;
  done: number; // answered or deliberately skipped
  next: DetailField[]; // what's still open, in order
}

export function chapterStates(d: PortalDetails | null | undefined, level: Level | null): ChapterState[] {
  const skipped = skippedKeys(d);
  return CHAPTERS.map((chapter) => {
    const qs = chapterQuestions(chapter, level, d);
    const open = qs.filter((f) => !answered(d, f.key) && !skipped.has(f.key));
    return { chapter, total: qs.length, done: qs.length - open.length, next: open };
  });
}

// how ready the profile is for application forms, 0 to 100
export function formReadiness(d: PortalDetails | null | undefined, level: Level | null): number {
  const s = chapterStates(d, level);
  const total = s.reduce((a, x) => a + x.total, 0);
  return total ? Math.round((100 * s.reduce((a, x) => a + x.done, 0)) / total) : 0;
}

// the next few open questions: from one chapter if given, else the first chapter with anything open
export function nextQuestions(d: PortalDetails | null | undefined, level: Level | null, n = 3, chapterId?: string | null): { chapter: ChapterState | null; questions: DetailField[] } {
  const states = chapterStates(d, level);
  const pick = (chapterId ? states.find((s) => s.chapter.id === chapterId && s.next.length) : null) ?? states.find((s) => s.next.length) ?? null;
  return { chapter: pick, questions: pick ? pick.next.slice(0, n) : [] };
}

// the control a detail question gets in the chat or the card deck
export function detailAsk(f: DetailField): { id: string; school: null; question: string; kind: "choice" | "search" | "yes_no" | "date" | "text"; options: string[] } {
  const kind = f.kind === "date" ? "date" : f.kind === "yes_no" && (f.options ?? []).length === 2 ? "yes_no" : f.options?.length ? (f.options.length > 12 ? "search" : "choice") : "text";
  return { id: `d:${f.key}`, school: null, question: f.label, kind, options: f.options ?? [] };
}
