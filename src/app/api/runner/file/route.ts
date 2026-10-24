import { NextResponse, type NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { loadSheet, runnerUser } from "@/lib/runner";
import { textPdf } from "@/lib/pdf";

export const runtime = "nodejs";

// serves the applicant's own documents and approved essays (as pdf) to their extension
export async function GET(req: NextRequest) {
  const uid = await runnerUser(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const sheet = await loadSheet(uid, q.get("application") ?? "");
  if (!sheet) return NextResponse.json({ error: "no approved packet" }, { status: 404 });

  const artifact = q.get("artifact");
  if (artifact) {
    const e = sheet.essays.find((x) => x.artifact_id === artifact);
    if (!e) return NextResponse.json({ error: "not an approved essay" }, { status: 404 });
    const name = sheet.files.find((f) => f.key === `essay:${artifact}`)?.filename ?? "essay.pdf";
    return new NextResponse(new Uint8Array(textPdf(e.title, e.text)), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}"` } });
  }

  const docId = q.get("document");
  if (!docId || !sheet.files.some((f) => f.url.includes(`document=${docId}`))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = admin();
  const { data: doc } = await db.from("documents").select("storage_path, filename, mime_type").eq("id", docId).eq("user_id", uid).maybeSingle();
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: blob, error } = await db.storage.from("documents").download(doc.storage_path);
  if (error || !blob) return NextResponse.json({ error: "couldn't read the file" }, { status: 500 });
  return new NextResponse(new Uint8Array(await blob.arrayBuffer()), {
    headers: { "content-type": doc.mime_type ?? "application/octet-stream", "content-disposition": `attachment; filename="${doc.filename.replace(/"/g, "")}"` },
  });
}
