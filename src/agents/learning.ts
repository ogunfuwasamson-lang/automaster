import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { addLesson, clearLessonCache, scrub } from "@/lib/lessons";
import { host as hostOf } from "@/lib/school-memory";
import { sendSystem, systemMailReady } from "@/lib/mailer";
import { emailHtml } from "@/lib/email-layout";
import { appUrl } from "@/lib/gmail";

// the learning loop. per applicant (safe, used only for them, active at once): how they write, from their own edits
// and revision notes; what they keep and drop from a shortlist. across applicants (nightly): what gets portals
// unstuck, what gets replies, what applicants keep changing in essays, how fit predictions compare with decisions.
// cross-applicant lessons are proposed for an admin to approve, except notes about one portal, which are active
// at once and retire themselves when that portal keeps failing anyway.

const Lessons = z.object({ lessons: z.array(z.object({ text: z.string(), why: z.string() })) });
const Split = z.object({
  portal_notes: z.array(z.object({ host: z.string(), text: z.string() })),
  general: z.array(z.object({ text: z.string(), why: z.string() })),
});

const MAX_USER_WRITER = 12;
const day = 86_400_000;
const since = (days: number) => new Date(Date.now() - days * day).toISOString();

async function versionText(artifactId: string, version: number) {
  const { data } = await admin().from("artifact_versions").select("content, author").eq("artifact_id", artifactId).eq("version", version).maybeSingle();
  return data ? { content: String(data.content ?? ""), author: String(data.author ?? "") } : null;
}

// too many personal lessons: merge them into a short list (newest win when they disagree)
async function consolidate(userId: string, agent: string) {
  const db = admin();
  const { data } = await db.from("lessons").select("id, text").eq("scope", "user").eq("user_id", userId).eq("agent", agent).eq("status", "active").order("created_at", { ascending: true });
  if (!data || data.length <= MAX_USER_WRITER) return;
  const { output } = await runStructured({
    userId,
    agent: "learning",
    tier: "cheap",
    lessons: false,
    promptVersion: "consolidate-v1",
    system: "merge these notes about one applicant's preferences into at most 8 short, specific instructions. later notes win when two disagree. keep the applicant's own wording where it's precise. no duplicates.",
    prompt: data.map((l, i) => `${i + 1}. ${l.text}`).join("\n"),
    schema: Lessons,
    maxTokens: 1500,
  });
  await db.from("lessons").update({ status: "retired", retired_reason: "merged" }).in("id", data.map((l) => l.id));
  for (const l of output.lessons.slice(0, 8)) await addLesson({ scope: "user", userId, agent, text: l.text, status: "active", source: "merged" });
}

