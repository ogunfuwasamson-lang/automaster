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

// order within a category is the order on /guides
export const GUIDES: Guide[] = [
  feeWaivers,
  fundedMasters,
  fundedPhd,
  africanScholarships,
  assistantships,
  moreAid,
  applyGradSchool,
  shortlist,
  sop,
  recommendations,
  emailProfessor,
  testWaivers,
  usa,
  uk,
  canada,
  germany,
  proofOfFunds,
  bestAiTools,
  aiAllowed,
  vsChatgpt,
  vsConsultant,
];
