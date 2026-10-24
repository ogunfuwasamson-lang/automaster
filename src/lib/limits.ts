import "server-only";
import { admin } from "@/lib/supabase/admin";
import { userPlan } from "@/lib/budget";
import { monthStartUTC } from "@/lib/pricing";

// plan limits checked at the door, before any work is queued. returns a message when blocked.
export async function checkLimit(userId: string, what: "recon_run" | "application" | "document"): Promise<string | null> {
  const db = admin();
  const { plan } = await userPlan(userId);
  const upgrade = plan.id === "free" ? " upgrade to pro for more." : "";
  if (what === "recon_run") {
    const { count } = await db
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("agent", "recon")
      .eq("task", "discover")
      .gte("created_at", monthStartUTC());
    if ((count ?? 0) >= plan.recon_runs_per_month) return `your ${plan.name} plan includes ${plan.recon_runs_per_month} shortlist run${plan.recon_runs_per_month > 1 ? "s" : ""} a month.${upgrade}`;
  }
  if (what === "application") {
    const { count } = await db
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("status", "in", "(researching,shortlisted,dropped)");
    if ((count ?? 0) >= plan.maxActiveApplications) return `your ${plan.name} plan includes ${plan.maxActiveApplications} application${plan.maxActiveApplications > 1 ? "s" : ""}.${upgrade}`;
  }
  if (what === "document") {
    const { count } = await db.from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if ((count ?? 0) >= plan.maxDocuments) return `your ${plan.name} plan holds ${plan.maxDocuments} documents.${upgrade}`;
  }
  return null;
}
