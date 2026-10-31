import "server-only";
import { createHash } from "node:crypto";
import { admin } from "@/lib/supabase/admin";

// what the agents learn about each school, shared across applicants (see 0019_school_knowledge.sql).
// facts about the school only. every fact carries how many separate applicants it held for and when it was
// last seen; agents treat it as a starting hint and still check the live page or inbox.

export type Kind = "apply_url" | "portal" | "field" | "contact" | "waiver" | "prompt";

export interface Fact {
  kind: Kind;
  key: string;
  value: Record<string, unknown>;
  confirmations: number;
  failures: number;
  contributors: string[];
  last_seen: string;
}

// how long a fact stays usable without being seen again. prompts and apply links change every cycle; contacts
// and how a portal behaves drift more slowly.
const SHELF_DAYS: Record<Kind, number> = { apply_url: 300, prompt: 300, portal: 400, field: 540, contact: 540, waiver: 400 };

// how many separate applicants must agree before a fact is acted on without checking first
const TRUST: Record<Kind, number> = { apply_url: 1, prompt: 1, portal: 2, field: 1, contact: 1, waiver: 1 };

export const who = (userId: string) => createHash("sha256").update(`ivw-school-memory:${userId}`).digest("hex").slice(0, 16);

export function fresh(f: Pick<Fact, "kind" | "last_seen">, now = Date.now()) {
  return now - Date.parse(f.last_seen) < SHELF_DAYS[f.kind] * 86_400_000;
}

// usable: fresh, held more often than it failed, and confirmed by enough separate applicants
export function trusted(f: Fact, now = Date.now()) {
  return fresh(f, now) && f.confirmations > f.failures && f.contributors.length >= TRUST[f.kind];
}

export const labelKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/\*|\(?(required|optional)\)?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 120);

// record that a fact held (ok) or didn't. merges the value; a different applicant adds a contributor.
type Value = Record<string, unknown>;
export async function learn(userId: string, schoolId: string | null | undefined, kind: Kind, key: string, value: Value | ((prev: Value) => Value) = {}, ok = true) {
  if (!schoolId || !key) return;
  const db = admin();
  const k = key.slice(0, 300);
  const me = who(userId);
  const { data: row, error } = await db.from("school_knowledge").select("id, value, confirmations, failures, contributors").eq("school_id", schoolId).eq("kind", kind).eq("key", k).maybeSingle();
  if (error) return; // table not there yet
  const now = new Date().toISOString();
  const next = (prev: Value) => (typeof value === "function" ? value(prev) : { ...prev, ...value });
  if (!row) {
    await db.from("school_knowledge").insert({ school_id: schoolId, kind, key: k, value: next({}), confirmations: ok ? 1 : 0, failures: ok ? 0 : 1, contributors: ok ? [me] : [], last_seen: now });
    return;
  }
  const contributors = (row.contributors as string[]) ?? [];
  await db
    .from("school_knowledge")
    .update({
      value: ok ? next((row.value as Value) ?? {}) : row.value,
      confirmations: row.confirmations + (ok ? 1 : 0),
      failures: row.failures + (ok ? 0 : 1),
      contributors: ok && !contributors.includes(me) ? [...contributors, me].slice(-50) : contributors,
      last_seen: now,
    })
    .eq("id", row.id);
}

export async function recall(schoolId: string | null | undefined, kinds?: Kind[]): Promise<Fact[]> {
  if (!schoolId) return [];
  let q = admin().from("school_knowledge").select("kind, key, value, confirmations, failures, contributors, last_seen").eq("school_id", schoolId).limit(500);
  if (kinds?.length) q = q.in("kind", kinds);
  const { data, error } = await q;
  if (error) return [];
  return ((data ?? []) as Fact[]).filter((f) => fresh(f));
}

export const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// --- what each agent asks ---

