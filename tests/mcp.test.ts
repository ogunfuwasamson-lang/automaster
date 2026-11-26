import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/programme-data", () => ({
  publicProgrammes: async () => [
    { id: "1", name: "MSc Data Science", school: "University of Toronto", country: "Canada", region: "canada", level: "masters", degree: "MSc", url: "https://example.ca/ds", tuition: 40000, testPolicy: "not_required", moi: "accepted", funding: "possible", deadlines: ["2099-01-15"], checked: "2026-11-20" },
    { id: "2", name: "MSc Data Science", school: "Technical University of Munich", country: "Germany", region: "europe", level: "masters", degree: "MSc", url: "https://example.de/ds", tuition: null, testPolicy: "not_required", moi: "unknown", funding: "rare", deadlines: [], checked: "2026-11-20" },
    { id: "3", name: "MA History", school: "University of Toronto", country: "Canada", region: "canada", level: "masters", degree: "MA", url: null, tuition: null, testPolicy: null, moi: null, funding: null, deadlines: [], checked: null },
  ],
  todayISO: () => "2026-11-26",
}));
vi.mock("@/lib/directory", async (orig) => ({
  ...(await orig<typeof import("@/lib/directory")>()),
  directory: async () => [{ id: "s", slug: "university-of-toronto", country: "CA", region: "ON", regionSlug: "ontario", name: "University of Toronto", aliases: ["U of T"], city: "Toronto", kind: "University", control: "public", highest: null, recognition: "DLI O19332746152", registry: "ircc_dli", website: "https://utoronto.ca", admissions: null, apply: null, international: null, aid: null, netPrice: null, checked: "2026-11-25", nameLocal: null, issues: [] }],
}));

const { POST } = await import("@/app/mcp/route");
const call = async (body: unknown) => {
  const res = await POST(new Request("https://tryivyward.com/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as never);
  return { status: res.status, json: res.status === 202 ? null : await res.json() };
};

describe("Ivyward's MCP server", () => {
  it("initializes and lists read-only tools", async () => {
    const init = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect(init.json.result.protocolVersion).toBe("2025-06-18");
    expect(init.json.result.capabilities.tools).toBeTruthy();
    expect((await call({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
    const list = await call({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = list.json.result.tools as { name: string; annotations: Record<string, boolean> }[];
    expect(tools.map((t) => t.name)).toEqual(["find_programmes", "find_scholarships", "scholarship_deadlines", "find_school", "student_visa_steps"]);
    expect(tools.every((t) => t.annotations.readOnlyHint === true && t.annotations.destructiveHint === false && t.annotations.openWorldHint === false)).toBe(true);
  });

  it("finds checked programmes by field and country", async () => {
    const r = await call({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "find_programmes", arguments: { field: "data science", destination: "Canada" } } });
    const progs = r.json.result.structuredContent.programmes;
    expect(progs).toHaveLength(1);
    expect(progs[0]).toMatchObject({ school: "University of Toronto", next_deadline: "2099-01-15", official_page: "https://example.ca/ds" });
    expect(r.json.result.content[0].text).toContain("tryivyward.com/match");
    const de = await call({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "find_programmes", arguments: { field: "data science", destination: "Germany" } } });
    expect(de.json.result.structuredContent.programmes[0].school).toBe("Technical University of Munich");
  });

  it("looks up a school and a country's visa steps", async () => {
    const s = await call({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "find_school", arguments: { name: "toronto" } } });
    expect(s.json.result.structuredContent.schools[0].name).toBe("University of Toronto");
    const v = await call({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "student_visa_steps", arguments: { destination: "United Kingdom" } } });
    expect(v.json.result.structuredContent.visa).toBe("UK Student visa");
  });

  it("answers unknown methods and tools with errors", async () => {
    expect((await call({ jsonrpc: "2.0", id: 7, method: "nope" })).json.error.code).toBe(-32601);
    expect((await call({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "nope" } })).json.error.code).toBe(-32602);
  });
});
