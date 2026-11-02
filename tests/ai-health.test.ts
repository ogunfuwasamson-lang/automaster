import { describe, it, expect } from "vitest";
import { z } from "zod";
import { repairEnums } from "@/lib/llm";
import { isAccountError } from "@/lib/ai-health";
import { isBillingError } from "@/lib/jobs";

describe("repairEnums", () => {
  const schema = z.object({ items: z.array(z.object({ tier: z.enum(["reach", "target", "safety"]), region: z.enum(["us", "uk", "eu"]) })) });
  it("maps near-miss enum values the model writes onto the allowed ones", () => {
    const bad = { items: [{ tier: "Stretch", region: "USA" }, { tier: "safe", region: "united_kingdom" }] };
    const first = schema.safeParse(bad);
    expect(first.success).toBe(false);
    const fixed = repairEnums(bad, first.error!.issues as never);
    expect(schema.parse(fixed)).toEqual({ items: [{ tier: "reach", region: "us" }, { tier: "safety", region: "uk" }] });
  });
  it("leaves values it can't place, so the parse still fails honestly", () => {
    const bad = { items: [{ tier: "maybe", region: "mars" }] };
    const r = schema.safeParse(bad);
    expect(schema.safeParse(repairEnums(bad, r.error!.issues as never)).success).toBe(false);
  });
});

describe("account errors", () => {
  it("recognises the credit and key failures that should pause all AI work", () => {
    expect(isAccountError(new Error("400 Your credit balance is too low to access the Anthropic API"))).toBe(true);
    expect(isAccountError({ status: 401, message: "invalid x-api-key" })).toBe(true);
    expect(isAccountError(new Error("overloaded_error"))).toBe(false);
  });
  it("parks jobs while AI is paused", () => {
    expect(isBillingError("AI is paused until 12:30 (credit or key problem)")).toBe(true);
    expect(isBillingError("timeout")).toBe(false);
  });
});
