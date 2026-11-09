import { describe, it, expect, vi } from "vitest";

// a batch the unique index rejects: the rows go in one by one, so only the duplicate is lost
const inserted: unknown[] = [];
vi.mock("server-only", () => ({}));
vi.mock("@/lib/profile-store", () => ({ getProfile: async () => ({ confirmed_facts: [] }), updateProfile: async () => ({}) }));
vi.mock("@/lib/events", () => ({ logEvent: async () => "" }));
vi.mock("@/lib/notify", () => ({ notify: async () => {}, resolve: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({
  admin: () => ({
    from: () => {
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.limit = () => Promise.resolve({ data: [], error: null });
      q.insert = (r: unknown) => {
        if (Array.isArray(r)) return Promise.resolve({ error: { message: "duplicate key value violates unique constraint" } });
        if ((r as { qkey: string }).qkey !== "dup") inserted.push(r);
        return Promise.resolve({ error: null });
      };
      q.then = undefined;
      return q;
    },
  }),
}));

describe("recording portal questions", () => {
  it("keeps the other questions when one is already open", async () => {
    const { recordQuestions } = await import("@/lib/portal-questions");
    await recordQuestions("u1", "a1", [
      { label: "dup", type: "text" },
      { label: "Name of your secondary school", type: "text" },
    ]);
    expect(inserted).toHaveLength(1);
  });
});
