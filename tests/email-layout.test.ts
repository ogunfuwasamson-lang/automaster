import { describe, it, expect } from "vitest";
import { emailHtml, rich } from "@/lib/email-layout";
import { journeyBlock } from "@/lib/email-journey";

describe("the email look", () => {
  it("escapes copy, keeps bold and links, and shows the real mark", () => {
    expect(rich("**McGill** <b> [page](https://tryivyward.com/x)")).toMatch(/<strong[^>]*>McGill<\/strong> &lt;b&gt; <a href="https:\/\/tryivyward.com\/x"/);
    const h = emailHtml({ headline: "Hi", blocks: [{ t: "p", text: "x" }], manageUrl: "https://tryivyward.com/settings", unsubscribeUrl: "https://tryivyward.com/u" });
    expect(h).toMatch(/\/email\/mark\.png/);
    expect(h).toMatch(/Email settings/);
    expect(h).toMatch(/Stop these emails/);
    expect(h).toMatch(/prefers-color-scheme:dark/);
  });

  it("draws rows with their status, a note, stats two to a row, and a button that holds in Outlook", () => {
    const h = emailHtml({
      headline: "x",
      blocks: [
        { t: "rows", rows: [{ title: "McGill University", right: "Signed", tone: "go" }, { title: "UBC closes in 12 days" }] },
        { t: "note", title: "Today's task", text: "Sign it" },
        { t: "stats", items: [{ value: "1", label: "a" }, { value: "2", label: "b" }, { value: "3", label: "c" }] },
        { t: "button", label: "Go", href: "https://x.y" },
      ],
    });
    expect(h).toMatch(/McGill University<\/p><\/td><td align="right"[^>]*color:#047857">Signed/);
    expect(h).toMatch(/font:400 15px\/1.5[^"]*">UBC closes in 12 days/); // a sentence reads as text, not a bold name
    expect((h.match(/<tr><td width="50%"/g) ?? []).length).toBe(2);
    expect(h).toMatch(/bgcolor="#18181b"[^>]*><a href="https:\/\/x.y"/);
  });

  it("puts the applicant at their stop on the journey strip", () => {
    const stages = ["profile", "shortlist", "apply", "submitted", "admitted", "funding", "visa", "fees", "travel", "arrival"].map((id) => ({ id, label: id }));
    const b = journeyBlock({ stages, current: { id: "submitted", label: "Submitted" }, done: 3 } as never);
    expect(b).toEqual({ t: "progress", at: 4, of: 10, label: "Submitted", done: 3 });
    const h = emailHtml({ headline: "x", blocks: [b!] });
    expect((h.match(/class="seg-done"/g) ?? []).length).toBe(3);
    expect((h.match(/class="seg-now"/g) ?? []).length).toBe(1);
    expect(h).toMatch(/Stop 4 of 10: <strong[^>]*>Submitted/);
    expect(journeyBlock(null)).toBeNull();
  });
});
