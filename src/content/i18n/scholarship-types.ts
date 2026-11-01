// a scholarship profile translated into another language; slug matches the English profile
export type LocalScholarship = {
  slug: string;
  country: string;
  forWhom: string;
  summary: string;
  covers: string[];
  eligibility: string[];
  deadline: string;
  howToApply: string[];
};
