import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { previewMode, previewClient } from "./preview";

// service-role client. bypasses RLS, so every query MUST scope by user_id.
// only agents and server routes use this; never import it from a client component.
let cached: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (previewMode()) return previewClient() as unknown as SupabaseClient;
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase env missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
