// design preview: a fake supabase client that answers from fixtures, so signed-in screens can be
// rendered and screenshotted locally without an account or a database. development only:
// it is never active in a production build.
import type { User } from "@supabase/supabase-js";

export const previewMode = () => process.env.NODE_ENV !== "production" && process.env.AM_PREVIEW === "1";

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

const PROFILE = {
  identity: { full_name: "Ada Okafor", citizenship: "Nigeria", country_of_residence: "Nigeria", city: "Lagos" },
  education: [{ institution: "University of Lagos", degree: "B.Sc", field: "Economics", country: "Nigeria", start: "2012", end: "2016", grade: "Second Class Upper", gpa: null, gpa_scale: null }],
  work: [
    { company: "Paystack", role: "Partnerships Lead", start: "2021", end: null, location: "Lagos", highlights: ["Grew merchant base from 2,000 to 11,000", "Closed 14 bank partnerships"] },
    { company: "Kuda", role: "Business Development Manager", start: "2018", end: "2021", location: "Lagos", highlights: ["Launched SME onboarding, 40% faster activation"] },
  ],
  tests: [{ name: "GMAT", status: "planned", score: null, date: null }],
  english: { route: "waiver", notes: "Degree taught in English" },
  goals: {
    study_level: "masters",
    fields: ["Business", "Finance"],
    research_interests: null,
    degree_types: ["MBA", "MS / MSc"],
    target_term: "Fall 2027",
    short_term_goal: "Product strategy at a global fintech",
    long_term_goal: "Build payments infrastructure for African SMEs",
    why_masters: "To move from partnerships into product leadership",
    gmat_gre_plan: "avoid",
  },
  funding: { need: "partial", annual_budget_usd: 20000, application_fee_budget_usd: 600, notes: null },
  preferences: { regions: ["us", "uk", "canada"], locations: [], avoid: null, stem_preferred: true, max_applications: 12 },
  recommenders: { count_lined_up: 2, notes: null },
  stories: [{ title: "Scaled merchant onboarding", summary: "Rebuilt the onboarding flow with ops and product and cut activation time.", metrics: ["5.5x merchants", "40% faster"] }],
  skills: ["Partnerships", "SQL", "Negotiation"],
  notes: [],
  confirmed_facts: [],
  skipped_gaps: [],
};

const school = (name: string, country: string) => ({ name, country, city: null, state: null, region: country === "United Kingdom" ? "uk" : country === "Canada" ? "canada" : "us", ranking_note: null });
const art = (kind: string, title: string, approved: boolean, version = 2) => ({
  id: `${title}-${kind}`,
  kind,
  title,
  prompt: kind === "strategy" ? null : "Why this program, and why now? (500 words)",
  word_limit: kind === "strategy" ? null : 500,
  current_version: version,
  artifact_versions: [
    {
      id: `${title}-v${version}`,
      version,
      content:
        kind === "strategy"
          ? "Lead with the merchant growth story. Tie it to the program's fintech lab and the entrepreneurship track."
          : "When I joined Paystack, 2,000 merchants used us. Three years later it was 11,000, and most of that growth came from one change: we stopped asking small businesses to fill in forms they did not understand...\n\nThat is why I want to study here.",
      author: "agent",
      critique: { status: "ready", unsupported_claims: [], issues: [{ severity: "low", issue: "the ending is abrupt", fix: "close on what you will build after the program" }], summary: "Specific and well supported." },
      user_approved_at: approved ? ago(600) : null,
      created_at: ago(900),
    },
  ],
});
const app = (id: string, s: { name: string; country: string }, prog: string, status: string, due: number | null, runner = "idle", note: string | null = null, arts = [art("essay", "Why this program", status === "packet_approved"), art("short_answer", "Career goals", true)]) => ({
  id,
  status,
  tier: "target",
  fit_score: 8,
  fit_reasoning: "Strong match for fintech product goals.\n⚑ GMAT waiver is case by case",
  angle: "Operator who scaled merchant payments",
  target_deadline: due === null ? null : day(due),
  portal_url: null,
  attested_at: status === "packet_approved" ? ago(1000) : null,
  runner_status: runner,
  runner_note: note,
  runner_updated_at: ago(30),
  runner_live_url: null,
  runner_state: {},
  programs: {
    id: `p-${id}`,
    name: prog,
    degree: prog.split(" ")[0],
    url: "https://example.edu/program",
    stem_designated: true,
    test_policy: "waivable",
    app_fee_usd: 90,
    fee_waiver: "Available on request for candidates from emerging markets",
    tuition_usd: 54000,
    deadlines: due === null ? [] : [{ round: "Round 1", date: day(due), funding_priority: "yes" }],
    funding_signals: { full_funding_realistic: "possible", summary: "Merit scholarships up to 50% for Round 1 applicants.", english_moi_waiver: "accepted", post_study_work: null },
    source_urls: ["https://example.edu/a", "https://example.edu/b"],
    schools: school(s.name, s.country),
    funding_opportunities: [{ name: "Dean's Fellowship", kind: "merit_scholarship", amount_note: "Up to $25,000", intl_eligible: true, url: null }],
  },
  artifacts: [art("strategy", "Positioning", false, 1), ...arts],
});

