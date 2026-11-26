import { NextResponse, type NextRequest } from "next/server";
import { INSTRUCTIONS, SERVER_INFO, findTool, toolList } from "@/lib/mcp-tools";

// Ivyward's MCP server (streamable HTTP, stateless, no sign-in): the read-only tools in lib/mcp-tools, for the
// Ivyward app in ChatGPT, Claude's connectors and any other MCP client. JSON-RPC 2.0 over POST; each request gets
// one JSON response. nothing about the caller is stored.
export const runtime = "nodejs";
export const maxDuration = 60;

const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id", "access-control-allow-methods": "POST, GET, OPTIONS" };

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const reply = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(m: Rpc): Promise<object | null> {
  // a notification (no id) gets no response
  if (m.id === undefined || m.id === null) return null;
  switch (m.method) {
    case "initialize": {
      const asked = String(m.params?.protocolVersion ?? "");
      return reply(m.id, { protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
    }
    case "ping":
      return reply(m.id, {});
    case "tools/list":
      return reply(m.id, { tools: toolList() });
    case "tools/call": {
      const tool = findTool(String(m.params?.name ?? ""));
      if (!tool) return fail(m.id, -32602, `unknown tool: ${String(m.params?.name ?? "")}`);
      try {
        return reply(m.id, await tool.run((m.params?.arguments ?? {}) as Record<string, unknown>));
      } catch {
        return reply(m.id, { content: [{ type: "text", text: "Ivyward couldn't look that up just now. Try again in a minute." }], isError: true });
      }
    }
    case "resources/list":
      return reply(m.id, { resources: [] });
    case "prompts/list":
      return reply(m.id, { prompts: [] });
    default:
      return fail(m.id, -32601, `method not found: ${m.method}`);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json(fail(null, -32700, "parse error"), { status: 400, headers: CORS });
  const batch = Array.isArray(body) ? (body as Rpc[]) : [body as Rpc];
  const out = (await Promise.all(batch.map(handle))).filter((x): x is object => !!x);
  if (!out.length) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(Array.isArray(body) ? out : out[0], { headers: CORS });
}

// no server-sent stream: clients post each request
export async function GET() {
  return NextResponse.json({ name: SERVER_INFO.title, about: INSTRUCTIONS, transport: "streamable-http (POST JSON-RPC)", tools: toolList().map((t) => t.name) }, { status: 405, headers: { ...CORS, allow: "POST, OPTIONS" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
