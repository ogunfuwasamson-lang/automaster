import "server-only";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { runStructured } from "@/lib/llm";
import { localHour } from "@/lib/activity";
import { appUrl } from "@/lib/gmail";
import { sendSystem, systemMailReady } from "@/lib/mailer";
import { emailHtml, type Block } from "@/lib/email-layout";

// the weekly report from Ivyward AI: one short read on Monday morning. what's working (with numbers), the two or
// three things holding the season back, each with one button, a row of numbers, and a closing line. kept in the
// digests table (content.kind = "weekly"), opened on the home page, and emailed in the same shape.

export interface ReportItem {
  title: string;
  body: string; // **bold** for the numbers that matter
  label: string; // the button
  action: string; // "open:/path" or "chat:<message for Ivyward AI>"
}
export interface WeeklyReport {
  kind: "weekly";
  week_of: string; // YYYY-MM-DD (the Monday)
  next_on: string;
  headline: string;
  working: string;
  pivot: string;
  items: ReportItem[];
  stats: { value: string; label: string }[];
  closing: string;
  dismissed?: number[];
}

const Out = z.object({
  headline: z.string(),
  working: z.string(),
  pivot: z.string(),
  items: z.array(z.object({ title: z.string(), body: z.string(), label: z.string(), action: z.string() })),
  closing: z.string(),
});

const SYSTEM = `you are Ivyward AI writing an applicant's weekly report on their university application season. it reads like a sharp advisor's monday note, not a dashboard.
structure:
- headline: greet by first name with the time of day given, then name what's limiting them, in one sentence ("Morning, Ada. Two things stand between you and your first submission."). if nothing is limiting them, say what the week is about.
- working: one short paragraph on what's going well, with the real numbers in **bold**. honest: if little happened, say so plainly.
- pivot: one sentence that turns from what's fine to what limits them.
- items: 1 to 3, most important first. each: a short title (a fact, not a slogan), a body of 2-3 sentences with **bold** numbers explaining why it matters and what happens if nothing is done, a button label (2-3 words, a verb: "Fill details", "Approve essays", "Connect Chrome"), and an action copied exactly from the allowed actions list (or "chat:" plus a message for Ivyward AI to act on).
- closing: two sentences: how long clearing the items takes and what it buys them; what happens if they do nothing.
rules: only facts from the data given. no invented numbers, schools or events. plain words, no hype, no exclamation marks. use the applicant's own school names.`;

const iso = (d: Date) => d.toISOString().slice(0, 10);
function monday(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}