const APPS = [
  app("a1", { name: "University of Edinburgh", country: "United Kingdom" }, "MSc Finance and Technology", "packet_approved", 7, "needs_you", "add your country of birth in Profile, under Details for application forms, then choose Try again"),
  app("a2", { name: "Rice University, Jones School", country: "United States" }, "MBA, Full-time", "ready_for_review", 9),
  app("a3", { name: "University of Toronto, Rotman", country: "Canada" }, "Master of Financial Risk Management", "packet_approved", 12, "needs_you", "this portal blocks automated sign-ups. Create the account yourself with the password shown on this application."),
  app("a4", { name: "Boston University Questrom", country: "United States" }, "Full-time MBA", "preparing", 20, "idle", null, [art("essay", "Why Questrom", false), art("short_answer", "Leadership", true)]),
  app("a5", { name: "Imperial College Business School", country: "United Kingdom" }, "MSc Innovation, Entrepreneurship and Management", "packet_approved", 31, "running"),
  app("a6", { name: "Georgetown McDonough", country: "United States" }, "MS Business Analytics", "submitted", 40, "submitted", "portal showed a confirmation"),
  app("a7", { name: "McGill Desautels", country: "Canada" }, "Master of Management in Analytics", "shortlisted", 55),
  app("a8", { name: "Duke Fuqua", country: "United States" }, "MMS: Foundations of Business", "researching", 70),
];

