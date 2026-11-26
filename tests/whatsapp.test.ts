import { describe, it, expect } from "vitest";
import { clean, codeIn, isStart, isStop, linkUrl, masked, newCode, pickNudge, shouldSend, TEMPLATES } from "@/lib/whatsapp-rules";

const app = (o: Partial<{ id: string; school: string; status: string; deadline: string | null }>) => ({ id: "a1", school: "University of Toronto, St. George", status: "shortlisted", deadline: null, ...o });
const now = new Date("2026-11-26T12:00:00Z");
const contact = { status: "active", phone: "2348012345678", last_sent_at: null, last_sent_key: null };

describe("which WhatsApp update, if any", () => {
  it("a close deadline on something waiting for them comes first, with the date", () => {
    const n = pickNudge({ apps: [app({ id: "s", status: "ready_for_review", deadline: "2026-11-28" }), app({ id: "x", status: "ready_for_review" })], appDoc: null }, null, "Amaka", "2026-11-26");
    expect(n).toMatchObject({ template: TEMPLATES.deadline, params: ["Amaka", "University of Toronto", "28 November 2026"], path: "applications/s", urgent: true, key: "deadline:s:3" });
  });

  it("then an application to sign, a document, an admission to confirm", () => {
    expect(pickNudge({ apps: [app({ status: "ready_for_review" })], appDoc: null }, null, "Amaka", "2026-11-26")).toMatchObject({ template: TEMPLATES.sign, params: ["Amaka", "University of Toronto"], path: null });
    expect(pickNudge({ apps: [app({ status: "preparing" })], appDoc: { appId: "a1", school: "McGill University", deadline: null, label: "IELTS certificate", missing: 2 } }, null, "", "2026-11-26")).toMatchObject({ template: TEMPLATES.doc, params: ["there", "McGill University", expect.stringMatching(/IELTS/)], path: "applications/a1" });
    expect(pickNudge({ apps: [], appDoc: null }, { id: "ad", school: "University of Edinburgh" }, "Amaka", "2026-11-26")).toMatchObject({ template: TEMPLATES.admission, path: "applications/ad" });
    expect(pickNudge({ apps: [app({})], appDoc: null }, null, "Amaka", "2026-11-26")).toBeNull();
  });

  it("keeps parameters to one line", () => {
    expect(clean("a\nb\t c      d")).toBe("a b c d");
  });
});

describe("when to send it", () => {
  const n = { key: "sign:a1", template: TEMPLATES.sign, params: [], path: null, urgent: false };
  const at = { lastActiveAt: "2026-11-20T10:00:00Z", now, localHour: 11 };
  it("sends to someone linked and quiet, in the daytime", () => {
    expect(shouldSend(contact, n, at).ok).toBe(true);
  });
  it("not twice for the same thing, not within a week, not while they're active, not at night", () => {
    expect(shouldSend({ ...contact, last_sent_key: "sign:a1" }, n, at).why).toBe("already sent this");
    expect(shouldSend({ ...contact, last_sent_at: "2026-11-22T10:00:00Z" }, n, at).why).toBe("sent recently");
    expect(shouldSend({ ...contact, last_sent_at: "2026-11-22T10:00:00Z" }, { ...n, urgent: true, key: "deadline:a1:3" }, at).ok).toBe(true);
    expect(shouldSend(contact, n, { ...at, lastActiveAt: "2026-11-25T10:00:00Z" }).why).toBe("active on Ivyward");
    expect(shouldSend(contact, n, { ...at, localHour: 22 }).why).toBe("night where they are");
    expect(shouldSend({ ...contact, status: "pending", phone: null }, n, at).why).toBe("not on");
  });
});

describe("linking and stopping", () => {
  it("codes read back from what they send", () => {
    const c = newCode(() => 0.5);
    expect(c).toMatch(/^IVY-[A-HJ-NP-Z2-9]{5}$/);
    expect(codeIn(`Hi Ivyward, my code is ${c}`)).toBe(c);
    expect(codeIn("hi ivy 7k2q9")).toBe("IVY-7K2Q9");
    expect(codeIn("hello")).toBeNull();
    expect(decodeURIComponent(linkUrl(c))).toBe(`https://wa.me/2349110312103?text=Hi Ivyward, my code is ${c}`);
  });
  it("STOP and START, and a masked number", () => {
    expect(isStop("STOP")).toBe(true);
    expect(isStop(" stop. ")).toBe(true);
    expect(isStop("please don't stop helping")).toBe(false);
    expect(isStart("Start")).toBe(true);
    expect(masked("2349110312103")).toBe("+234 ••• 2103");
  });
});
