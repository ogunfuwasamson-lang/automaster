"use client";
import { browserClient } from "@/lib/supabase/browser";

const MAX = 10 * 1024 * 1024;
const safeName = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(-120) || "file";

// uploads one file to the applicant's private storage and registers it for reading
export async function uploadDocument(userId: string, file: File, kind: string): Promise<string | null> {
  if (file.size > MAX) return `${file.name} is over 10 MB`;
  const id = crypto.randomUUID();
  const path = `${userId}/${id}/${safeName(file.name)}`;
  const { error } = await browserClient().storage.from("documents").upload(path, file, { contentType: file.type || undefined });
  if (error) return `${file.name}: ${error.message}`;
  const res = await fetch("/api/documents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, kind, filename: file.name, storagePath: path, mime: file.type || "", size: file.size }),
  });
  if (!res.ok) return `${file.name}: ${(await res.json().catch(() => ({}))).error ?? res.statusText}`;
  return null;
}
