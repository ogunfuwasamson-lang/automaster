import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";

// no session: the extension's endpoints carry their own key, so the sign-in gate must let them through
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));

describe("sign-in gate", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });
  const status = async (path: string) => {
    const { middleware } = await import("@/middleware");
    return (await middleware(new NextRequest(`https://tryivyward.com${path}`, { headers: { authorization: "Bearer amr_xxxxxxxxxxxxxxxxxxxxxxxx" } }))).status;
  };
  it("lets every extension endpoint reach its own key check", async () => {
    for (const p of ["/api/runner/tasks", "/api/runner/engine", "/api/runner/panel", "/api/runner/panel?what=checkins"]) expect(await status(p), p).toBe(200);
  });
  it("still turns away signed-out calls to the app's own api", async () => {
    expect(await status("/api/profile/details")).toBe(401);
  });
});
