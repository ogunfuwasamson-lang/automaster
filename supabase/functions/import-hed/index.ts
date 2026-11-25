// loads one country's institution inventory into hed_institutions from the files the "Fetch institution registries"
// workflow saved: the normalised rows on the registry-data branch and the source record in scripts/hed (both public
// in the repository). runs inside Supabase with the project's own service key, so no secret leaves Supabase. same
// rules as scripts/hed/to_sql.py: a source row, an upsert on (registry, registry_id), the country's manifest.
// idempotent; refuses to run for a country twice within ten minutes. ?country=ca|au|fr|cn
import { createClient } from "jsr:@supabase/supabase-js@2";

const REPO = "https://raw.githubusercontent.com/ogunfuwasamson-lang/automaster";
const FILES: Record<string, { rows: string; source: string }> = {
  ca: { rows: "processed/ca-dli.json", source: "ca-source.json" },
  au: { rows: "processed/au_cricos.json", source: "au-source.json" },
  fr: { rows: "processed/fr_mesr.json", source: "fr-source.json" },
  cn: { rows: "processed/cn_moe.json", source: "cn-source.json" },
};
const COLS = ["country", "registry", "registry_id", "name", "local_name", "aliases", "region", "city", "address", "postal_code", "latitude", "longitude", "local_type", "type", "control", "highest_award", "status", "recognition", "website", "domain", "admissions_url", "financial_aid_url", "application_url", "net_price_url", "issues"];

Deno.serve(async (req) => {
  const c = new URL(req.url).searchParams.get("country") ?? "";
  const f = FILES[c];
  if (!f) return Response.json({ error: "country must be one of " + Object.keys(FILES).join(", ") }, { status: 400 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const country = c.toUpperCase();
  const { data: last } = await db.from("hed_manifest").select("updated_at").eq("country", country).maybeSingle();
  if (last && Date.now() - Date.parse(last.updated_at) < 600_000) return Response.json({ skipped: "imported within the last ten minutes" });

  const [rowsRes, srcRes] = await Promise.all([fetch(`${REPO}/registry-data/${f.rows}`), fetch(`${REPO}/main/scripts/hed/${f.source}`)]);
  if (!rowsRes.ok || !srcRes.ok) return Response.json({ error: `download: rows ${rowsRes.status}, source ${srcRes.status}` }, { status: 502 });
  const rows = (await rowsRes.json()) as Record<string, unknown>[];
  const src = (await srcRes.json()) as Record<string, string>;
  if (!Array.isArray(rows) || !rows.length || rows.some((r) => r.country !== country)) return Response.json({ error: "unexpected rows" }, { status: 422 });

  const { data: s, error: sErr } = await db
    .from("hed_sources")
    .insert({ url: src.url, title: src.title, publisher: src.publisher, source_type: src.source_type ?? "registry", license: src.license, lineage: src.lineage, notes: src.notes })
    .select("id")
    .single();
  if (sErr) return Response.json({ error: sErr.message }, { status: 500 });
  const now = new Date().toISOString();
  let upserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500).map((r) => ({ ...Object.fromEntries(COLS.map((k) => [k, r[k] ?? null])), aliases: r.aliases ?? [], issues: r.issues ?? [], source_id: s.id, checked_at: now, updated_at: now }));
    const { error } = await db.from("hed_institutions").upsert(batch, { onConflict: "registry,registry_id" });
    if (error) return Response.json({ error: error.message, upserted }, { status: 500 });
    upserted += batch.length;
  }
  const { error: mErr } = await db
    .from("hed_manifest")
    .upsert({ country, region: src.region ?? c, scope: src.scope, source_id: s.id, phase: "inventory", notes: src.manifest_notes ?? null, updated_at: now }, { onConflict: "country" });
  if (mErr) return Response.json({ error: mErr.message, upserted }, { status: 500 });
  await db.rpc("hed_refresh_manifest", { c: country }).then(() => {}, () => {});
  return Response.json({ country, upserted, source_id: s.id });
});
