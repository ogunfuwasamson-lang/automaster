// loads the US institution inventory (IPEDS HD2024) into hed_institutions. runs inside Supabase, so it uses the
// project's own service key (provided to every edge function) and no secret ever leaves Supabase. same rules as
// scripts/hed/ipeds.py: scope = Title IV universe (PSET4FLG = 1); closed / merged / out-of-scope kept with a status.
// idempotent (upsert on registry + registry_id). refuses to run twice within an hour.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { BlobReader, TextWriter, ZipReader } from "jsr:@zip-js/zip-js@2.7.62";
import { parse } from "jsr:@std/csv@1.0.6";

const SRC = "https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip";
const SECTOR: Record<string, string> = { "0": "Administrative unit", "1": "Public, 4-year or above", "2": "Private nonprofit, 4-year or above", "3": "Private for-profit, 4-year or above", "4": "Public, 2-year", "5": "Private nonprofit, 2-year", "6": "Private for-profit, 2-year", "7": "Public, less-than 2-year", "8": "Private nonprofit, less-than 2-year", "9": "Private for-profit, less-than 2-year", "99": "Sector unknown" };
const HL: Record<string, string> = { "0": "Other", "1": "Award of less than one academic year", "2": "At least 1, but less than 2 academic years", "3": "Associate's degree", "4": "At least 2, but less than 4 academic years", "5": "Bachelor's degree", "6": "Postbaccalaureate certificate", "7": "Master's degree", "8": "Post-master's certificate", "9": "Doctor's degree" };
const CONTROL: Record<string, string> = { "1": "public", "2": "private_nonprofit", "3": "private_for_profit" };
const url = (u: string) => (u?.trim() ? (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`) : null);
const domain = (u: string | null) => { try { const h = u ? new URL(u).hostname : ""; return h.replace(/^www\./, "") || null; } catch { return null; } };
const num = (v: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : null);

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: last } = await db.from("hed_manifest").select("updated_at").eq("country", "US").maybeSingle();
  if (last && Date.now() - Date.parse(last.updated_at) < 3600_000) return Response.json({ skipped: "imported within the last hour" });

  const zip = await (await fetch(SRC, { headers: { "user-agent": "ivyward-registry-import (+https://tryivyward.com)" } })).blob();
  const reader = new ZipReader(new BlobReader(zip));
  const entry = (await reader.getEntries()).find((e) => /HD2024\.csv$/i.test(e.filename))!;
  const text = (await entry.getData!(new TextWriter("windows-1252"))).replace(/^﻿/, "");
  await reader.close();
  const rows = parse(text, { skipFirstRow: true }) as Record<string, string>[];

  const { data: src, error: srcErr } = await db.from("hed_sources").insert({ url: SRC, title: "IPEDS 2024 Institutional Characteristics: Directory information (HD2024)", publisher: "U.S. Department of Education, National Center for Education Statistics", source_type: "dataset", license: "U.S. government work (public domain)", lineage: "downloaded by the import-ipeds edge function", notes: "in scope: PSET4FLG = 1 (Title IV postsecondary universe)" }).select("id").single();
  if (srcErr) return Response.json({ error: srcErr.message }, { status: 500 });

  const out = rows.map((r) => {
    const closed = !["", "-2"].includes((r.CLOSEDAT ?? "").trim());
    const status = ["M", "G"].includes(r.ACT) ? "merged" : r.ACT === "C" || closed ? "closed" : r.ACT === "D" || r.PSET4FLG !== "1" ? "excluded" : "active";
    const issues: string[] = [];
    if (r.PSET4FLG !== "1") issues.push(`outside the Title IV universe (PSET4FLG=${r.PSET4FLG})`);
    if (!["", "-2"].includes((r.NEWID ?? "").trim())) issues.push(`merged into UNITID ${r.NEWID.trim()}`);
    const web = url(r.WEBADDR);
    const type = r.ICLEVEL === "1" ? (["8", "9"].includes(r.HLOFFER) ? "university" : "college") : r.ICLEVEL === "2" ? (r.CONTROL === "1" ? "community_college" : "college") : "institute";
    return {
      country: "US", registry: "ipeds", registry_id: r.UNITID, name: r.INSTNM.trim(),
      aliases: (r.IALIAS ?? "").replace(/\|/g, ",").split(",").map((a) => a.trim()).filter(Boolean).slice(0, 12),
      region: r.STABBR, city: r.CITY?.trim(), address: r.ADDR?.trim(), postal_code: r.ZIP?.trim(), latitude: num(r.LATITUDE), longitude: num(r.LONGITUD),
      local_type: SECTOR[r.SECTOR] ?? r.SECTOR, type, control: CONTROL[r.CONTROL] ?? "other", highest_award: HL[r.HLOFFER] ?? r.HLOFFER, status,
      recognition: r.PSET4FLG === "1" ? "Title IV participating (IPEDS)" : null,
      website: web, domain: domain(web), admissions_url: url(r.ADMINURL), financial_aid_url: url(r.FAIDURL), application_url: url(r.APPLURL), net_price_url: url(r.NPRICURL),
      issues, source_id: src.id, checked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
  });
  for (let i = 0; i < out.length; i += 500) {
    const { error } = await db.from("hed_institutions").upsert(out.slice(i, i + 500), { onConflict: "registry,registry_id" });
    if (error) return Response.json({ error: error.message, at: i }, { status: 500 });
  }
  const counts: Record<string, number> = { records: out.length };
  for (const r of out) counts[r.status] = (counts[r.status] ?? 0) + 1;
  await db.from("hed_manifest").upsert({ country: "US", region: "us", scope: "Title IV postsecondary institutions in IPEDS (PSET4FLG = 1): 50 states, DC and US territories; active = ACT A/N/R with no closing date. Closed, merged and out-of-universe institutions are kept with that status.", source_id: src.id, denominator: counts.active ?? 0, counts, phase: "inventory", notes: "User estimate 5,626; IPEDS HD2024 active Title IV count is higher mainly because territories are included and the year is newer.", updated_at: new Date().toISOString() });
  return Response.json({ ok: true, counts });
});
