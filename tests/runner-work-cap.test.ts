import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// how many portal browsers are running now (runner jobs with a fresh lock), and whether a new one was claimed
let running = 0;
const drained: number[] = [];
vi.mock("server-only", () => ({}));
vi.mock("@/lib/jobs", () => ({ drain: async () => (drained.push(1), []) }));
vi.mock("@/lib/supabase/admin", () => ({
  admin: () => ({
    from: () => {
      const q = { select: () => q, eq: () => q, gt: () => Promise.resolve({ count: running, error: null }) };
      return q;
    },
  }),
}));

describe("portal browsers at once", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret-s3cret";
    drained.length = 0;
  });
  const call = async () => {
    const { POST } = await import("@/app/api/runner/work/route");
    return POST(new NextRequest("https://x.test/api/runner/work", { method: "POST", headers: { authorization: "Bearer s3cret-s3cret" } }));
  };
  it("starts another when there's room", async () => {
    running = 2;
    await call();
    expect(drained).toHaveLength(1);
  });
  it("starts none when the cap is reached", async () => {
    running = 3;
    const r = await call();
    expect(drained).toHaveLength(0);
    expect((await r.json()).ran).toBe(0);
  });
});