const TABLES: Record<string, Record<string, unknown>[]> = {
  profiles: [{ id: "u1", profile: PROFILE, portal_details: { email: "ada@example.com", phone: "+234 800 000 0000", city: "Lagos", country: "Nigeria" }, fee_envelope_cents: 20000, digest_enabled: true, is_admin: true, plan: "pro", email: "ada@example.com", monthly_budget_usd: null, created_at: ago(9000) }],
  documents: [
    { id: "d1", kind: "cv", filename: "Ada-Okafor-CV.pdf", status: "extracted", extracted: { summary: "CV with 7 years in fintech partnerships and business development." }, created_at: ago(5000) },
    { id: "d2", kind: "transcript", filename: "UNILAG-transcript.pdf", status: "extracting", extracted: null, created_at: ago(2) },
  ],
  approvals: [
    { id: "ap1", kind: "record_decision", title: "Georgetown says your application is complete", summary: "Recorded from an email this morning. Confirm to update the status.", payload: { link: "https://mail.google.com" }, status: "pending", urgency: 2 },
    { id: "ap2", kind: "fact_confirm", title: "Which graduation year is right?", summary: "Your CV says 2016 and your transcript says 2017.", payload: { options: ["2016", "2017"] }, status: "pending", urgency: 1 },
  ],
  applications: APPS,
  events: [
    { id: "e0", actor: "agent:writer", action: "artifact.ready_for_user", application_id: "a2", context: { title: "Why Rice" }, created_at: ago(22) },
    { id: "e1", actor: "agent:inbox", action: "inbox.classified", context: {}, created_at: ago(4) },
    { id: "e2", actor: "agent:writer", action: "artifact.ready_for_user", context: { title: "Why Rice" }, created_at: ago(22) },
    { id: "e3", actor: "agent:runner", action: "runner.portal_found", context: {}, created_at: ago(65) },
    { id: "e4", actor: "agent:recon", action: "recon.discovered", context: {}, created_at: ago(190) },
    { id: "e5", actor: "user", action: "application.packet_approved", context: {}, created_at: ago(300) },
  ],
  messages: [
    { id: "m1", direction: "in", subject: "Your application is complete", body: "Thank you for applying to the MS in Business Analytics. Your file is now with the committee.", purpose: "other", sent_at: ago(240), status: "received", threads: { application_id: "a6" } },
    { id: "m2", direction: "out", status: "scheduled", subject: "Application fee waiver request", to_email: "admissions@rice.edu", send_after: new Date(Date.now() + 6 * 60_000).toISOString(), body: "Dear Admissions team, ..." },
  ],
  ripcords: [],
  jobs: [
    { id: "j1", status: "running", agent: "writer", task: "draft", payload: {}, last_error: null },
    { id: "j2", status: "queued", agent: "recon", task: "research", payload: {}, last_error: null },
  ],
  grants: [
    { capability: "research", mode: "auto", undo_seconds: 0 },
    { capability: "draft", mode: "auto", undo_seconds: 0 },
    { capability: "email.new_contact", mode: "auto_undo", undo_seconds: 600 },
    { capability: "submit", mode: "auto", undo_seconds: 0 },
    { capability: "sign", mode: "approve", undo_seconds: 0 },
  ],
  mail_accounts: [{ email: "ada@example.com", status: "active", last_error: null }],
  runner_tokens: [],
  portal_accounts: [
    { id: "pa1", user_id: "u1", application_id: "a3", portal_host: "apply.rotman.utoronto.ca", login_email: "ada@example.com", status: "created", created_at: ago(400), applications: { id: "a3", portal_url: "https://apply.rotman.utoronto.ca", programs: { name: "MFRM", schools: { name: "University of Toronto, Rotman" } } } },
    { id: "pa2", user_id: "u1", application_id: "a6", portal_host: "gradapply.georgetown.edu", login_email: "ada.okafor", status: "verified", created_at: ago(3000), applications: { id: "a6", portal_url: null, programs: { name: "MSBA", schools: { name: "Georgetown McDonough" } } } },
  ],
  recommenders: [{ name: "Tunde Bakare", email: "tunde@example.com", title: "VP Partnerships", organization: "Paystack", relationship: "Manager", phone: null }],
  interview_turns: [
    { session_id: "s1", role: "agent", content: "Let's start with your work. What's the result you're proudest of at Paystack?", created_at: ago(30) },
    { session_id: "s1", role: "user", content: "Growing the merchant base from two thousand to eleven thousand in three years.", created_at: ago(29) },
    { session_id: "s1", role: "agent", content: "That's a strong number. What did you personally change to make that happen?", created_at: ago(28) },
  ],
  user_funding: [{ id: "f1", fit: "strong", why: "Rewards fintech founders and operators from Africa.", status: "suggested", funding_opportunities: { name: "Mastercard Foundation Scholars", sponsor: "Mastercard Foundation", url: null, amount_note: "Full tuition and living costs", deadline: day(45), eligibility: "African citizens", intl_eligible: true } }],
  threads: [
    {
      id: "t1", subject: "Application fee waiver request", created_at: ago(3000), application_id: "a2",
      contacts: { name: "Rice Admissions", email: "admissions@rice.edu" },
      applications: { programs: { schools: { name: "Rice University, Jones School" } } },
      messages: [
        { id: "mm1", direction: "out", subject: "Application fee waiver request", body: "Dear Admissions team,\n\nI'm applying to the full-time MBA for Fall 2027 and would like to ask whether a fee waiver is available for applicants from Nigeria...\n\nKind regards,\nAda Okafor", status: "sent", to_email: "admissions@rice.edu", purpose: "fee_waiver", send_after: null, sent_at: ago(2900), created_at: ago(3000) },
        { id: "mm2", direction: "in", subject: "Re: Application fee waiver request", body: "Hi Ada,\n\nThanks for reaching out. We've applied a fee waiver to your application. You'll see it at checkout.\n\nBefore we can review your file, please upload an unofficial transcript to the portal by November 1.\n\nBest,\nMaria Lopez\nJones School Admissions", summary: "Rice waived your application fee and asks for an unofficial transcript before review.", from_email: "mlopez@rice.edu", from_name: "Maria Lopez", action_needed: "upload an unofficial transcript", due_date: day(8), read_at: null, status: "sent", to_email: null, purpose: "fee_waiver_reply", send_after: null, sent_at: ago(240), created_at: ago(240) },
      ],
    },
    {
      id: "t3", subject: "Interview availability", created_at: ago(100), application_id: "a2",
      contacts: { name: "Rice Admissions", email: "admissions@rice.edu" },
      applications: { programs: { schools: { name: "Rice University, Jones School" } } },
      messages: [{ id: "mm6", direction: "in", subject: "Interview availability", body: "Hi Ada, we'd like to invite you to interview. Please pick a slot by November 5.", summary: "Rice invites you to interview; pick a slot by November 5.", from_email: "interviews@rice.edu", from_name: "Jones Interviews", action_needed: "pick an interview slot", due_date: day(12), read_at: null, status: "sent", to_email: null, purpose: "interview_invite", send_after: null, sent_at: ago(90), created_at: ago(90) }],
    },
    {
      id: "t2", subject: "Question about scholarship deadlines", created_at: ago(60), application_id: "a4",
      contacts: { name: null, email: "gradadmissions@bu.edu" },
      applications: { programs: { schools: { name: "Boston University Questrom" } } },
      messages: [{ id: "mm4", direction: "in", subject: "Merit scholarships", body: "Dear Ada, all Round 1 applicants are considered automatically.", summary: "All Round 1 applicants are considered for merit scholarships automatically.", from_email: "gradadmissions@bu.edu", from_name: null, action_needed: null, due_date: null, read_at: ago(30), status: "sent", to_email: null, purpose: "info_or_marketing", send_after: null, sent_at: ago(9000), created_at: ago(9000) }, { id: "mm5", direction: "out", subject: "Re: Merit scholarships", body: "Thank you. Could you also confirm whether the GMAT can be waived for applicants with seven years of experience?", status: "draft", to_email: "gradadmissions@bu.edu", purpose: "reply", send_after: null, sent_at: null, created_at: ago(20) }, { id: "mm3", direction: "out", subject: "Question about scholarship deadlines", body: "Hello, could you confirm whether Round 1 applicants are automatically considered for merit scholarships?", status: "scheduled", to_email: "gradadmissions@bu.edu", purpose: "scholarship_inquiry", send_after: new Date(Date.now() + 5 * 60_000).toISOString(), sent_at: null, created_at: ago(2) }],
    },
  ],
  agent_runs: [],
};

