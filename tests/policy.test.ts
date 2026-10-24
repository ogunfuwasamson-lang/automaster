import { describe, it, expect } from "vitest";
import { decide, type Grant, type Ripcord } from "@/lib/policy";
import { canTransition, TRANSITIONS, APP_STATUSES } from "@/lib/app-state";

// mirrors seed_default_grants() in the migration
const defaults: Grant[] = [
  { capability: "research", mode: "auto", undo_seconds: 0, ceiling_cents: null, rate_limit: null },
  { capability: "draft", mode: "auto", undo_seconds: 0, ceiling_cents: null, rate_limit: null },
  { capability: "email.follow_up", mode: "auto_undo", undo_seconds: 600, ceiling_cents: null, rate_limit: { per_thread_per_week: 2 } },
  { capability: "email.new_contact", mode: "auto_undo", undo_seconds: 600, ceiling_cents: null, rate_limit: { per_contact_total: 1, per_day: 10 } },
  { capability: "submit", mode: "auto", undo_seconds: 0, ceiling_cents: null, rate_limit: null },
  { capability: "spend.app_fee", mode: "auto", undo_seconds: 0, ceiling_cents: 30000, rate_limit: null },
  { capability: "sign", mode: "approve", undo_seconds: 0, ceiling_cents: null, rate_limit: null },
];
const none: Ripcord[] = [];
const agent = "agent:runner";

describe("policy.decide", () => {
  it("research runs on auto", () => {
    expect(decide("research", defaults, none, { agent }).kind).toBe("allow");
  });

  it("new-contact email gets a 10 minute undo window", () => {
    const v = decide("email.new_contact", defaults, none, { agent, rateCounts: { per_contact_total: 0, per_day: 3 } });
    expect(v).toMatchObject({ kind: "allow_with_undo", undoSeconds: 600 });
  });

  it("second cold email to the same contact goes to the user", () => {
    const v = decide("email.new_contact", defaults, none, { agent, rateCounts: { per_contact_total: 1 } });
    expect(v.kind).toBe("needs_approval");
  });

  it("submit is blocked without packet approval, even on auto", () => {
    expect(decide("submit", defaults, none, { agent, packetApproved: false }).kind).toBe("blocked");
    expect(decide("submit", defaults, none, { agent, packetApproved: true }).kind).toBe("allow");
  });

  it("sign always needs the user, even if someone sets it to auto", () => {
    const hacked = defaults.map((g) => (g.capability === "sign" ? { ...g, mode: "auto" as const } : g));
    expect(decide("sign", hacked, none, { agent }).kind).toBe("needs_approval");
  });

  it("fees inside the envelope go through, over it asks", () => {
    expect(decide("spend.app_fee", defaults, none, { agent, amountCents: 9000, spentSoFarCents: 18000 }).kind).toBe("allow");
    expect(decide("spend.app_fee", defaults, none, { agent, amountCents: 9000, spentSoFarCents: 25000 }).kind).toBe("needs_approval");
  });

  it("zero envelope means every fee asks", () => {
    const zero = defaults.map((g) => (g.capability === "spend.app_fee" ? { ...g, ceiling_cents: 0 } : g));
    expect(decide("spend.app_fee", zero, none, { agent, amountCents: 1000 }).kind).toBe("needs_approval");
  });

  it("ripcords stop everything in scope", () => {
    const all: Ripcord[] = [{ scope_kind: "all", scope_value: null, active: true }];
    expect(decide("research", defaults, all, { agent }).kind).toBe("blocked");
    const school: Ripcord[] = [{ scope_kind: "school", scope_value: "s1", active: true }];
    expect(decide("draft", defaults, school, { agent, schoolId: "s1" }).kind).toBe("blocked");
    expect(decide("draft", defaults, school, { agent, schoolId: "s2" }).kind).toBe("allow");
    const released: Ripcord[] = [{ scope_kind: "all", scope_value: null, active: false }];
    expect(decide("research", defaults, released, { agent }).kind).toBe("allow");
  });

  it("missing grant defaults to asking", () => {
    expect(decide("prefill", [], none, { agent }).kind).toBe("needs_approval");
  });
});

describe("app-state", () => {
  it("cannot skip review", () => {
    expect(canTransition("preparing", "submitted")).toBe(false);
    expect(canTransition("ready_for_review", "submitted")).toBe(false);
    expect(canTransition("packet_approved", "submitted")).toBe(true);
  });
  it("every status has a transition entry", () => {
    for (const s of APP_STATUSES) expect(TRANSITIONS[s]).toBeDefined();
  });
});

describe("billing errors", () => {
  it("are recognised so jobs wait instead of dying", async () => {
    const { isBillingError } = await import("@/lib/jobs");
    expect(isBillingError('400 {"message":"Your credit balance is too low to access the Anthropic API."}')).toBe(true);
    expect(isBillingError("rate_limit_error")).toBe(false);
  });
});
