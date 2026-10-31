import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhook } from "@/lib/bachs";

describe("bachs webhooks", () => {
  process.env.BACHS_WEBHOOK_SECRET = "whsec_test";
  const raw = JSON.stringify({ id: "evt_1", type: "checkout.completed", data: {} });
  const now = 1_793_000_000_000;
  const t = String(Math.floor(now / 1000));
  const sig = createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex");
  it("accepts the v2 header and the older pair", () => {
    expect(verifyWebhook(raw, new Headers({ "x-bachs-signature-v2": `t=${t},v1=${sig}` }), now)).toBe(true);
    expect(verifyWebhook(raw, new Headers({ "x-bachs-signature": sig, "x-bachs-timestamp": t }), now)).toBe(true);
  });
  it("refuses a changed body, a wrong secret and an old delivery", () => {
    expect(verifyWebhook(raw + " ", new Headers({ "x-bachs-signature-v2": `t=${t},v1=${sig}` }), now)).toBe(false);
    expect(verifyWebhook(raw, new Headers({ "x-bachs-signature-v2": `t=${t},v1=${"0".repeat(64)}` }), now)).toBe(false);
    expect(verifyWebhook(raw, new Headers({ "x-bachs-signature-v2": `t=${t},v1=${sig}` }), now + 10 * 60_000)).toBe(false);
  });
});
