import "server-only";
import type { Handler } from "./index";
import { replyWithAi } from "@/lib/whatsapp-server";
import { finishSetup, saveMedia, type Media } from "@/lib/whatsapp-onboard";

// WhatsApp work that can't wait inside the webhook (api/whatsapp/webhook answers Meta within seconds):
// - reply: Ivyward AI answers their message, in the same conversation as the dashboard's chat, while the 24-hour
//   window is open
// - media: a file they sent is downloaded from Meta, saved to their documents and read by the agents
// - finish: setup in the chat is done: the agents start and the shortlist comes back in the chat
export const whatsapp: Record<string, Handler> = {
  "whatsapp.reply": async (job) => {
    const p = job.payload as { text?: string; messageId?: string };
    if (!p.text || !p.messageId) return { skipped: "nothing to answer" };
    return { result: await replyWithAi(job.user_id, p.text, p.messageId) };
  },
  "whatsapp.media": async (job) => {
    const p = job.payload as { media?: Media; kind?: string | null; setup?: boolean };
    if (!p.media?.id) return { skipped: "no file" };
    return { result: await saveMedia(job.user_id, { media: p.media, kind: p.kind ?? null, setup: !!p.setup }) };
  },
  "whatsapp.finish": async (job) => ({ result: await finishSetup(job.user_id) }),
};