// a known application link for this program (or the school's only one)
export async function knownApplyUrl(schoolId: string | null | undefined, programId: string): Promise<string | null> {
  const facts = (await recall(schoolId, ["apply_url"])).filter((f) => trusted(f));
  const mine = facts.find((f) => f.key === programId) ?? (facts.length === 1 && facts[0].key === "school" ? facts[0] : null);
  return (mine?.value.url as string) ?? null;
}

// the portal won't let automated sign-ups (or cloud browsers) through, by several applicants' experience
export async function portalNeedsChrome(schoolId: string | null | undefined, portalHost: string): Promise<string | null> {
  if (!portalHost) return null;
  const facts = await recall(schoolId, ["portal"]);
  const get = (k: string) => facts.find((f) => f.key === `${portalHost}:${k}`);
  const ok = get("signup_ok");
  for (const bad of ["signup_blocked", "cloud_blocked"]) {
    const f = get(bad);
    if (f && trusted(f) && f.confirmations > (ok?.confirmations ?? 0)) return bad === "signup_blocked" ? "this portal has blocked automated sign-ups for other applicants" : "this portal has blocked cloud browsers for other applicants";
  }
  return null;
}

// form labels on this portal and the profile key that filled them in submitted applications
export async function fieldHints(schoolId: string | null | undefined, portalHost: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!portalHost) return out;
  for (const f of await recall(schoolId, ["field"])) {
    if (!f.key.startsWith(`${portalHost}|`) || !trusted(f) || typeof f.value.sheet_key !== "string") continue;
    out.set(f.key.slice(portalHost.length + 1), f.value.sheet_key);
  }
  return out;
}

export async function knownPrompts(schoolId: string | null | undefined, programId: string): Promise<{ title: string; prompt: string; word_limit: number | null; kind: string }[]> {
  return (await recall(schoolId, ["prompt"]))
    .filter((f) => f.key.startsWith(`${programId}|`) && trusted(f))
    .sort((a, b) => b.confirmations - a.confirmations)
    .map((f) => ({ title: String(f.value.title ?? "Essay"), prompt: String(f.value.prompt ?? ""), word_limit: typeof f.value.word_limit === "number" ? f.value.word_limit : null, kind: String(f.value.kind ?? "essay") }))
    .filter((p) => p.prompt);
}

// a short, plain summary for the writing and outreach agents: what has worked at this school before
export async function schoolBrief(schoolId: string | null | undefined): Promise<string> {
  if (!schoolId) return "";
  const facts = await recall(schoolId, ["contact", "waiver", "portal"]);
  const { data: pb } = await admin().from("playbooks").select("content, created_at").eq("school_id", schoolId).order("version", { ascending: false }).limit(1).maybeSingle();
  return briefText(facts, (pb?.content as Record<string, unknown> | undefined) ?? null);
}

export function briefText(facts: Fact[], playbook: Record<string, unknown> | null): string {
  const lines: string[] = [];
  const n = (f: Fact) => `${f.contributors.length} applicant${f.contributors.length === 1 ? "" : "s"}`;
  const contacts = facts.filter((f) => f.kind === "contact").sort((a, b) => Number(b.value.replies ?? 0) - Number(a.value.replies ?? 0));
  for (const c of contacts.slice(0, 6)) {
    const replies = Number(c.value.replies ?? 0);
    const sent = Number(c.value.sent ?? 0);
    if (c.value.bounced) lines.push(`- ${c.key} bounced: don't use it`);
    else if (replies) lines.push(`- ${c.key} (${c.value.office ?? "office"}) replied to ${replies} of ${Math.max(sent, replies)} emails${c.value.reply_hours ? `, usually within ${Math.round(Number(c.value.reply_hours))} hours` : ""}`);
    else if (sent >= 2) lines.push(`- ${c.key} (${c.value.office ?? "office"}): ${sent} emails, no reply yet`);
  }
  for (const w of facts.filter((f) => f.kind === "waiver" && f.confirmations > 0).slice(0, 4)) {
    const granted = Number(w.value.granted ?? 0);
    lines.push(`- fee waiver via ${w.value.how ?? w.key}${granted ? `: granted ${granted} time${granted === 1 ? "" : "s"}` : ""} (${n(w)})${w.value.note ? `. ${w.value.note}` : ""}`);
  }
  for (const p of facts.filter((f) => f.kind === "portal" && trusted(f))) {
    if (p.key.endsWith(":signup_blocked")) lines.push(`- the portal blocked automated sign-ups (${n(p)})`);
    if (p.key.endsWith(":cloud_blocked")) lines.push(`- the portal blocked cloud browsers (${n(p)})`);
  }
  if (playbook) {
    const s = JSON.stringify(playbook);
    if (s.length > 2) lines.push(`- research notes: ${s.slice(0, 900)}`);
  }
  return lines.length ? `what earlier Ivyward applicants found at this school (hints: check before relying on them):\n${lines.join("\n")}` : "";
}

