// what the applicant can set on the autonomy dial, in their words. pure: shared by the api and the ui.
import type { GrantMode } from "@/lib/policy";

export const USER_SETTABLE: Record<string, GrantMode[]> = {
  research: ["auto", "deny"],
  draft: ["auto", "approve"],
  prefill: ["auto", "approve"],
  "school.add_drop": ["auto", "approve"],
  "email.follow_up": ["auto_undo", "approve", "deny"],
  "email.new_contact": ["auto_undo", "approve", "deny"],
  submit: ["auto", "approve"],
  "spend.app_fee": ["auto", "approve"],
};

export const CAPABILITY_LABEL: Record<string, { name: string; help: string }> = {
  research: { name: "research schools and funding", help: "searching the web for programs, deadlines, scholarships" },
  draft: { name: "draft essays and emails", help: "you always review essays before anything is submitted" },
  prefill: { name: "fill application forms", help: "the runner fills portals from your profile" },
  "school.add_drop": { name: "add or drop schools", help: "keep the shortlist current as research comes in" },
  "email.follow_up": { name: "follow-up emails", help: "polite nudges on threads already started" },
  "email.new_contact": { name: "first emails to schools", help: "fee waivers, funding requests, supervisor intros" },
  submit: { name: "submit applications", help: "only ever after you approve the packet" },
  "spend.app_fee": { name: "pay application fees", help: "only inside your fee envelope; the card is yours, in your browser" },
  state_fact: { name: "new claims about you", help: "always you" },
  sign: { name: "sign or certify anything", help: "always you; packet approval is your signature" },
  "spend.deposit": { name: "enrollment deposits", help: "always you" },
};

export const MODE_LABEL: Record<GrantMode, string> = {
  auto: "on its own",
  auto_undo: "on its own, with undo",
  approve: "ask me first",
  deny: "never",
};
