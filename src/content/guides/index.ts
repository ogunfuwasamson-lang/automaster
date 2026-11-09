import type { Guide } from "../types";
import { feeWaivers } from "./fee-waivers";
import { fundedMasters } from "./funded-masters";
import { fundedPhd } from "./funded-phd";
import { assistantships } from "./assistantships";
import { moreAid } from "./more-aid";
import { africanScholarships } from "./african-scholarships";
import { applyGradSchool } from "./apply-grad-school";
import { sop } from "./sop";
import { emailProfessor } from "./email-professor";
import { recommendations } from "./recommendations";
import { shortlist } from "./shortlist";
import { testWaivers } from "./test-waivers";
import { uk } from "./uk";
import { canada } from "./canada";
import { germany } from "./germany";
import { usa } from "./usa";
import { proofOfFunds } from "./proof-of-funds";
import { aiAllowed } from "./ai-allowed";
import { bestAiTools } from "./best-ai-tools";
import { vsConsultant } from "./vs-consultant";
import { vsChatgpt } from "./vs-chatgpt";
import { ghana, kenya, india, pakistan } from "./origin";
import { bachelors, undergradAid, france, sweden, japan, korea, china, hungaryTurkey, publicHealth, engineeringCs, businessLaw, agricultureEducation } from "./wave3";
import { aiApplyForMe, portalProblems, payFeesNigeria, transcriptsNigeria, wes, howMany, timeline2027, slate } from "./wave4";
import { deadlines2027, ireland, netherlands, australia, scholarshipEssay, academicCv, scams, mba, cheapest } from "./more";

// order within a category is the order on /guides
export const GUIDES: Guide[] = [
  aiApplyForMe,
  portalProblems,
  timeline2027,
  howMany,
  slate,
  payFeesNigeria,
  transcriptsNigeria,
  wes,
  feeWaivers,
  undergradAid,
  fundedMasters,
  fundedPhd,
  africanScholarships,
  ghana,
  kenya,
  india,
  pakistan,
  scholarshipEssay,
  scams,
  publicHealth,
  engineeringCs,
  businessLaw,
  agricultureEducation,
  assistantships,
  moreAid,
  applyGradSchool,
  bachelors,
  deadlines2027,
  shortlist,
  sop,
  recommendations,
  emailProfessor,
  testWaivers,
  academicCv,
  mba,
  usa,
  uk,
  canada,
  germany,
  ireland,
  netherlands,
  australia,
  cheapest,
  france,
  sweden,
  japan,
  korea,
  china,
  hungaryTurkey,
  proofOfFunds,
  bestAiTools,
  aiAllowed,
  vsChatgpt,
  vsConsultant,
];