export async function buildWeekly(userId: string, now = new Date()): Promise<WeeklyReport> {
  const db = admin();
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [{ data: prof }, { data: apps }, { data: events }, { data: inbound }, { data: ups }, { data: notes }, { data: drafts }, { data: past }] = await Promise.all([
    db.from("profiles").select("profile, full_name, timezone, portal_details").eq("id", userId).single(),
    db.from("applications").select("id, status, target_deadline, runner_status, runner_note, programs(name, app_fee_usd, schools(name))").eq("user_id", userId).not("status", "in", "(dropped,withdrawn)"),
    db.from("events").select("action, actor").eq("user_id", userId).gte("created_at", since).limit(2000),
    db.from("messages").select("subject, summary, purpose").eq("user_id", userId).eq("direction", "in").gte("created_at", since).limit(50),
    db.from("followups").select("title, school, kind, status, event_start, why").eq("user_id", userId).gte("created_at", since).limit(20),
    db.from("notifications").select("title, href, kind").eq("user_id", userId).is("resolved_at", null).limit(20),
    db.from("events").select("id").eq("user_id", userId).eq("action", "artifact.ready_for_user").gte("created_at", since),
    db.from("digests").select("content").eq("user_id", userId).eq("content->>kind", "weekly").order("created_at", { ascending: false }).limit(4),
  ]);
  // items the applicant marked "not relevant" in recent reports: don't raise those again
  const dismissed = (past ?? []).flatMap((d) => {
    const c = d.content as { items?: { title: string }[]; dismissed?: number[] };
    return (c.dismissed ?? []).map((i) => c.items?.[i]?.title).filter((t): t is string => !!t);
  });
  type P = { name: string; app_fee_usd: number | null; schools: { name: string } };
  const list = (apps ?? []).map((a) => ({ ...a, p: a.programs as unknown as P }));
  const count = (re: RegExp) => (events ?? []).filter((e) => re.test(e.action)).length;
  const today = iso(now);
  const daysTo = (d: string | null) => (d ? Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) : null);
  const open = list.filter((a) => ["shortlisted", "preparing", "ready_for_review", "packet_approved"].includes(a.status) && (daysTo(a.target_deadline) ?? -1) >= 0).sort((a, b) => (a.target_deadline ?? "").localeCompare(b.target_deadline ?? ""));
  const next = open[0];
  const submittedWeek = count(/^runner\.submitted$/);
  const submittedAll = list.filter((a) => ["submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "rejected"].includes(a.status)).length;
  const toReview = list.filter((a) => a.status === "ready_for_review").length;
  const name = ((prof?.portal_details as { preferred_name?: string } | null)?.preferred_name || (prof?.profile as { identity?: { full_name?: string } } | null)?.identity?.full_name || prof?.full_name || "").split(" ")[0];
  const hour = localHour(prof?.timezone ?? "Africa/Lagos", now);
  const tod = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  // the buttons the report may use: real places in the app and real applications
  const allowed = [
    "open:/shortlist",
    "open:/applications",
    "open:/messages",
    "open:/documents",
    "open:/profile?tab=details",
    "open:/connect-chrome",
    "open:/settings",
    ...list.slice(0, 15).map((a) => `open:/applications/${a.id}`),
    ...(notes ?? []).filter((n) => n.href?.startsWith("/")).map((n) => `open:${n.href}`),
  ];

  const facts = `applicant first name: ${name || "(unknown)"}; time of day: ${tod}; today ${today}
applications (${list.length}): ${list
    .map((a) => `${a.p.schools.name} [${a.id}] ${a.status.replace(/_/g, " ")}${a.target_deadline ? `, deadline ${a.target_deadline} (${daysTo(a.target_deadline)} days)` : ""}${a.runner_status === "needs_you" ? `, portal agents stopped: ${String(a.runner_note ?? "").slice(0, 120)}` : ""}${a.p.app_fee_usd ? `, fee $${a.p.app_fee_usd}` : ""}`)
    .join("; ") || "none"}
this week: ${submittedWeek} submitted (${submittedAll} in total); ${count(/^program\.shortlisted$/)} programs added to the shortlist; ${drafts?.length ?? 0} essay drafts ready; ${count(/^artifact\.approved|essay\.approved/)} essays approved; ${count(/^email\.sent$/)} emails sent; ${(inbound ?? []).length} school emails received; ${count(/^runner\.account_created$/)} portal accounts created; ${count(/^followup\.done$/)} school follow-ups completed (registrations, waiver forms)
essays waiting for the applicant's review: ${toReview}
school emails this week: ${(inbound ?? []).map((m) => `${m.subject} (${m.purpose}): ${String(m.summary ?? "").slice(0, 100)}`).join("; ") || "none"}
follow-ups this week: ${(ups ?? []).map((f) => `${f.school ?? ""} ${f.title} (${f.status}${f.event_start ? `, ${String(f.event_start).slice(0, 16)}` : ""})${f.why ? `: ${f.why}` : ""}`).join("; ") || "none"}
open notices: ${(notes ?? []).map((n) => n.title).join("; ") || "none"}
marked "not relevant" in earlier reports (leave these out unless something has changed): ${dismissed.join("; ") || "none"}

allowed actions:
${allowed.join("\n")}`;

  const { output } = await runStructured({ userId, agent: "system", promptVersion: "weekly-v1", tier: "write", system: SYSTEM, prompt: facts, schema: Out, maxTokens: 2500 });
  const items = output.items
    .slice(0, 3)
    .map((i) => ({ ...i, action: allowed.includes(i.action) || i.action.startsWith("chat:") ? i.action : "open:/dashboard" }));
  const mon = monday(now);
  return {
    kind: "weekly",
    week_of: iso(mon),
    next_on: iso(new Date(mon.getTime() + 7 * 86_400_000)),
    headline: output.headline,
    working: output.working,
    pivot: output.pivot,
    items,
    stats: [
      { value: String(submittedWeek), label: "submitted this week" },
      { value: String((inbound ?? []).length), label: "school replies this week" },
      { value: String(toReview), label: toReview === 1 ? "essay to review" : "essays to review" },
      next ? { value: String(daysTo(next.target_deadline)), label: `days to ${next.p.schools.name.split(",")[0]}` } : { value: String(list.length), label: "programs tracked" },
    ],
    closing: output.closing,
  };
}

// where a report button goes, as a link (in the app and in the email)
export function actionHref(action: string, base = ""): string {
  if (action.startsWith("open:")) return `${base}${action.slice(5)}`;
  if (action.startsWith("chat:")) return `${base}/dashboard?chat=open&say=${encodeURIComponent(action.slice(5).slice(0, 300))}`;
  return `${base}/dashboard`;
}

export function weeklyEmail(r: WeeklyReport, reportId: string): { subject: string; html: string; text: string } {
  const base = appUrl();
  const blocks: Block[] = [
    { t: "p", text: r.working },
    { t: "p", text: r.pivot },
    ...r.items.map((it, i) => ({ t: "item" as const, n: i + 1, title: it.title, text: it.body, button: { label: it.label, href: actionHref(it.action, base) } })),
    { t: "stats", items: r.stats },
    { t: "p", text: r.closing },
    { t: "button", label: "Open the report in Ivyward", href: `${base}/dashboard?report=${reportId}`, secondary: true },
  ];
  const nice = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const text = [r.headline, "", r.working.replace(/\*\*/g, ""), "", r.pivot.replace(/\*\*/g, ""), "", ...r.items.flatMap((it, i) => [`${i + 1}. ${it.title}`, it.body.replace(/\*\*/g, ""), `${it.label}: ${actionHref(it.action, base)}`, ""]), r.stats.map((s) => `${s.value} ${s.label}`).join(" | "), "", r.closing, "", `Ivyward AI, next report ${nice(r.next_on)}`].join("\n");
  return {
    subject: r.headline.replace(/\*\*/g, "").slice(0, 140),
    html: emailHtml({ preheader: r.pivot.replace(/\*\*/g, ""), kicker: `Your weekly report, ${nice(r.week_of)}`, headline: r.headline, blocks, footer: `Ivyward AI, next report ${nice(r.next_on)}`, manageUrl: `${base}/settings` }),
    text,
  };
}

export async function runWeekly(userId: string): Promise<{ id: string; emailed: boolean }> {
  const db = admin();
  const now = new Date();
  const r = await buildWeekly(userId, now);
  const { data, error } = await db.from("digests").insert({ user_id: userId, period_start: new Date(now.getTime() - 7 * 86_400_000).toISOString(), period_end: now.toISOString(), content: r, sent_via: null }).select("id").single();
  if (error || !data) throw new Error(`weekly report: ${error?.message}`);
  let emailed = false;
  if (systemMailReady()) {
    const { data: u } = await db.auth.admin.getUserById(userId);
    if (u.user?.email) {
      const m = weeklyEmail(r, data.id as string);
      await sendSystem({ to: u.user.email, subject: m.subject, text: m.text, html: m.html, unsubscribeUrl: `${appUrl()}/settings`, tag: "weekly" }).then(() => (emailed = true)).catch(() => {});
      if (emailed) await db.from("digests").update({ sent_via: "resend" }).eq("id", data.id);
    }
  }
  return { id: data.id as string, emailed };
}

// mondays at 8am in each applicant's time zone
export async function scheduleWeekly(now = new Date()) {
  const { data } = await admin().from("profiles").select("id, timezone").eq("digest_enabled", true).limit(5000);
  let n = 0;
  for (const p of data ?? []) {
    const tz = p.timezone || "Africa/Lagos";
    let weekday = "";
    try {
      weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz }).format(now);
    } catch {
      weekday = now.toUTCString().slice(0, 3);
    }
    if (weekday !== "Mon" || localHour(tz, now) !== 8) continue;
    await enqueue({ userId: p.id, agent: "system", task: "weekly", idempotencyKey: `weekly:${p.id}:${iso(now)}` });
    n++;
  }
  return n;
}
