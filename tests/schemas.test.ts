// every schema we send as structured output must fit the API's limits:
// no unions (anyOf / type arrays), no optional properties, no unsupported keywords.
import { describe, it, expect } from "vitest";
import * as z from "zod/v4";
import { Plan, Draft, Review } from "@/agents/writer";
import { Candidates, ProgramFacts, Scholarships } from "@/agents/recon";
import { CurateOut } from "@/agents/curator";
import { TurnOut } from "@/agents/interviewer";
import { ExtractOut } from "@/agents/intake";
import { Outreach } from "@/agents/closer";

const schemas = { Outreach, Plan, Draft, Review, Candidates, ProgramFacts, Scholarships, CurateOut, TurnOut, ExtractOut };

describe.each(Object.entries(schemas))("%s", (_name, schema) => {
  it("fits structured output limits", () => {
    const json = z.toJSONSchema(schema as z.ZodType);
    const text = JSON.stringify(json);
    expect(text).not.toContain("anyOf");
    expect(text).not.toMatch(/"type":\[/);
    for (const bad of ["minLength", "maxLength", "minimum", "maximum", "pattern"]) expect(text).not.toContain(`"${bad}"`);
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const o = node as Record<string, unknown>;
      if (o.type === "object" && o.properties) {
        expect(new Set(o.required as string[])).toEqual(new Set(Object.keys(o.properties as object)));
      }
      Object.values(o).forEach(walk);
    };
    walk(json);
  });
});
