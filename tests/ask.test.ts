import { describe, it, expect } from "vitest";
import { askKind, cleanOptions, toAsk } from "@/lib/ask";
import { matchOption } from "@/lib/portal-questions";

describe("questions with the right control", () => {
  it("picks buttons, search, yes/no, date or text", () => {
    expect(askKind("select", ["Select…", "English", "Français", "Other"])).toBe("choice");
    expect(askKind("select", Array.from({ length: 30 }, (_, i) => `Country ${i}`))).toBe("search");
    expect(askKind("radio", ["Yes", "No"])).toBe("yes_no");
    expect(askKind("checkbox", [])).toBe("yes_no");
    expect(askKind("date", [])).toBe("date");
    expect(askKind("text", [])).toBe("text");
  });
  it("drops placeholders and duplicates from the options", () => {
    expect(cleanOptions(["-- Select --", "English", "english", "", "Please choose", "Français"])).toEqual(["English", "Français"]);
  });
  it("gives yes/no buttons to a bare checkbox", () => {
    expect(toAsk({ id: "q", question: "Are you a veteran?", options: [], field_type: "checkbox", school: "X" }).options).toEqual(["Yes", "No"]);
  });
});

describe("reusing an earlier answer on the next school's form", () => {
  it("finds the option that says the same thing", () => {
    expect(matchOption("english", ["Select", "English", "Français", "Other"])).toBe("English");
    expect(matchOption("English", ["English (Anglais)", "French (Français)"])).toBe("English (Anglais)");
    expect(matchOption("Nigeria", ["Niger", "Nigeria", "Norway"])).toBe("Nigeria");
    expect(matchOption("Yoruba", ["English", "French"])).toBe(null);
  });
});
