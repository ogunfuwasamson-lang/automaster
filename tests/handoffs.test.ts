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

import { isoWeek, waitingSummary } from "@/lib/writing";
describe("weekly reminder for finished applications nobody came back to", () => {
  const now = new Date("2026-11-13T10:00:00Z");
  it("waits two days, then covers every waiting application in one line", () => {
    expect(waitingSummary([{ school: "ETH Zurich", readySince: "2026-11-12T10:00:00Z", deadline: null }], now)).toBeNull();
    const s = waitingSummary(
      [
        { school: "ETH Zurich", readySince: "2026-11-10T23:45:00Z", deadline: "2026-12-15" },
        { school: "EPFL", readySince: "2026-11-10T23:45:00Z", deadline: "2026-12-01" },
        { school: "TU Delft", readySince: "2026-11-12T23:45:00Z", deadline: "2026-11-20" },
      ],
      now,
    )!;
    expect(s.count).toBe(2);
    expect(s.title).toBe("2 applications are still waiting for your sign-off");
    expect(s.body).toContain("ETH Zurich, EPFL");
    expect(s.body).toContain("2026-12-01");
    expect(s.body).not.toContain("TU Delft");
  });
  it("names the school when there is one, and skips deadlines that have passed", () => {
    const s = waitingSummary([{ school: "HEC Paris", readySince: "2026-11-01T00:00:00Z", deadline: "2026-11-05" }], now)!;
    expect(s.title).toBe("HEC Paris is still waiting for your sign-off");
    expect(s.body).not.toContain("nearest deadline");
  });
  it("is keyed by the week, so it goes out at most once a week", () => {
    expect(isoWeek(new Date("2026-11-13T10:00:00Z"))).toBe("2026-W46");
    expect(isoWeek(new Date("2026-11-15T23:00:00Z"))).toBe("2026-W46");
    expect(isoWeek(new Date("2026-11-16T00:00:00Z"))).toBe("2026-W47");
    expect(isoWeek(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
  });
});

import { planFor } from "@/lib/app-plan";
describe("an application's remaining steps", () => {
  const base = { status: "ready_for_review", essaysTotal: 3, essaysApproved: 1, essaysWorking: false, attested: false, runnerStatus: null, runnerNote: null, openQuestions: 0, fee: 90, waiver: "requested", deadline: null };
  it("puts the applicant's next step first when the essays are waiting for them", () => {
    const p = planFor(base);
    expect(p.find((s) => s.state === "now")).toMatchObject({ key: "approve", who: "you", detail: "1 of 3 approved" });
    expect(p.filter((s) => s.state === "done").map((s) => s.key)).toEqual(["research", "write", "waiver"]);
  });
  it("hands the portal back to the applicant when the agents are stuck, and shows open questions first", () => {
    const p = planFor({ ...base, status: "packet_approved", essaysApproved: 3, attested: true, runnerStatus: "needs_you", runnerNote: "a bot check on the sign-up page", openQuestions: 2, waiver: null });
    expect(p.find((s) => s.state === "now")?.key).toBe("questions");
    expect(p.find((s) => s.key === "submit")).toMatchObject({ who: "you", detail: "a bot check on the sign-up page" });
    expect(p.find((s) => s.key === "waiver")?.state).toBe("next");
  });
  it("leaves the school's decision as the last step after submitting", () => {
    const p = planFor({ ...base, status: "submitted", essaysApproved: 3, attested: true, runnerStatus: "submitted" });
    expect(p.find((s) => s.state === "now")?.key).toBe("decision");
  });
});
