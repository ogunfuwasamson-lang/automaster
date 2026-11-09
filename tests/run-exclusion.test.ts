import { describe, it, expect, vi } from "vitest";

// the query otherRunActive builds, recorded so the filters can be checked
const calls: [string, unknown[]][] = [];
let rows: { id: string }[] = [];
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  admin: () => ({
    from: (t: string) => {
      calls.push(["from", [t]]);
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "neq", "gt", "contains"]) q[m] = (...a: unknown[]) => (calls.push([m, a]), q);
      q.limit = () => Promise.resolve({ data: rows });
      return q;
    },
  }),
}));

describe("one portal run per application", () => {
  it("sees another fresh run on the same application, not itself", async () => {
    const { otherRunActive } = await import("@/lib/queue");
    rows = [{ id: "other" }];
    expect(await otherRunActive("app-1", "me")).toBe(true);
    expect(calls).toContainEqual(["neq", ["id", "me"]]);
    expect(calls).toContainEqual(["contains", ["payload", { applicationId: "app-1" }]]);
    expect(calls).toContainEqual(["eq", ["status", "running"]]);
    rows = [];
    expect(await otherRunActive("app-1", "me")).toBe(false);
  });
});
