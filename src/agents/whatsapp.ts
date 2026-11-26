import "server-only";
import type { Handler } from "./index";
import { replyWithAi } from "@/lib/whatsapp-server";

// an applicant's WhatsApp message to Ivyward AI (api/whatsapp/webhook queues it): answered in the same conversation
// as the dashboard's chat, and sent back on WhatsApp while the 24-hour window is open
export const whatsapp: Record<string, Handler> = {
  "whatsapp.reply": async (job) => {
    const p = job.payload as { text?: string; messageId?: string };
    if (!p.text || !p.messageId) return { skipped: "nothing to answer" };
    return { result: await replyWithAi(job.user_id, p.text, p.messageId) };
  },
};
