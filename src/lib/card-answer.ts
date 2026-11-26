import "server-only";
import { admin } from "@/lib/supabase/admin";
import { answerQuestion, openQuestions } from "@/lib/portal-questions";
import { toAsk, type Ask } from "@/lib/ask";
import { afterDetailAnswer, saveDetail } from "@/lib/detail-answers";
import { answerSharpen, cardState, isSharpenId } from "@/lib/cards";
import { logEvent } from "@/lib/events";

const nextLine = (q: Ask, first: boolean) => `${first ? "" : "Next, "}${q.school ?? "A school"} asks: ${q.question}`;

// a tapped (or typed) answer to a card: straight into the profile, no AI needed, then the next question. ids: a
// portal question (uuid), a form question ("d:<key>"), or a match fact ("s:<key>", lib/cards). from the chat in the
// app (api/questions) and from WhatsApp (lib/whatsapp-onboard). null = skip.
export async function answerCard(
  uid: string,
  id: string,
  answer: string | null,
  o: { sessionId?: string | null; via?: "web" | "whatsapp" } = {},
): Promise<{ ok: true; next: Ask | null; reply: string; left: number } | { ok: false; error: string; status: number }> {
  let next: Ask | null;
  let reply: string;
  let left: unknown[] = [];
  if (id.startsWith("s:")) {
    // a match fact from a card: saved, then the next card
    if (!isSharpenId(id)) return { ok: false, error: "unknown question", status: 400 };
    const saved = await answerSharpen(uid, id, answer);
    if (!saved.ok) return { ok: false, error: saved.error ?? "couldn't save that", status: 400 };
    next = (await cardState(uid)).card;
    reply = "Saved.";
  } else if (id.startsWith("d:")) {
    // a profile-chapter question: saved to the profile, then the next one (a school's waiting question first)
    const saved = await saveDetail(uid, id.slice(2), answer?.trim() ? answer : null);
    if (!saved.ok) return { ok: false, error: saved.error ?? "couldn't save that", status: 400 };
    const waiting = await openQuestions(uid);
    if (waiting[0]) {
      next = toAsk(waiting[0]);
      reply = `Saved. One a school is waiting on first: ${next.school ?? "a school"} asks: ${next.question}`;
    } else {
      const a = await afterDetailAnswer(uid, id.slice(2));
      next = a.next;
      reply = a.reply;
    }
  } else {
    const ok = await answerQuestion(uid, id, answer?.trim() ? answer : null);
    if (!ok) return { ok: false, error: "that question was already answered", status: 409 };
    left = await openQuestions(uid);
    next = left[0] ? toAsk(left[0] as Parameters<typeof toAsk>[0]) : null;
    reply = next ? nextLine(next, false) : "That's everything. The agents are carrying on with your applications now.";
  }
  // counted, to see how much of the profile now fills from cards rather than the conversation
  await logEvent({
    userId: uid,
    actor: "user",
    action: "profile.card_answered",
    ...(o.via === "whatsapp" ? { channel: "whatsapp" } : {}),
    context: { kind: id.startsWith("s:") ? "sharpen" : id.startsWith("d:") ? "detail" : "portal", key: id.startsWith("s:") || id.startsWith("d:") ? id : null, skipped: !answer?.trim(), chat: !!o.sessionId },
  }).catch(() => {});
  // from the chat: keep the conversation in Ivyward AI's history so it knows what was answered
  if (o.sessionId) {
    const db = admin();
    const turns = [
      { user_id: uid, session_id: o.sessionId, role: "user", content: answer?.trim() ? answer.trim() : "Skip: doesn't apply to me" },
      { user_id: uid, session_id: o.sessionId, role: "agent", content: reply, meta: next ? { ask: next } : null },
    ];
    const { error } = await db.from("interview_turns").insert(turns);
    if (error) await db.from("interview_turns").insert(turns.map(({ meta: _m, ...t }) => (void _m, t)));
  }
  return { ok: true, next, reply, left: left.length };
}
