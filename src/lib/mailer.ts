import "server-only";

// Ivyward's own email (the daily digest and other notices to the applicant), sent through Resend from
// tryivyward.com. Emails to schools never go this way: those go from the applicant's own Gmail (lib/gmail.ts).
// Sign-in emails are sent by Supabase, also through Resend (its SMTP settings), so they share the same domain.

const FROM = () => process.env.EMAIL_FROM || "Ivyward <hello@tryivyward.com>";
const REPLY_TO = () => process.env.EMAIL_REPLY_TO || undefined;

export const systemMailReady = () => !!process.env.RESEND_API_KEY;

export async function sendSystem(m: { to: string; subject: string; text: string; unsubscribeUrl?: string; tag?: string }): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY isn't set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM(),
      to: [m.to],
      subject: m.subject,
      text: m.text,
      ...(REPLY_TO() ? { reply_to: REPLY_TO() } : {}),
      ...(m.unsubscribeUrl ? { headers: { "List-Unsubscribe": `<${m.unsubscribeUrl}>` } } : {}),
      ...(m.tag ? { tags: [{ name: "kind", value: m.tag }] } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !json.id) throw new Error(`resend: ${json.message ?? res.status}`);
  return { id: json.id };
}
