import { NextResponse, type NextRequest } from "next/server";
import { loadSheet, runnerUser } from "@/lib/runner";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const uid = await runnerUser(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("application") ?? "";
  const sheet = await loadSheet(uid, id);
  if (!sheet) return NextResponse.json({ error: "no approved packet for that application" }, { status: 404 });
  return NextResponse.json(sheet);
}
