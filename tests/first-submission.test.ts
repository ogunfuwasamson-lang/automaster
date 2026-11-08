import { describe, it, expect } from "vitest";
import { journeys, summarize, duration, median } from "@/lib/first-submission";

const t = (min: number) => new Date(Date.UTC(2026, 10, 1) + min * 60_000).toISOString();

describe("time to first submission", () => {
  const users = [
    { id: "a", email: "a@x", created_at: t(0) },
    { id: "b", email: "b@x", created_at: t(0) },
    { id: "c", email: "c@x", created_at: t(0) },
  ];
  const events = [
    { user_id: "a", action: "program.shortlisted", created_at: t(3) },
    { user_id: "a", action: "packet.approved", created_at: t(8) },
    { user_id: "a", action: "runner.started", created_at: t(9) },
    { user_id: "a", action: "runner.submitted", created_at: t(14) },
    { user_id: "a", action: "runner.submitted", created_at: t(60) }, // later ones don't count
    { user_id: "b", action: "application.shortlisted", created_at: t(10) },
    { user_id: "b", action: "runner.started", created_at: t(3000) },
    { user_id: "b", action: "runner.submitted", created_at: t(2 * 1440) },
    { user_id: "b", action: "runner.needs_you", created_at: t(5) },
  ];
  const js = journeys(users, events);

  it("takes each user's first time at each step", () => {
    expect(js[0].toSubmitMs).toBe(14 * 60_000);
    expect(js[0].reached).toBe("submitted");
    expect(js[2].reached).toBeNull();
    expect(js[2].toSubmitMs).toBeNull();
  });

  it("summarizes who got there and how fast", () => {
    const s = summarize(js);
    expect(s.submitted).toBe(2);
    expect(s.within15m).toBe(1);
    expect(s.within24h).toBe(1);
    expect(s.within7d).toBe(2);
    expect(s.steps.find((x) => x.key === "shortlist")!.users).toBe(2);
    expect(s.steps.find((x) => x.key === "signed")!.medianFromPreviousMs).toBe(5 * 60_000);
  });

  it("formats durations", () => {
    expect(duration(14 * 60_000)).toBe("14 min");
    expect(duration(3 * 3_600_000)).toBe("3.0 h");
    expect(duration(5 * 86_400_000)).toBe("5 d");
    expect(duration(null)).toBe("—");
    expect(median([3, 1, 2, 10])).toBe(2.5);
  });
});