export const learning: Record<string, Handler> = {
  // the applicant rewrote an agent's draft: what does that say about how they want to sound?
  "learning.edit": async (job) => {
    const { artifactId, from, to } = job.payload as { artifactId: string; from: number; to: number };
    const [a, b] = await Promise.all([versionText(artifactId, from), versionText(artifactId, to)]);
    if (!a || !b || !a.author.startsWith("agent:") || a.content === b.content) return { skipped: "nothing to compare" };
    const { output } = await runStructured({
      userId: job.user_id,
      agent: "learning",
      jobId: job.id,
      tier: "cheap",
      lessons: false,
      promptVersion: "edit-lessons-v1",
      system: `an applicant edited an essay an AI drafted for them. infer what the edits say about how they want their writing to sound, as short instructions for the AI next time (tone, sentence length, words or phrases they removed or prefer, structure, what they cut as fluff, how they open and close). only patterns the edits clearly show; 0 to 4 instructions. never instructions about facts (those are corrections, not style). write them as "do ..." or "avoid ...".`,
      prompt: `AI draft:\n${a.content.slice(0, 8000)}\n\nthe applicant's version:\n${b.content.slice(0, 8000)}`,
      schema: Lessons,
      maxTokens: 1200,
    });
    let n = 0;
    for (const l of output.lessons.slice(0, 4)) if (await addLesson({ scope: "user", userId: job.user_id, agent: "writer", text: l.text, evidence: { artifactId, from, to, why: l.why }, status: "active" })) n++;
    await consolidate(job.user_id, "writer").catch(() => {});
    return { learned: n };
  },

  // a revision request in their own words ("less formal", "don't mention my dad")
  "learning.notes": async (job) => {
    const { notes, artifactId } = job.payload as { notes: string; artifactId: string };
    if (!notes || notes.trim().length < 6) return { skipped: "no notes" };
    const { output } = await runStructured({
      userId: job.user_id,
      agent: "learning",
      jobId: job.id,
      tier: "cheap",
      lessons: false,
      promptVersion: "note-lessons-v1",
      system: `an applicant asked the AI to revise an essay. pull out any preference that should hold for ALL their future essays (tone, length, words to avoid, things never to mention), as short instructions. requests that only make sense for this one essay are not lessons. 0 to 3 instructions.`,
      prompt: notes.slice(0, 3000),
      schema: Lessons,
      maxTokens: 800,
    });
    let n = 0;
    for (const l of output.lessons.slice(0, 3)) if (await addLesson({ scope: "user", userId: job.user_id, agent: "writer", text: l.text, evidence: { artifactId, notes: notes.slice(0, 500) }, status: "active" })) n++;
    await consolidate(job.user_id, "writer").catch(() => {});
    return { learned: n };
  },

  // what the applicant keeps and drops from the shortlist: their real preferences, for the next search
  "learning.shortlist": async (job) => {
    const db = admin();
    const { data: moves } = await db
      .from("events")
      .select("action, application_id, created_at")
      .eq("user_id", job.user_id)
      .eq("actor", "user")
      .in("action", ["application.dropped", "application.shortlisted"])
      .order("created_at", { ascending: false })
      .limit(60);
    if (!moves || moves.filter((m) => m.action === "application.dropped").length < 3) return { skipped: "not enough moves yet" };
    const ids = [...new Set(moves.map((m) => m.application_id).filter(Boolean))] as string[];
    const { data: apps } = await db.from("applications").select("id, tier, fit_score, programs(name, degree, tuition_usd, test_policy, duration_months, schools(name, country))").in("id", ids);
    const line = (id: string) => {
      const a = (apps ?? []).find((x) => x.id === id);
      const p = a?.programs as unknown as { name: string; degree: string; tuition_usd: number | null; test_policy: string | null; duration_months: number | null; schools: { name: string; country: string | null } } | null;
      return p ? `${p.schools.name} (${p.schools.country ?? "?"}), ${p.name} ${p.degree}; tuition ${p.tuition_usd ?? "?"} USD; tests ${p.test_policy ?? "?"}; ${p.duration_months ?? "?"} months; our tier ${a?.tier ?? "?"}` : null;
    };
    const kept = moves.filter((m) => m.action === "application.shortlisted").map((m) => line(m.application_id as string)).filter(Boolean);
    const dropped = moves.filter((m) => m.action === "application.dropped").map((m) => line(m.application_id as string)).filter(Boolean);
    const { output } = await runStructured({
      userId: job.user_id,
      agent: "learning",
      jobId: job.id,
      tier: "cheap",
      lessons: false,
      promptVersion: "shortlist-lessons-v1",
      system: `an applicant moved programs on the shortlist an AI built for them. infer their real preferences as short instructions for the AI's next search (countries or regions, cost ceilings, programme length, test requirements, school tier, programme type). only what the pattern clearly shows; 0 to 4 instructions.`,
      prompt: `kept or added back:\n${kept.join("\n") || "none"}\n\ndropped:\n${dropped.join("\n")}`,
      schema: Lessons,
      maxTokens: 1000,
    });
    let n = 0;
    for (const l of output.lessons.slice(0, 4)) if (await addLesson({ scope: "user", userId: job.user_id, agent: "recon", text: l.text, evidence: { kept: kept.length, dropped: dropped.length, why: l.why }, status: "active" })) n++;
    await consolidate(job.user_id, "recon").catch(() => {});
    return { learned: n };
  },

  // once a day, across everyone
  "learning.nightly": async (job) => {
    const out: Record<string, unknown> = {};
    out.portals = await learnPortals(job.user_id, job.id).catch((e) => `failed: ${e}`);
    out.outreach = await learnOutreach(job.user_id, job.id).catch((e) => `failed: ${e}`);
    out.writing = await learnWriting(job.user_id, job.id).catch((e) => `failed: ${e}`);
    out.decisions = await learnDecisions(job.user_id, job.id).catch((e) => `failed: ${e}`);
    out.retired = await retireWhatDoesntHelp().catch((e) => `failed: ${e}`);
    clearLessonCache();
    await reportToAdmin(out).catch(() => {});
    return out;
  },
};

