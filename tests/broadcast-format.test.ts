import { describe, expect, it } from "vitest";
import { personalise, problems, toBlocks, toText } from "@/lib/broadcast-format";
import { TEMPLATES } from "@/lib/broadcast-templates";

const BASE = "https://tryivyward.com";

describe("broadcast format", () => {
  it("turns paragraphs, numbered cards, buttons and dividers into blocks", () => {
    const b = toBlocks("Hi Ada,\n\nFirst line\nsame paragraph.\n\n### Calendar sync\nYour deadlines on your calendar.\n[[Connect]](/api/calendar/connect)\n\n### Share\nTell a friend.\n\n---\n\n[[Open Ivyward]](/dashboard)", BASE);
    expect(b).toEqual([
      { t: "p", text: "Hi Ada," },
      { t: "p", text: "First line same paragraph." },
      { t: "item", n: 1, title: "Calendar sync", text: "Your deadlines on your calendar.", button: { label: "Connect", href: `${BASE}/api/calendar/connect` } },
      { t: "item", n: 2, title: "Share", text: "Tell a friend." },
      { t: "rule" },
      { t: "button", label: "Open Ivyward", href: `${BASE}/dashboard` },
    ]);
  });
  it("makes links to the site absolute and keeps outside links", () => {
    const [p] = toBlocks("See [the calendar](/scholarships/deadlines) and [WhatsApp](https://whatsapp.com/channel/x).", BASE);
    expect(p).toEqual({ t: "p", text: `See [the calendar](${BASE}/scholarships/deadlines) and [WhatsApp](https://whatsapp.com/channel/x).` });
  });
  it("uses the first name, or 'there'", () => {
    expect(personalise("Hi {first_name},", "Ada")).toBe("Hi Ada,");
    expect(personalise("Hi {first_name},", null)).toBe("Hi there,");
  });
  it("writes a plain-text part with the links spelled out and the opt-out", () => {
    const t = toText({ subject: "s", headline: "News", body: "Hi {first_name},\n\n### Card\n**Bold** [x](/a)\n[[Go]](/dashboard)" }, "Ada", BASE, "https://u");
    expect(t).toContain("Hi Ada,");
    expect(t).toContain("Card\nBold x (https://tryivyward.com/a)");
    expect(t).toContain("Go: https://tryivyward.com/dashboard");
    expect(t).toContain("Don't want these emails? https://u");
  });
  it("flags what's missing before a send", () => {
    expect(problems({ subject: "", headline: "", body: "" })).toHaveLength(3);
    expect(problems({ subject: "a", headline: "b", body: "[[Broken button]]" })[0]).toMatch(/button/);
  });
  it("ships templates that pass and carry no prices", () => {
    for (const t of TEMPLATES) {
      expect(problems(t.msg)).toEqual([]);
      expect(`${t.msg.subject} ${t.msg.body}`).not.toMatch(/[$₦£€]\s?\d|\bper month\b/);
      expect(t.msg.body).toContain("whatsapp.com/channel/");
    }
  });
});
