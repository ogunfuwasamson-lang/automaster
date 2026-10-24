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
  research: { name: "Research schools and funding", help: "Searching the web for programs, deadlines, scholarships" },
  draft: { name: "Draft essays and emails", help: "You always review essays before anything is submitted" },
  prefill: { name: "Fill application forms", help: "Agents fill portals from your profile" },
  "school.add_drop": { name: "Add or drop schools", help: "Keep the shortlist current as research comes in" },
  "email.follow_up": { name: "Follow-up emails", help: "Polite nudges on threads already started" },
  "email.new_contact": { name: "First emails to schools", help: "Fee waivers, funding requests, supervisor intros" },
  submit: { name: "Submit applications", help: "Only ever after you sign the packet" },
  "spend.app_fee": { name: "Pay application fees", help: "Only within the limit you set below" },
  state_fact: { name: "New claims about you", help: "Always you" },
  sign: { name: "Sign or certify anything", help: "Always you. Signing the packet is your signature" },
  "spend.deposit": { name: "Enrollment deposits", help: "Always you" },
};

export const MODE_LABEL: Record<GrantMode, string> = {
  auto: "On its own",
  auto_undo: "On its own, with undo",
  approve: "Ask me first",
  deny: "Never",
};