// stuck portals: notes about each portal (active), and general lessons for the portal agent (proposed)
async function learnPortals(ownerId: string, jobId: string) {
  const db = admin();
  const { data: ev } = await db.from("events").select("application_id, context, created_at").eq("action", "runner.needs_you").gte("created_at", since(3)).limit(200);
  if (!ev?.length) return 0;
  const ids = [...new Set(ev.map((e) => e.application_id).filter(Boolean))] as string[];
  const { data: apps } = await db.from("applications").select("id, portal_url, runner_state").in("id", ids);
  const cases = ev
    .map((e) => {
      const a = (apps ?? []).find((x) => x.id === e.application_id);
      const st = (a?.runner_state ?? {}) as { last_url?: string; debug?: { title?: string; fields?: string[]; buttons?: string[]; errors?: string[] }; navHistory?: string[] };
      const c = e.context as { reason?: string; note?: string };
      const h = hostOf(st.last_url ?? a?.portal_url ?? "");
      if (!h || c.reason === "question" || c.reason === "unpaid") return null; // questions are the applicant's; payment isn't a portal problem
      return `[${h}] reason: ${c.reason}; note: ${scrub(c.note ?? "")}; page: ${st.debug?.title ?? "?"}; buttons: ${(st.debug?.buttons ?? []).slice(0, 25).join(" | ")}; fields: ${(st.debug?.fields ?? []).slice(0, 20).join(" | ")}; errors: ${(st.debug?.errors ?? []).join(" | ")}; last steps: ${(st.navHistory ?? []).slice(-6).join(" → ")}`;
    })
    .filter(Boolean)
    .slice(0, 40);
  if (!cases.length) return 0;
  const { output } = await runStructured({
    userId: ownerId,
    agent: "learning",
    jobId,
    tier: "write",
    lessons: false,
    promptVersion: "portal-lessons-v1",
    system: `you improve an AI agent that fills in university application portals. below are recent cases where it stopped and asked the applicant for help (page title, buttons, fields, errors, its last steps; never the applicant's answers).
1. portal_notes: for a specific portal host, a concrete instruction that would have got the agent past this point next time (e.g. "the Continue button is labelled 'Save & Next' at the bottom of each section", "accounts are created from the 'First-time user' tab"). only when the evidence shows it.
2. general: lessons that apply to many portals (a pattern seen on 2+ hosts). each with why.
short, imperative, no personal data. return empty lists if nothing is clear.`,
    prompt: cases.join("\n"),
    schema: Split,
    maxTokens: 2500,
  });
  let n = 0;
  for (const p of output.portal_notes.slice(0, 15)) {
    const h = p.host.replace(/^www\./, "").toLowerCase();
    if (!cases.some((c) => c!.startsWith(`[${h}]`))) continue;
    if (await addLesson({ scope: "global", agent: "runner", topic: h, text: p.text, evidence: { from: "stuck runs", at: new Date().toISOString() }, status: "active", source: "auto:portal" })) n++;
  }
  for (const g of output.general.slice(0, 5)) if (await addLesson({ scope: "global", agent: "runner", text: g.text, evidence: { why: g.why, cases: cases.length }, status: "proposed" })) n++;
  return n;
}

// which outreach emails got answers (and waivers) and which didn't
async function learnOutreach(ownerId: string, jobId: string) {
  const db = admin();
  const { data: sent } = await db
    .from("messages")
    .select("id, thread_id, subject, body, purpose, sent_at")
    .eq("direction", "out")
    .eq("status", "sent")
    .in("purpose", ["fee_waiver", "aid_reconsideration", "assistantship_inquiry", "scholarship_inquiry"])
    .gte("sent_at", since(120))
    .lte("sent_at", since(7))
    .limit(200);
  if (!sent || sent.length < 8) return "not enough sent yet";
  const { data: replies } = await db.from("messages").select("thread_id").eq("direction", "in").in("thread_id", sent.map((s) => s.thread_id));
  const answered = new Set((replies ?? []).map((r) => r.thread_id));
  const yes = sent.filter((s) => answered.has(s.thread_id));
  const no = sent.filter((s) => !answered.has(s.thread_id));
  if (yes.length < 2 || no.length < 2) return "no contrast yet";
  const show = (xs: typeof sent) => xs.slice(0, 10).map((s) => `(${s.purpose}) subject: ${scrub(s.subject ?? "")}\n${scrub(String(s.body ?? "").slice(0, 900))}`).join("\n---\n");
  const { output } = await runStructured({
    userId: ownerId,
    agent: "learning",
    jobId,
    tier: "write",
    lessons: false,
    promptVersion: "outreach-lessons-v1",
    system: `you improve an AI that writes emails from applicants to university admissions and financial-aid offices (fee waivers, aid, assistantships, scholarships). compare emails that got a reply with ones that didn't, and write 0 to 4 lessons for the AI (subject lines, length, how the ask is framed, what evidence is included, tone). only differences the examples clearly show; say why. no names or personal details.`,
    prompt: `GOT A REPLY (${yes.length}):\n${show(yes)}\n\nNO REPLY (${no.length}):\n${show(no)}`,
    schema: Lessons,
    maxTokens: 1500,
  });
  let n = 0;
  for (const l of output.lessons.slice(0, 4)) if (await addLesson({ scope: "global", agent: "closer", text: l.text, evidence: { why: l.why, replied: yes.length, unanswered: no.length }, status: "proposed" })) n++;
  return n;
}

