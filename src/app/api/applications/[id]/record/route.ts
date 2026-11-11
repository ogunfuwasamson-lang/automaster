import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { loadSheet } from "@/lib/runner";
import { textPdf } from "@/lib/pdf";
import { instructions } from "@/lib/instructions";

export const runtime = "nodejs";

// one application on paper: what was signed, the essays as approved, what the agents filled from, what the portal
// confirmed and changed, and when each thing happened. the applicant's own record, to keep or show someone.
const LABEL: Record<string, string> = {
  "packet.approved": "You signed the application packet",
  "runner.moved_to_chrome": "Moved to your Chrome",
  "runner.account_created": "Portal account created",
  "runner.submitted": "Submitted on the portal",
  "runner.answers_changed": "The portal shortened or changed some answers",
  "fee_waiver.granted": "Application fee waived",
  "fee_waiver.denied": "Fee waiver declined",
  "funding.offered": "Funding offered",
  "application.admitted": "Admitted",
  "application.rejected": "Not admitted",
  "runner.instruction": "You told the agents",
};

const day = (t: string) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: app } = await auth.sb
    .from("applications")
    .select("id, status, target_deadline, attested_at, attestation, packet_snapshot, fee_waiver_status, fee_waived_usd, aid_offered, programs(name, degree, app_fee_usd, schools(name, country)), artifacts(title, kind, current_version, artifact_versions(version, content, user_approved_at))")
    .eq("id", id)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  const p = app.programs as unknown as { name: string; degree: string | null; app_fee_usd: number | null; schools: { name: string; country: string | null } };
  const [{ data: events }, sheet, told] = await Promise.all([
    admin().from("events").select("action, context, created_at").eq("application_id", id).in("action", Object.keys(LABEL)).order("created_at").limit(200),
    app.attested_at ? loadSheet(auth.user.id, id).catch(() => null) : Promise.resolve(null),
    instructions(id).catch(() => []),
  ]);

  const out: string[] = [];
  out.push(`${p.schools.name}${p.schools.country ? `, ${p.schools.country}` : ""}`, `${p.name}${p.degree && !p.name.includes(p.degree) ? ` (${p.degree})` : ""}`, "");
  out.push(`Status: ${app.status.replace(/_/g, " ")}`);
  if (app.target_deadline) out.push(`Deadline: ${app.target_deadline}`);
  if (p.app_fee_usd) out.push(`Application fee: $${p.app_fee_usd}${app.fee_waiver_status ? ` (fee waiver ${app.fee_waiver_status}${app.fee_waived_usd ? `, $${app.fee_waived_usd} waived` : ""})` : ""}`);
  if (app.aid_offered) out.push(`Funding offered: ${app.aid_offered}`);
  if (app.attested_at) out.push(`Signed: ${day(app.attested_at)}`);
  out.push("", "WHAT HAPPENED", "");
  for (const e of events ?? []) {
    const c = (e.context ?? {}) as { text?: string; checks?: string[]; via?: string; url?: string };
    const extra = e.action === "runner.instruction" ? `: "${c.text}"` : e.action === "runner.answers_changed" ? `: ${(c.checks ?? []).join("; ")}` : e.action === "runner.submitted" ? `${c.via ? ` (in ${c.via === "chrome" ? "your Chrome" : "the cloud"})` : ""}${c.url ? `. Last page: ${c.url}` : ""}` : "";
    out.push(`${day(e.created_at)}  ${LABEL[e.action]}${extra}`);
  }
  if (!events?.length) out.push("Nothing yet.");
  if (told.length) out.push("", "WHAT YOU TOLD THE AGENTS", "", ...told.map((t) => `- ${t.text}`));
  if (app.attestation) out.push("", "WHAT YOU SIGNED", "", String(app.attestation));
  if (sheet) {
    out.push("", "WHAT THE AGENTS FILLED THE FORMS FROM", "");
    for (const [k, v] of Object.entries(sheet.fields)) if (!k.startsWith("answer:") && v && !/password|secret/i.test(k)) out.push(`${k.replace(/_/g, " ")}: ${v.length > 200 ? `${v.slice(0, 200)}...` : v}`);
  }
  const essays = (app.artifacts as unknown as { title: string; current_version: number; artifact_versions: { version: number; content: string; user_approved_at: string | null }[] }[]) ?? [];
  for (const a of essays) {
    const v = a.artifact_versions.find((x) => x.version === a.current_version);
    if (!v) continue;
    out.push("", `${a.title.toUpperCase()}${v.user_approved_at ? ` (approved ${day(v.user_approved_at)})` : " (not approved yet)"}`, "", v.content);
  }
  out.push("", `Made by Ivyward on ${day(new Date().toISOString())}.`);
  const name = `${p.schools.name} application record`.replace(/[^\w .-]+/g, "").slice(0, 80);
  return new NextResponse(new Uint8Array(textPdf(`Application record`, out.join("\n"))), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"`, "cache-control": "private, no-store" } });
}