// --- what the email side learns ---

const OFFICE: Record<string, string> = { fee_waiver: "admissions", aid_reconsideration: "financial aid", assistantship_inquiry: "graduate school", scholarship_inquiry: "scholarships", other: "admissions" };
// only school offices are shared: never a referee, a professor written to personally, or anything the applicant wrote
export const sharedPurpose = (purpose: string | null | undefined) => !!purpose && purpose in OFFICE;

export async function learnSent(userId: string, schoolId: string | null | undefined, email: string, purpose: string) {
  if (!sharedPurpose(purpose)) return;
  await learn(userId, schoolId, "contact", email.toLowerCase(), (v) => ({ ...v, office: v.office ?? OFFICE[purpose], sent: Number(v.sent ?? 0) + 1 }));
}

export async function learnReply(userId: string, schoolId: string | null | undefined, email: string, hours: number | null) {
  await learn(userId, schoolId, "contact", email.toLowerCase(), (v) => {
    const replies = Number(v.replies ?? 0) + 1;
    const avg = hours == null ? v.reply_hours : v.reply_hours == null ? hours : (Number(v.reply_hours) * (replies - 1) + hours) / replies;
    return { ...v, replies, ...(avg != null ? { reply_hours: Math.round(Number(avg) * 10) / 10 } : {}), bounced: false };
  });
}

export async function learnBounce(userId: string, schoolId: string | null | undefined, email: string) {
  await learn(userId, schoolId, "contact", email.toLowerCase(), (v) => ({ ...v, bounced: true }), true);
}

export async function learnWaiver(userId: string, schoolId: string | null | undefined, key: string, how: string, granted: boolean, note?: string) {
  await learn(userId, schoolId, "waiver", key, (v) => ({ ...v, how, ...(note ? { note: note.slice(0, 200) } : {}), granted: Number(v.granted ?? 0) + (granted ? 1 : 0) }));
}

// a link from a school email, without anything personal in it (query strings and fragments carry tracking ids)
export function bareLink(u: string): string | null {
  try {
    const x = new URL(u);
    const path = x.pathname.split("/").filter((seg) => seg && !/[0-9a-f]{12,}|[A-Za-z0-9_-]{24,}/.test(seg)).join("/");
    return `${x.hostname.replace(/^www\./, "")}/${path}`.slice(0, 200);
  } catch {
    return null;
  }
}

export async function learnPrompts(userId: string, schoolId: string | null | undefined, programId: string, essays: { title: string; prompt: string; word_limit: number | null; kind: string }[]) {
  for (const e of essays.slice(0, 8)) {
    if (!e.prompt || e.prompt.length < 15) continue;
    const id = createHash("sha256").update(e.prompt.toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);
    await learn(userId, schoolId, "prompt", `${programId}|${id}`, { title: e.title.slice(0, 120), prompt: e.prompt.slice(0, 2000), word_limit: e.word_limit, kind: e.kind });
  }
}
