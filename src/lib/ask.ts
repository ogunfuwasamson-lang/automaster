// a question with the right control for it: buttons for a short list, a search for a long one, yes/no, a date,
// or a text box. shared by the chat and the "your schools are asking" card (no server imports here).

export type AskKind = "choice" | "search" | "yes_no" | "date" | "text";
export interface Ask {
  id: string | null; // a portal question's id (answered directly, no AI); null for Ivyward AI's own question
  school: string | null;
  question: string;
  kind: AskKind;
  options: string[];
  applicationId?: string | null;
}

const PLACEHOLDER = /^\s*(--|—|-)|^\s*(select|choose|please)\b|^\s*$/i;

export function cleanOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of options) {
    const t = (o ?? "").trim();
    if (!t || PLACEHOLDER.test(t) || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

export function askKind(fieldType: string | null | undefined, options: string[]): AskKind {
  const opts = cleanOptions(options);
  if (fieldType === "date" || fieldType === "datetime-local") return "date";
  const low = opts.map((o) => o.toLowerCase());
  if (opts.length === 2 && low.every((o) => /^(yes|no|oui|non|true|false)$/.test(o))) return "yes_no";
  if (fieldType === "checkbox" && !opts.length) return "yes_no";
  if (opts.length > 12) return "search";
  if (opts.length) return "choice";
  return "text";
}

export function toAsk(q: { id: string; question: string; options: string[]; field_type: string | null; school: string | null; application_id?: string | null }): Ask {
  const kind = askKind(q.field_type, q.options);
  const options = kind === "yes_no" && !cleanOptions(q.options).length ? ["Yes", "No"] : cleanOptions(q.options);
  return { id: q.id, school: q.school, question: q.question, kind, options, applicationId: q.application_id ?? null };
}
