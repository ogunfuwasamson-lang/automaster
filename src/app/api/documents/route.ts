import { DOC_KIND_IDS } from "@/lib/doc-kinds";
import { registerDocument } from "@/lib/document-register";
import { NextResponse, after, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { drain } from "@/lib/jobs";
import { checkLimit } from "@/lib/limits";
import { MAX_DOC_BYTES } from "@/agents/intake";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  id: z.uuid(),
  kind: z.enum(DOC_KIND_IDS),
  filename: z.string().min(1).max(200),
  storagePath: z.string(),
  mime: z.string().max(200),
  size: z.number().int().positive().max(MAX_DOC_BYTES),
  // an admission letter for one application (agents/admission)
  applicationId: z.uuid().optional(),
});

// called after the browser has uploaded the file straight to storage.
// registers the document and queues extraction.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const b = parsed.data;
  const uid = auth.user.id;

  // the path must be inside this user's folder and match the id we were given
  if (!b.storagePath.startsWith(`${uid}/${b.id}/`)) return NextResponse.json({ error: "bad path" }, { status: 400 });

  const blocked = await checkLimit(uid, "document");
  if (blocked) return NextResponse.json({ error: blocked }, { status: 402 });

  const db = admin();
  const folder = `${uid}/${b.id}`;
  const { data: listed } = await db.storage.from("documents").list(folder);
  if (!listed?.some((o) => `${folder}/${o.name}` === b.storagePath)) {
    return NextResponse.json({ error: "file not found in storage" }, { status: 400 });
  }

  const saved = await registerDocument(uid, { id: b.id, kind: b.kind, filename: b.filename, storagePath: b.storagePath, mime: b.mime, applicationId: b.applicationId });
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });
  after(() => drain("inline-upload", 2).catch(() => {}));
  return NextResponse.json({ ok: true });
}
