import "server-only";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { say } from "@/lib/followups";
import { logEvent } from "@/lib/events";
import { adviceSeen, destinationAdvice } from "@/lib/advice-server";
import { askAboutUs } from "@/lib/us-hold";

// Ivyward AI's advice on where to apply (lib/destination-advice): when another destination clearly beats the
// applicant's picks on Ivyward's checked list, it says so in their chat and asks, with one tap to add it
// (approvals kind destination_advice → api/approvals). runs after their shortlist starts and when asked to.
export const advisor: Record<string, Handler> = {
  "advisor.destinations": async (job) => {
    const advice = await destinationAdvice(job.user_id);
    if (!advice) return { advice: false };
    const regions = advice.add.map((o) => o.region);
    if (await adviceSeen(job.user_id, regions)) return { advice: "already raised" };
    await admin()
      .from("approvals")
      .insert({ user_id: job.user_id, kind: "destination_advice", title: advice.title, summary: advice.text, payload: { regions, topic: "destinations" }, urgency: 1, created_by: "agent:advisor" });
    await say(job.user_id, advice.text);
    await logEvent({ userId: job.user_id, actor: "agent:advisor", action: "advice.destinations", context: { add: regions, picked: advice.picked.map((o) => o.region) } });
    return { advice: regions };
  },
  // the US student visa suspension: one question to someone with US applications open (lib/us-hold)
  "advisor.us_visa": async (job) => askAboutUs(job.user_id),
};
