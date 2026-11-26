import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { checkLimit } from "@/lib/limits";
import { holdApplication, releaseApplication } from "@/lib/wallet";

// the applicant starts one application: the strategist plans it (requirements, positioning), then drafts. from the
// shortlist page (api/applications/[id]/prepare) and from WhatsApp (lib/whatsapp-onboard)
export async function startPreparing(uid: string, id: string, via: "web" | "whatsapp" = "web"): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const db = admin();
  const { data: app } = await db.from("applications").select("id, status, program_id").eq("id", id).eq("user_id", uid).maybeSingle();
  if (!app) return { ok: false, error: "not found", status: 404 };
  if (!["shortlisted", "preparing", "ready_for_review"].includes(app.status)) return { ok: false, error: `can't prepare an application that is ${app.status}`, status: 400 };
  const { count } = await db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("agent", "strategist").in("status", ["queued", "running"]).contains("payload", { applicationId: id });
  if (count) return { ok: false, error: "already preparing", status: 409 };

  if (app.status === "shortlisted") {
    const blocked = await checkLimit(uid, "application");
    if (blocked) return { ok: false, error: blocked, status: 402 };
    // an application's credits are set aside as it starts (lib/wallet)
    const short = await holdApplication(uid, id);
    if (short) return { ok: false, error: short, status: 402 };
    const { error } = await db.from("applications").update({ status: "preparing" }).eq("id", id);
    if (error) {
      await releaseApplication(uid, id).catch(() => 0);
      return { ok: false, error: error.message, status: 400 };
    }
  }
  await enqueue({ userId: uid, agent: "strategist", task: "plan", payload: { applicationId: id } });
  await logEvent({ userId: uid, actor: "user", action: "application.prepare_requested", applicationId: id, programId: app.program_id, ...(via === "whatsapp" ? { channel: "whatsapp" } : {}) });
  return { ok: true };
}
