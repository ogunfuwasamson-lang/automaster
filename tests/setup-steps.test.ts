import { describe, it, expect } from "vitest";
import { needsWhatsApp, SETUP } from "@/lib/setup-steps";

describe("WhatsApp is required in web setup", () => {
  it("holds accounts made since the change until their number is linked", () => {
    expect(needsWhatsApp("2026-11-27T08:00:00.123456Z", false)).toBe(true);
    expect(needsWhatsApp("2026-11-27T08:00:00.123456Z", true)).toBe(false);
  });
  it("leaves earlier accounts alone", () => {
    expect(needsWhatsApp("2026-11-20T08:00:00Z", false)).toBe(false);
    expect(needsWhatsApp(null, false)).toBe(false);
  });
  it("comes after the matches and before Gmail", () => {
    expect(SETUP.matches).toBeLessThan(SETUP.whatsapp);
    expect(SETUP.whatsapp).toBeLessThan(SETUP.connect);
  });
});
