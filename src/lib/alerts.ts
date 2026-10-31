import "server-only";
import { admin } from "@/lib/supabase/admin";
import { sendSystem, systemMailReady } from "@/lib/mailer";
import { emailHtml } from "@/lib/email-layout";

// tell the operator when something breaks: a job that failed for good, a server error. one email per kind of
// failure per hour (the rest are counted), to ADMIN_ALERT_EMAIL.
const TO = () => process.env.ADMIN_ALERT_EMAIL || "emailolaoluwa@gmail.com";
const WINDOW = 3600_000;

export async function alert(key: string, subject: string, details: Record<string, unknown>): Promise<boolean> {
  try {
    const db = admin();
    const k = key.slice(0, 200);
    const { data } = await db.from("ops_alerts").select("last_at, count").eq("key", k).maybeSingle();
    if (data && Date.now() - Date.parse(data.last_at) < WINDOW) {
      await db.from("ops_alerts").update({ count: (data.count ?? 1) + 1 }).eq("key", k);
      return false;
    }
    const since = data?.count && data.count > 1 ? data.count - 1 : 0;
    await db.from("ops_alerts").upsert({ key: k, last_at: new Date().toISOString(), count: 1 });
    if (!systemMailReady()) return false;
    const lines = Object.entries(details).map(([a, b]) => `**${a}**: ${String(typeof b === "string" ? b : JSON.stringify(b)).slice(0, 600)}`);
    if (since) lines.push(`**also**: ${since} more like this in the last hour`);
    await sendSystem({
      to: TO(),
      subject: `Ivyward alert: ${subject}`.slice(0, 160),
      text: `${subject}\n\n${lines.join("\n").replace(/\*\*/g, "")}`,
      html: emailHtml({ kicker: "Operator alert", headline: subject, blocks: [...lines.map((l) => ({ t: "p" as const, text: l })), { t: "button", label: "Open the admin page", href: "https://tryivyward.com/admin" }] }),
      tag: "alert",
    });
    return true;
  } catch {
    return false; // alerts must never break the thing they report on
  }
}
