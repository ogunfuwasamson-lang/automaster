// a made-up applicant used by the evals. nothing here belongs to a real person.
import { emptyProfile, type Profile } from "@/lib/profile";
import { buildSheet, type FillSheet, type PortalDetails } from "@/lib/fillsheet";

export function sampleProfile(): Profile {
  const p = emptyProfile();
  p.identity = { ...p.identity, full_name: "Ada Okafor", citizenship: "Nigeria", country_of_residence: "Nigeria", city: "Lagos" };
  p.goals = { ...p.goals, study_level: "masters", fields: ["Finance"], target_term: "fall-2027", degree_types: ["MSc"] };
  p.english = { route: "test", notes: null };
  p.tests = [{ name: "IELTS", status: "taken", score: "7.5", date: "2025-06-10" }];
  p.education = [{ institution: "University of Lagos", degree: "BSc", field: "Economics", country: "Nigeria", start: "2018-09", end: "2022-07", grade: "First Class", gpa: 4.6, gpa_scale: 5 } as Profile["education"][number]];
  p.work = [{ company: "Paystack", role: "Growth Analyst", location: "Lagos", start: "2022-09", end: null, highlights: ["Grew merchants from 2,000 to 11,000"] } as Profile["work"][number]];
  return p;
}

export const SAMPLE_DETAILS: PortalDetails = {
  legal_first_name: "Ada",
  legal_last_name: "Okafor",
  email: "ada@example.com",
  phone: "+234 803 123 4567",
  date_of_birth: "1996-03-14",
  gender: "Female",
  address_line1: "12 Admiralty Way",
  city: "Lagos",
  country: "Nigeria",
  country_of_birth: "Nigeria",
  city_of_birth: "Lagos",
  first_language: "Yoruba",
  home_language: "Yoruba",
  english_medium_education: "Yes",
  studied_in_country_before: "No",
  marital_status: "Single",
};

export function sampleSheet(over: Partial<{ program: string; degree: string; schoolCountry: string }> = {}): FillSheet {
  return buildSheet({
    applicationId: "eval",
    school: "Eval University",
    program: over.program ?? "MSc Finance",
    degree: over.degree ?? "MSc",
    portalUrl: null,
    attested: true,
    accountEmail: "ada@example.com",
    schoolCountry: over.schoolCountry ?? "Canada",
    profile: sampleProfile(),
    details: SAMPLE_DETAILS,
    recommenders: [],
    essays: [],
    documents: [],
  });
}
