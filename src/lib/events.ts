import "server-only";
import { admin } from "@/lib/supabase/admin";

// every agent and user action lands here. append-only (db-enforced).
// this table is both the audit log the user sees and the training data for the learning loop.
export interface EventInput {
  userId: string;
  actor: string; // "agent:recon" | "user" | "system"
  action: string; // dotted verb: "program.shortlisted", "email.sent", "artifact.drafted"
  capability?: string;
  schoolId?: string | null;
  programId?: string | null;
  applicationId?: string | null;
  channel?: string;
  artifactVersionId?: string | null;
  agentRunId?: string | null;
  context?: Record<string, unknown>;
  reasoning?: string;
}

export async function logEvent(e: EventInput): Promise<string> {
  const { data, error } = await admin()
    .from("events")
    .insert({
      user_id: e.userId,
      actor: e.actor,
      action: e.action,
      capability: e.capability ?? null,
      school_id: e.schoolId ?? null,
      program_id: e.programId ?? null,
      application_id: e.applicationId ?? null,
      channel: e.channel ?? null,
      artifact_version_id: e.artifactVersionId ?? null,
      agent_run_id: e.agentRunId ?? null,
      context: e.context ?? {},
      reasoning: e.reasoning ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`logEvent failed: ${error.message}`);
  return data.id as string;
}

export async function recordOutcome(o: {
  userId: string;
  eventId?: string;
  applicationId?: string;
  kind: "proxy" | "final";
  label: string;
  value?: number;
  failureReason?: string;
  source: string;
}) {
  const { error } = await admin().from("outcomes").insert({
    user_id: o.userId,
    event_id: o.eventId ?? null,
    application_id: o.applicationId ?? null,
    kind: o.kind,
    label: o.label,
    value: o.value ?? null,
    failure_reason: o.failureReason ?? null,
    source: o.source,
  });
  if (error) throw new Error(`recordOutcome failed: ${error.message}`);
}
