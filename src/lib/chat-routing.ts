// which model an Ask Ivyward turn goes to (agents/interviewer). pure, so it's tested on its own.

type Turn = { role: "agent" | "user"; content: string };

// a short answer (a few words, no question mark, no request) to a question the AI just asked, outside a story
// conversation (follow-ups there need the larger model's judgement) goes to the smaller model. nov 2026: every turn
// ran on the larger model at about $0.013, most of them a few words long.
const REQUEST = /\b(find|search|look ?up|remind|calendar|schedule|book|register|apply|start|send|submit|draft|write|prepare|add|change|cancel|delete|open|follow|what|how|when|why|which|where|who|can you|could you|should i|help)\b/i;

export function lightTurn(userText: string | null, transcript: Turn[], lastMode: string | null): boolean {
  if (!userText) return true; // an opening line
  const t = userText.trim();
  if (t.length > 140 || t.includes("?") || REQUEST.test(t)) return false;
  if (lastMode === "stories" || lastMode === "answer") return false;
  const last = [...transcript].reverse().find((x) => x.role === "agent");
  return !!last && last.content.trim().endsWith("?");
}
