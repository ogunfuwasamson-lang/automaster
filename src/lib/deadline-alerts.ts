import "server-only";
import { admin } from "@/lib/supabase/admin";
import { sendSystem, systemMailReady } from "@/lib/mailer";
import { emailHtml, type Block } from "@/lib/email-layout";
import { SCHOLARSHIPS } from "@/content";
import { SITE } from "@/lib/site";

// scholarship deadline alerts for visitors who aren't ready to sign up: double opt-in, one email a month listing
// the big scholarships that usually close this month and next, with an unsubscribe link in every email.

// months (1-12) each scholarship usually closes, from the profiles' deadline windows
export const CLOSES: Record<string, number[]> = {
  chevening: [10],
  "commonwealth-masters": [10],
  "gates-cambridge": [10, 12, 1],
  rhodes: [7, 8, 9, 10],
  clarendon: [12, 1],
  "knight-hennessy": [10],
  daad: [8, 9, 10],
  "erasmus-mundus": [10, 11, 12, 1, 2],
  "mastercard-foundation": [11, 12, 1, 2, 3],
  mext: [4, 5],
  "global-korea-scholarship": [2, 3],
  "chinese-government-scholarship": [1, 2, 3, 4],
  "stipendium-hungaricum": [1],
  "turkiye-burslari": [1, 2],
  "swedish-institute-global-professionals": [1, 2],
  "eiffel-excellence": [11, 12, 1],
  "lester-b-pearson": [11],
};

export function closingSoon(now = new Date()) {
  const m = now.getUTCMonth() + 1;
  const next = (m % 12) + 1;
  return SCHOLARSHIPS.filter((s) => (CLOSES[s.slug] ?? []).some((x) => x === m || x === next));
}

const confirmUrl = (t: string) => `${SITE.url}/api/alerts/confirm?t=${t}`;
const unsubUrl = (t: string) => `${SITE.url}/api/alerts/unsubscribe?t=${t}`;

export async function subscribe(email: string, source: string | null): Promise<"sent" | "already" | "error"> {
  const db = admin();
  const clean = email.trim().toLowerCase();
  const { data: cur } = await db.from("alert_subscribers").select("id, token, confirmed_at, unsubscribed_at, created_at").eq("email", clean).maybeSingle();
  if (cur?.confirmed_at && !cur.unsubscribed_at) return "already";
  let token = cur?.token as string | undefined;
  if (!cur) {
    const { data, error } = await db.from("alert_subscribers").insert({ email: clean, source: source?.slice(0, 120) ?? null }).select("token").single();
    if (error) return "error";
    token = data.token;
  } else if (cur.unsubscribed_at) {
    await db.from("alert_subscribers").update({ unsubscribed_at: null, confirmed_at: null }).eq("id", cur.id);
  }
  if (!token || !systemMailReady()) return "error";
  const blocks: Block[] = [
    { t: "p", text: "Confirm your email and once a month we'll send you the major fully funded scholarships that usually close in the next few weeks, with links to the official pages." },
    { t: "button", label: "Confirm my email", href: confirmUrl(token) },
    { t: "p", text: "If you didn't ask for this, ignore this email and nothing more will be sent." },
  ];
  await sendSystem({
    to: clean,
    subject: "Confirm your scholarship deadline alerts",
    text: `Confirm your email to get monthly scholarship deadline alerts from Ivyward:\n${confirmUrl(token)}\n\nIf you didn't ask for this, ignore this email.`,
    html: emailHtml({ kicker: "Scholarship alerts", headline: "Confirm your email", blocks }),
    tag: "alerts-confirm",
  });
  return "sent";
}

export async function confirm(token: string) {
  const { data } = await admin().from("alert_subscribers").update({ confirmed_at: new Date().toISOString(), unsubscribed_at: null }).eq("token", token).select("email").maybeSingle();
  return !!data;
}

export async function unsubscribe(token: string) {
  const { data } = await admin().from("alert_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("token", token).select("email").maybeSingle();
  return !!data;
}

// the monthly email, sent in batches by the worker on the 1st
export async function sendMonthlyAlerts(limit = 200) {
  if (!systemMailReady()) return 0;
  const db = admin();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data: subs } = await db
    .from("alert_subscribers")
    .select("id, email, token, last_sent_at")
    .not("confirmed_at", "is", null)
    .is("unsubscribed_at", null)
    .or(`last_sent_at.is.null,last_sent_at.lt.${monthStart}`)
    .limit(limit);
  const list = closingSoon(now);
  if (!subs?.length || !list.length) return 0;
  const month = now.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  let sent = 0;
  for (const s of subs) {
    const blocks: Block[] = [
      { t: "p", text: `These fully funded scholarships usually close in the next few weeks. Dates move every year, so check each official page.` },
      ...list.map((x, i) => ({ t: "item" as const, n: i + 1, title: x.name, text: `${x.country}. ${x.deadline}`, button: { label: "See who can apply", href: `${SITE.url}/scholarships/${x.slug}?utm_source=alerts&utm_medium=email&utm_campaign=${now.toISOString().slice(0, 7)}` } })),
      { t: "rule" },
      { t: "p", text: "Want the applications done for you? Ivyward's agents draft and fact-check your essays, ask for fee waivers and fill in every portal. You review and sign. Preparing is free." },
      { t: "button", label: "Start free", href: `${SITE.url}/login?mode=signup&utm_source=alerts&utm_medium=email` },
    ];
    try {
      await sendSystem({
        to: s.email,
        subject: `Scholarships closing soon: ${month}`,
        text: `Scholarships that usually close in the next few weeks:\n\n${list.map((x) => `- ${x.name} (${x.country}): ${SITE.url}/scholarships/${x.slug}`).join("\n")}\n\nUnsubscribe: ${unsubUrl(s.token)}`,
        html: emailHtml({ kicker: "Scholarship alerts", headline: `Closing soon: ${month}`, blocks, manageUrl: unsubUrl(s.token) }),
        unsubscribeUrl: unsubUrl(s.token),
        tag: "alerts-monthly",
      });
      await db.from("alert_subscribers").update({ last_sent_at: now.toISOString() }).eq("id", s.id);
      sent++;
    } catch {
      // try again next run
    }
  }
  return sent;
}