type Row = Record<string, unknown>;
class Query implements PromiseLike<{ data: unknown; count: number | null; error: null }> {
  private rows: Row[];
  private head = false;
  private one: "single" | "maybe" | null = null;
  private max: number | null = null;
  constructor(table: string) {
    this.rows = [...(TABLES[table] ?? [])];
  }
  private filter(fn: (r: Row) => boolean) {
    this.rows = this.rows.filter(fn);
    return this;
  }
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.head) this.head = true;
    return this;
  }
  eq(col: string, v: unknown) {
    return this.filter((r) => !(col in r) || r[col] === v);
  }
  neq(col: string, v: unknown) {
    return this.filter((r) => !(col in r) || r[col] !== v);
  }
  in(col: string, vs: unknown[]) {
    return this.filter((r) => !(col in r) || vs.includes(r[col]));
  }
  is(col: string, v: unknown) {
    return this.filter((r) => !(col in r) || r[col] === v);
  }
  not(col: string, op: string, v: string) {
    if (op === "in") {
      const vs = v.replace(/[()]/g, "").split(",");
      return this.filter((r) => !(col in r) || !vs.includes(String(r[col])));
    }
    if (op === "like") {
      const re = new RegExp("^" + v.replace(/%/g, ".*") + "$");
      return this.filter((r) => !(col in r) || !re.test(String(r[col])));
    }
    return this;
  }
  ilike(col: string, v: string) {
    const re = new RegExp("^" + v.replace(/%/g, ".*") + "$", "i");
    return this.filter((r) => col in r && re.test(String(r[col] ?? "")));
  }
  like(col: string, v: string) {
    return this.ilike(col, v);
  }
  gte() {
    return this;
  }
  lte() {
    return this;
  }
  order() {
    return this;
  }
  range() {
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }
  // writes are accepted and ignored
  insert() {
    return this;
  }
  update() {
    return this;
  }
  upsert() {
    return this;
  }
  delete() {
    return this;
  }
  then<A, B>(ok?: ((v: { data: unknown; count: number | null; error: null }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    const rows = this.max != null ? this.rows.slice(0, this.max) : this.rows;
    const data = this.head ? null : this.one ? (rows[0] ?? null) : rows;
    return Promise.resolve({ data, count: this.rows.length, error: null as null }).then(ok, bad);
  }
}

export function previewClient() {
  return {
    from: (t: string) => new Query(t),
    rpc: async () => ({ data: null, error: null }),
    auth: { getUser: async () => ({ data: { user: PREVIEW_USER }, error: null }) },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) },
  };
}

export const PREVIEW_USER = { id: "u1", email: "ada@example.com" } as unknown as User;
