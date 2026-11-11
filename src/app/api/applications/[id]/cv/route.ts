import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { textPdf } from "@/lib/pdf";
import { loadTailoredCv, makeTailoredCv } from "@/lib/tailored-cv";
import { cvText } from "@/lib/cv-check";
import { admin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

async function own(id: string) {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await auth.sb.from("applications").select("id, programs(schools(name))").eq("id", id).maybeSingle();
  return data ? { auth, school: (data.programs as unknown as { schools: { name: string } }).schools.name } : null;
}

// make (or remake) the CV for this program
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const o = await own(id);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const r = await makeTailoredCv(o.auth.user.id, id);
    return NextResponse.json({ ok: true, left_out: r.dropped.length });
  } catch (e) {
    return NextResponse.json({ error: /budget|limit/i.test(String(e)) ? "The agents' monthly allowance is used up." : "The CV couldn't be made just now. Try again in a minute." }, { status: 500 });
  }
}

// the CV as a PDF
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const o = await own(id);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  const cv = await loadTailoredCv(o.auth.user.id, id);
  if (!cv) return NextResponse.json({ error: "no CV yet" }, { status: 404 });
  const { data: prof } = await admin().from("profiles").select("portal_details").eq("id", o.auth.user.id).maybeSingle();
  const d = (prof?.portal_details ?? {}) as Record<string, string | undefined>;
  const name = [d.legal_first_name, d.legal_last_name].filter(Boolean).join(" ") || "Curriculum vitae";
  const contact = [d.email, d.phone, d.city && d.country ? `${d.city}, ${d.country}` : d.country].filter(Boolean).join("  |  ");
  const file = `${name} CV ${o.school}`.replace(/[^\w .-]+/g, "").slice(0, 80);
  return new NextResponse(new Uint8Array(textPdf("", cvText(name, contact, cv))), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${file}.pdf"`, "cache-control": "private, no-store" } });
}