// what three or more applicants keep changing in their essays: a lesson for everyone (proposed)
async function learnWriting(ownerId: string, jobId: string) {
  const db = admin();
  const { data } = await db.from("lessons").select("user_id, text").eq("scope", "user").eq("agent", "writer").eq("status", "active").gte("created_at", since(60)).limit(400);
  const users = new Set((data ?? []).map((l) => l.user_id));
  if (users.size < 3) return "fewer than 3 applicants with writing lessons";
  const { output } = await runStructured({
    userId: ownerId,
    agent: "learning",
    jobId,
    tier: "write",
    lessons: false,
    promptVersion: "writing-lessons-v1",
    system: `below are style preferences learned from different applicants' edits to AI-drafted essays (one applicant per line group). find preferences shared by at least 3 different applicants and turn each into a general instruction for the essay AI. 0 to 4. say why (how many applicants).`,
    prompt: [...users].map((u, i) => `applicant ${i + 1}:\n${(data ?? []).filter((l) => l.user_id === u).map((l) => `- ${l.text}`).join("\n")}`).join("\n\n"),
    schema: Lessons,
    maxTokens: 1500,
  });
  let n = 0;
  for (const l of output.lessons.slice(0, 4)) if (await addLesson({ scope: "global", agent: "writer", text: l.text, evidence: { why: l.why, applicants: users.size }, status: "proposed" })) n++;
  return n;
}

// admissions decisions against the fit the research predicted
async function learnDecisions(ownerId: string, jobId: string) {
  const db = admin();
  const { data } = await db
    .from("applications")
    .select("status, tier, fit_score, fit_reasoning, programs(name, degree, schools(name, country))")
    .in("status", ["admitted", "accepted", "rejected", "waitlisted"])
    .limit(300);
  if (!data || data.length < 8) return "fewer than 8 decisions";
  const rows = data.map((a) => {
    const p = a.programs as unknown as { name: string; degree: string; schools: { name: string; country: string | null } };
    return `${a.status}: ${p.schools.name} (${p.schools.country ?? "?"}) ${p.name}; predicted tier ${a.tier ?? "?"}, fit ${a.fit_score ?? "?"}; reasoning: ${scrub(String(a.fit_reasoning ?? "").slice(0, 300))}`;
  });
  const { output } = await runStructured({
    userId: ownerId,
    agent: "learning",
    jobId,
    tier: "write",
    lessons: false,
    promptVersion: "decision-lessons-v1",
    system: `you improve an AI that predicts an applicant's chances at programs (reach/target/safety tiers and a fit score). compare its predictions with real decisions and write 0 to 4 lessons where it was systematically too optimistic or pessimistic (by region, programme type, school tier...). say why with counts. no personal details.`,
    prompt: rows.join("\n"),
    schema: Lessons,
    maxTokens: 1500,
  });
  let n = 0;
  for (const l of output.lessons.slice(0, 4)) if (await addLesson({ scope: "global", agent: "recon", text: l.text, evidence: { why: l.why, decisions: data.length }, status: "proposed" })) n++;
  return n;
}

