import "server-only";
import { admin } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/gmail";
import { sendSystem, systemMailReady } from "@/lib/mailer";
import { emailHtml, type Block, type Row } from "@/lib/email-layout";

// tell the applicant something, once. the key de-duplicates: raising the same notice again does nothing while it's
// open, and re-opens it if it was resolved. email goes out once per notice, only when asked for.
export interface Notice {
  userId: string;
  key: string;
  kind: "setup" | "shortlist" | "reminder" | "followup" | "info";
  title: string;
  body?: string;
  href?: string;
  actionLabel?: string;
  urgent?: boolean;
  email?: boolean;
  rows?: Row[]; // in the email only: the schools or items the notice is about, one per line
}

export async function notify(n: Notice): Promise<void> {
  const db = admin();
  const { data: cur } = await db.from("notifications").select("id, resolved_at, emailed_at").eq("user_id", n.userId).eq("dedupe_key", n.key).maybeSingle();
  const row = { user_id: n.userId, dedupe_key: n.key, kind: n.kind, title: n.title, body: n.body ?? null, href: n.href ?? null, action_label: n.actionLabel ?? null, urgent: !!n.urgent };
  let id = cur?.id as string | undefined;
  if (!cur) {
    const { data, error } = await db.from("notifications").insert(row).select("id").single();
    if (error) return; // the table isn't there yet, or a race inserted it first
    id = data.id;
  } else {
    // keep it current; a resolved notice raised again is open again and unread
    await db.from("notifications").update({ ...row, ...(cur.resolved_at ? { resolved_at: null, read_at: null, created_at: new Date().toISOString() } : {}) }).eq("id", cur.id);
  }
  if (n.email && id && !cur?.emailed_at && systemMailReady()) await emailNotice(n, id).catch(() => {});
}

export async function resolve(userId: string, key: string | RegExp): Promise<void> {
  const db = admin();
  if (typeof key === "string") {
    await db.from("notifications").update({ resolved_at: new Date().toISOString() }).eq("user_id", userId).eq("dedupe_key", key).is("resolved_at", null);
    return;
  }
  const { data } = await db.from("notifications").select("id, dedupe_key").eq("user_id", userId).is("resolved_at", null);
  const ids = (data ?? []).filter((r) => key.test(r.dedupe_key as string)).map((r) => r.id);
  if (ids.length) await db.from("notifications").update({ resolved_at: new Date().toISOString() }).in("id", ids);
}

const KICKER: Record<Notice["kind"], string> = { setup: "Needs you", shortlist: "Your shortlist", reminder: "Reminder", followup: "Follow-up", info: "Update" };

// a notice in the email look: its paragraphs, the rows it's about, one button
export function noticeBlocks(n: Pick<Notice, "body" | "rows">, label: string, href: string): Block[] {
  const paras = (n.body ?? "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  return [...paras.map((text) => ({ t: "p" as const, text })), ...(n.rows?.length ? [{ t: "rows" as const, rows: n.rows }] : []), { t: "button", label, href }];
}

async function emailNotice(n: Notice, id: string) {
  const db = admin();
  const { data } = await db.auth.admin.getUserById(n.userId);
  const to = data.user?.email;
  if (!to) return;
  const href = n.href ? (n.href.startsWith("http") ? n.href : `${appUrl()}${n.href}`) : `${appUrl()}/dashboard`;
  const label = n.actionLabel ?? "Open Ivyward";
  await sendSystem({
    to,
    subject: n.title,
    text: `${n.title}\n\n${n.body ?? ""}\n\n${label}: ${href}\n\nEmail settings: ${appUrl()}/settings`,
    html: emailHtml({ preheader: n.body, kicker: KICKER[n.kind], headline: n.title, blocks: noticeBlocks(n, label, href), footer: "Ivyward AI", manageUrl: `${appUrl()}/settings` }),
    unsubscribeUrl: `${appUrl()}/settings`,
    tag: n.kind,
  });
  await db.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", id);
}
