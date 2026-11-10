import { describe, it, expect, vi, beforeEach } from "vitest";
import { essaysReady, dueBucket, officialEmail } from "@/lib/writing";

// the three places applicants were being dropped: setup -> shortlist, essays -> their review, and the checks on
// what an agent may email
describe("an application is ready for the applicant's review", () => {
  const v = (version: number, status: string | null, author = "agent:writer") => ({ version, status, author });
  it("when every written piece's current version passed review", () => {
    expect(essaysReady([{ kind: "statement_of_purpose", current_version: 2, versions: [v(1, "revising"), v(2, "ready")] }, { kind: "strategy", current_version: 1, versions: [v(1, null)] }])).toBe(true);
  });
  it("not while a piece is still in the loop, or has no draft yet", () => {
    expect(essaysReady([{ kind: "short_answer", current_version: 1, versions: [v(1, "ready")] }, { kind: "personal_statement", current_version: 2, versions: [v(1, "ready"), v(2, "reviewing")] }])).toBe(false);
    expect(essaysReady([{ kind: "personal_statement", current_version: 0, versions: [] }])).toBe(false);
  });
  it("not when the plan found nothing to write (only the brief exists)", () => {
    expect(essaysReady([{ kind: "strategy", current_version: 1, versions: [v(1, null)] }])).toBe(false);
  });
  it("counts the applicant's own edit as ready", () => {
    expect(essaysReady([{ kind: "personal_statement", current_version: 3, versions: [v(3, null, "user")] }])).toBe(true);
  });
  it("reminds a week out, three days out and the day before", () => {
    expect([9, 7, 5, 3, 2, 1, 0, -1].map(dueBucket)).toEqual([null, "7", "7", "3", "3", "1", "1", null]);
  });
});

describe("an address an agent may email", () => {
  const research = "Fee waivers: email Graduate Admissions at gradadmit@buffalo.edu (https://buffalo.edu/grad/fees).";
  it("is one the research found", () => {
    expect(officialEmail("GradAdmit@buffalo.edu", research)).toBe("GradAdmit@buffalo.edu");
  });
  it("is never one the model made up, or a malformed one", () => {
    expect(officialEmail("admissions@buffalo.edu", research)).toBe("");
    expect(officialEmail("not an email", research)).toBe("");
    expect(officialEmail("", research)).toBe("");
  });
});

// startShortlist: mocked store
const state = { profile: {} as Record<string, unknown>, docs: 0, apps: 0, runs: 0, enqueued: [] as unknown[] };
vi.mock("server-only", () => ({}));
vi.mock("@/lib/profile-store", () => ({ getProfile: async () => state.profile }));
vi.mock("@/lib/queue", () => ({ enqueue: async (j: unknown) => state.enqueued.push(j) }));
vi.mock("@/lib/events", () => ({ logEvent: async () => "" }));
vi.mock("@/lib/notify", () => ({ notify: async () => {}, resolve: async () => {} }));
vi.mock("@/lib/limits", () => ({ checkLimit: async () => null }));
vi.mock("@/lib/gmail", () => ({ canReadMail: async () => true }));
vi.mock("@/lib/supabase/admin", () => ({
  admin: () => ({
    from: (t: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in"]) q[m] = () => q;
      q.then = (res: (v: { count: number }) => void) => res({ count: t === "documents" ? state.docs : t === "applications" ? state.apps : state.runs });
      return q;
    },
  }),
}));

describe("the shortlist starts as soon as the agents can search well", () => {
  const p = (fields: string[] | null, level: string | null = "masters", regions = ["uk"]) => ({ goals: { study_level: level, fields }, preferences: { regions } });
  beforeEach(() => Object.assign(state, { docs: 0, apps: 0, runs: 0, enqueued: [] }));
  const start = async () => (await import("@/lib/kickoff")).startShortlist("u1", "preferences");
  it("with a level, a region and fields: at step 2 of setup, not the last step", async () => {
    state.profile = p(["Data Science"]);
    expect(await start()).toBe(true);
    expect(state.enqueued).toHaveLength(1);
  });
  it("without fields, once a document has been read", async () => {
    state.profile = p(null);
    expect(await start()).toBe(false);
    state.docs = 1;
    expect(await start()).toBe(true);
  });
  it("never without a level or a region, and never twice", async () => {
    state.profile = p(["Law"], null);
    expect(await start()).toBe(false);
    state.profile = p(["Law"], "masters", []);
    expect(await start()).toBe(false);
    state.profile = p(["Law"]);
    state.runs = 1;
    expect(await start()).toBe(false);
    expect(state.enqueued).toHaveLength(0);
  });
});