// the safety valve: lessons that don't help are switched off on their own (never switched on)
export async function retireWhatDoesntHelp() {
  const db = admin();
  let n = 0;
  // a note about one portal that the portal keeps failing after: retire it
  const { data: notes } = await db.from("lessons").select("id, topic, decided_at").eq("scope", "global").eq("agent", "runner").eq("status", "active").not("topic", "is", null).lte("decided_at", since(2));
  for (const l of notes ?? []) {
    const { data: ev } = await db.from("events").select("context, application_id").eq("action", "runner.needs_you").gte("created_at", l.decided_at as string).limit(200);
    const { data: apps } = await db.from("applications").select("id, portal_url, runner_state").in("id", [...new Set((ev ?? []).map((e) => e.application_id).filter(Boolean))] as string[]);
    const fails = (ev ?? []).filter((e) => {
      const a = (apps ?? []).find((x) => x.id === e.application_id);
      const reason = (e.context as { reason?: string }).reason;
      return reason !== "question" && reason !== "unpaid" && hostOf(((a?.runner_state ?? {}) as { last_url?: string }).last_url ?? a?.portal_url ?? "") === l.topic;
    }).length;
    if (fails >= 3) {
      await db.from("lessons").update({ status: "retired", retired_reason: `the portal still stopped ${fails} times after it` }).eq("id", l.id);
      n++;
    }
  }
  // general lessons: compare the agent's results in the two weeks after with the two weeks before
  const { data: general } = await db.from("lessons").select("id, agent, decided_at").eq("scope", "global").eq("status", "active").is("topic", null).lte("decided_at", since(14));
  for (const l of general ?? []) {
    const at = Date.parse(l.decided_at as string);
    const rate = await successRate(l.agent, at - 14 * day, at);
    const after = await successRate(l.agent, at, at + 14 * day);
    if (rate && after && after.n >= 20 && rate.n >= 20 && after.rate < rate.rate * 0.75) {
      await db.from("lessons").update({ status: "retired", retired_reason: `results got worse after it (${Math.round(rate.rate * 100)}% → ${Math.round(after.rate * 100)}%)` }).eq("id", l.id);
      n++;
    }
  }
  return n;
}

// the measure of "working" per agent: portal runs that didn't stop for help; outreach that got replies
async function successRate(agent: string, from: number, to: number): Promise<{ rate: number; n: number } | null> {
  const db = admin();
  const a = new Date(from).toISOString();
  const b = new Date(Math.min(to, Date.now())).toISOString();
  if (agent === "runner") {
    const [{ count: runs }, { count: stuck }] = await Promise.all([
      db.from("events").select("id", { count: "exact", head: true }).eq("action", "runner.started").gte("created_at", a).lt("created_at", b),
      db.from("events").select("id", { count: "exact", head: true }).eq("action", "runner.needs_you").in("context->>reason", ["stuck", "login", "account"]).gte("created_at", a).lt("created_at", b),
    ]);
    return runs ? { rate: 1 - Math.min(1, (stuck ?? 0) / runs), n: runs } : null;
  }
  if (agent === "closer") {
    const { data: sent } = await db.from("messages").select("thread_id").eq("direction", "out").eq("status", "sent").gte("sent_at", a).lt("sent_at", b).limit(1000);
    if (!sent?.length) return null;
    const { data: rep } = await db.from("messages").select("thread_id").eq("direction", "in").in("thread_id", sent.map((s) => s.thread_id));
    return { rate: new Set((rep ?? []).map((r) => r.thread_id)).size / sent.length, n: sent.length };
  }
  return null;
}

async function reportToAdmin(out: Record<string, unknown>) {
  if (!systemMailReady()) return;
  const db = admin();
  const { count: proposed } = await db.from("lessons").select("id", { count: "exact", head: true }).eq("status", "proposed");
  const { count: newToday } = await db.from("lessons").select("id", { count: "exact", head: true }).gte("created_at", since(1));
  if (!proposed && !newToday) return;
  const to = process.env.ADMIN_ALERT_EMAIL || "emailolaoluwa@gmail.com";
  const text = `Learned today: ${newToday ?? 0}. Waiting for your approval: ${proposed ?? 0}.\n${JSON.stringify(out)}`;
  await sendSystem({
    to,
    subject: `Ivyward learned ${newToday ?? 0} things today${proposed ? `: ${proposed} waiting for you` : ""}`,
    text,
    html: emailHtml({
      kicker: "Learning",
      headline: proposed ? `${proposed} lesson${proposed === 1 ? "" : "s"} waiting for your approval` : "What Ivyward learned today",
      blocks: [
        { t: "stats", items: [{ label: "Learned today", value: String(newToday ?? 0) }, { label: "Waiting for you", value: String(proposed ?? 0) }] },
        { t: "p", text: "Lessons about one applicant or one portal are already in use. Lessons for everyone wait for your approval." },
        { t: "button", label: "Review them", href: `${appUrl()}/admin#learning` },
      ],
    }),
  });
}
