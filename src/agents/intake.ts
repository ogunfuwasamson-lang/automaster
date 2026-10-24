import "server-only";
import * as z from "zod/v4";
import mammoth from "mammoth";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { WirePatch, fromWire, WIRE_GUIDE } from "@/lib/profile";
import { applyPatch, getProfile } from "@/lib/profile-store";
import { logEvent } from "@/lib/events";
import { scheduleConsolidate } from "./curator";

export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export const ExtractOut = z.object({
  detected_kind: z.enum(["cv", "transcript", "degree_certificate", "test_score", "reference_letter", "old_essay", "other"]),
  summary: z.string(), // one or two lines for the documents list
  patch: WirePatch,
  issues: z.array(z.string()), // anything unreadable, inconsistent, or worth asking about
});

const SYSTEM = `you are the intake agent for a platform that runs masters applications to universities anywhere in the world, for applicants in any field.
you read one applicant document and pull out facts for their structured profile.

rules:
- only facts the document states. never infer, embellish, or guess. if it isn't there, leave it null or omit it.
- keep numbers exactly as written. achievements go in work[].highlights with their metrics intact.
- grades: copy the class or GPA exactly as written ("Second Class Upper", "3.62/4.00"). only fill gpa/gpa_scale when both are explicit.
- dates as written, prefer YYYY or YYYY-MM.
- for a CV, also pull 1-3 stories: concrete things the applicant did with a measurable result. title is a short handle.
- never copy passport numbers, national ID numbers, bank details, or home addresses into the profile.
- if two parts of the document disagree, or something important is unreadable, say so in issues.
- summary: one plain line, e.g. "CV, 4 roles 2015-2026, BD and partnerships in fintech".

${WIRE_GUIDE}`;

async function toBlocks(bytes: Buffer, mime: string, filename: string): Promise<ContentBlockParam[]> {
  const lower = filename.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") }, title: filename }];
  }
  if (/^image\/(png|jpeg|gif|webp)$/.test(mime)) {
    return [{ type: "image", source: { type: "base64", media_type: mime as "image/png", data: bytes.toString("base64") } }];
  }
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return [{ type: "document", source: { type: "text", media_type: "text/plain", data: value }, title: filename }];
  }
  if (mime.startsWith("text/") || /\.(txt|md)$/.test(lower)) {
    return [{ type: "document", source: { type: "text", media_type: "text/plain", data: bytes.toString("utf8") }, title: filename }];
  }
  throw new Error(`unsupported file type: ${mime || filename}`);
}

export const intake: Record<string, Handler> = {
  "intake.extract": async (job) => {
    const documentId = String(job.payload.documentId);
    const db = admin();
    const { data: doc, error } = await db
      .from("documents")
      .select("id, user_id, kind, filename, storage_path, mime_type")
      .eq("id", documentId)
      .eq("user_id", job.user_id)
      .single();
    if (error || !doc) throw new Error(`document ${documentId} not found`);

    await db.from("documents").update({ status: "extracting" }).eq("id", doc.id);
    try {
      const { data: file, error: ferr } = await db.storage.from("documents").download(doc.storage_path);
      if (ferr || !file) throw new Error(`download failed: ${ferr?.message}`);
      const bytes = Buffer.from(await file.arrayBuffer());
      if (bytes.length > MAX_DOC_BYTES) throw new Error("file over 10MB");

      const current = await getProfile(job.user_id);
      const blocks = await toBlocks(bytes, doc.mime_type ?? "", doc.filename);
      const { output, runId } = await runStructured({
        userId: job.user_id,
        agent: "intake",
        jobId: job.id,
        promptVersion: "extract-v1",
        system: SYSTEM,
        prompt: [
          ...blocks,
          {
            type: "text",
            text: `the applicant labelled this file as: ${doc.kind}.
current profile, for context only (don't repeat what's already there unless the document adds detail):
${JSON.stringify(current)}

extract the facts from the document.`,
          },
        ],
        schema: ExtractOut,
        maxTokens: 12000,
      });

      await applyPatch(job.user_id, fromWire(output.patch), { actor: "agent:intake", label: `document:${doc.filename}`, agentRunId: runId, documentId: doc.id });
      await db
        .from("documents")
        .update({
          status: "extracted",
          extracted: { kind: output.detected_kind, summary: output.summary, issues: output.issues },
        })
        .eq("id", doc.id);
      await logEvent({
        userId: job.user_id,
        actor: "agent:intake",
        action: "document.extracted",
        agentRunId: runId,
        context: { documentId: doc.id, kind: output.detected_kind, issues: output.issues },
      });
      await scheduleConsolidate(job.user_id);
      return { kind: output.detected_kind, issues: output.issues.length };
    } catch (e) {
      const last = job.attempts >= job.max_attempts;
      await db
        .from("documents")
        .update({ status: last ? "failed" : "uploaded", extracted: { error: String(e) } })
        .eq("id", doc.id);
      throw e;
    }
  },
};
