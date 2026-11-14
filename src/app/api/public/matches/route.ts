import { NextResponse, type NextRequest } from "next/server";
import { matchesFor } from "@/lib/matches";
import { REGIONS } from "@/lib/profile";
import type { StudyLevel } from "@/lib/match-rules";
import { BUDGET } from "@/lib/sharpen";

export const runtime = "nodejs";

const LEVELS = new Set(["undergraduate", "masters", "phd"]);

// the public matcher (/match): programmes our agents have checked that fit a level, fields and regions. no
// account, no model call, nothing stored. only what the cards show goes back.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const level = LEVELS.has(q.get("level") ?? "") ? (q.get("level") as StudyLevel) : null;
  const fields = (q.get("fields") ?? "").split("|").map((f) => f.trim().slice(0, 60)).filter(Boolean).slice(0, 4);
  const regions = (q.get("regions") ?? "").split(",").filter((r) => REGIONS[r]).slice(0, 9);
  if (!regions.length) return NextResponse.json({ matches: [] });
  // the answers from "sharpen your matches", when given
  const n = q.get("funding") ?? q.get("need") ?? "";
  const need = ["full", "partial", "self"].includes(n) ? (n as "full" | "partial" | "self") : null;
  const budget = BUDGET[q.get("budget") ?? ""] ?? null;
  const prefs = { need, budget, avoidTests: q.get("tests") === "avoid", waiver: q.get("english") === "waiver" };
  const matches = (await matchesFor({ level, fields, regions, ...prefs }).catch(() => [])).map((m) => ({
    programId: m.programId,
    school: m.school,
    program: m.program,
    country: m.country,
    deadline: m.deadline,
    funding: m.funding,
    awards: m.awards,
    tuition: m.tuition,
    englishWaiver: m.englishWaiver,
  }));
  return NextResponse.json({ matches }, { headers: { "cache-control": "public, max-age=300" } });
}
