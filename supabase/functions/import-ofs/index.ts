// loads the English institution inventory (OfS Register) into hed_institutions. runs inside Supabase with the
// project's own service key, so no secret leaves Supabase. same rules as scripts/hed/ofs.py: every provider on the
// Register is active; providers removed from it (s.18, s.22) are kept as excluded with the date and reason; an
// active suspension is recorded as an issue. idempotent (upsert on registry + registry_id); refuses to run twice
// within an hour.
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const SRC = "https://register-api.officeforstudents.org.uk/api/Download/";
const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
const NONE = new Set(["", "none", "not applicable", "n/a", "no"]);

const clean = (v: unknown) =>
  v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).replace(/\r/g, "").replace(/[ \t\u00a0]+/g, " ").trim();
type Row = Record<string, unknown>;

function sheet(wb: XLSX.WorkBook, prefix: string): Row[] {
  const name = wb.SheetNames.find((n) => n.toLowerCase().startsWith(prefix));
  if (!name) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: null });
  const hi = rows.findIndex((r) => r?.some((c) => clean(c).includes("UKPRN")));
  if (hi < 0) return [];
  const head = rows[hi].map((c) => clean(c).toLowerCase());
  return rows.slice(hi + 1).filter((r) => r?.some((c) => clean(c))).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const col = (r: Row, ...keys: string[]) => {
  for (const [k, v] of Object.entries(r)) if (k && keys.every((x) => k.includes(x))) return clean(v);
  return "";
};
const url = (u: string) => {
  const s = (u || "").trim().split(/\s+/)[0] ?? "";
  if (!s || NONE.has(s.toLowerCase())) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};
const domain = (u: string | null) => { try { return u ? new URL(u).hostname.toLowerCase().replace(/^www\./, "") || null : null; } catch { return null; } };
const names = (v: string) => (v || "").split(/[\n;]+/).map((x) => x.trim()).filter((x) => x && !NONE.has(x.toLowerCase()));
const ukprn = (v: unknown) => clean(v).match(/\d{8}/)?.[0] ?? null;
function address(v: string) {
  let lines = String(v || "").split("\n").map((x) => x.trim()).filter(Boolean);
  if (lines.length && ["united kingdom", "uk", "england"].includes(lines.at(-1)!.toLowerCase())) lines = lines.slice(0, -1);
  const pc = lines.length && POSTCODE.test(lines.at(-1)!) ? lines.at(-1)! : null;
  const rest = pc ? lines.slice(0, -1) : lines;
  return { addr: lines.join(", ") || null, city: rest.at(-1) ?? null, pc };
}
function kind(name: string, title: string, dap: string) {
  if (title === "yes") return "university";
  if (/conservatoire|academy|school of|institute/i.test(name)) return "specialised";
  if (dap.startsWith("research")) return "university";
  return "college";
}

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: last } = await db.from("hed_manifest").select("updated_at").eq("country", "GB").maybeSingle();
  if (last && Date.now() - Date.parse(last.updated_at) < 3600_000) return Response.json({ skipped: "imported within the last hour" });

  const res = await fetch(SRC, { headers: { "user-agent": "ivyward-registry-import (+https://tryivyward.com)" } });
  if (!res.ok) return Response.json({ error: `OfS download: HTTP ${res.status}` }, { status: 502 });
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array", cellDates: true });

  const { data: src, error: srcErr } = await db.from("hed_sources").insert({
    url: SRC, title: "The OfS Register of English Higher Education Providers (spreadsheet download)", publisher: "Office for Students",
    source_type: "registry", license: "Open Government Licence v3.0", lineage: "downloaded by the import-ofs edge function",
    notes: "in scope: every provider on the Register (HERA 2017 s.3); removed providers (s.18, s.22) kept as excluded",
  }).select("id").single();
  if (srcErr) return Response.json({ error: srcErr.message }, { status: 500 });
  const now = new Date().toISOString();
  const base = { country: "GB", registry: "ofs", region: "England", latitude: null, longitude: null, control: null, admissions_url: null, financial_aid_url: null, application_url: null, net_price_url: null, source_id: src.id, checked_at: now, updated_at: now };

  const suspended = new Map<string, string>();
  for (const r of sheet(wb, "registration_suspension")) {
    const u = ukprn(col(r, "ukprn"));
    if (u && col(r, "status").toLowerCase().includes("active")) suspended.set(u, col(r, "reason").slice(0, 300));
  }

  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const r of sheet(wb, "register")) {
    const u = ukprn(col(r, "ukprn"));
    const legal = col(r, "legal name");
    if (!u || !legal || seen.has(u)) continue;
    seen.add(u);
    const trading = names(col(r, "trading name"));
    const formal = /\b(limited|ltd|plc|llp|corporation|cic)\b|^the (chancellor|governing body|board of|council of|university court)/i.test(legal);
    let name = trading.length && formal ? trading[0] : legal.replace(/\s*\(the\)$/i, "");
    const uni = !trading.length && formal ? legal.match(/\b(university of [a-z ,]+?)$/i) : null;
    if (uni) name = uni[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ Of /g, " of ");
    const { addr, city, pc } = address(col(r, "contact address"));
    const title = col(r, "right to use", "university").toLowerCase();
    const dap = col(r, "highest level of degree awarding").toLowerCase();
    const web = url(col(r, "website"));
    const cat = col(r, "category");
    out.push({
      ...base, registry_id: u, name, aliases: [legal, ...trading].filter((x) => x !== name).slice(0, 12),
      city, address: addr, postal_code: pc,
      local_type: [cat && `OfS ${cat}`, dap && !NONE.has(dap) && `${dap} degree awarding powers`, title === "yes" && "university title"].filter(Boolean).join("; ") || null,
      type: kind(name, title, dap), highest_award: NONE.has(dap) ? null : `${dap} degree awarding powers`, status: "active",
      recognition: cat ? `Registered with the Office for Students (${cat})` : "Registered with the Office for Students",
      website: web, domain: domain(web), issues: suspended.has(u) ? [`registration suspended (OfS): ${suspended.get(u)}`] : [],
    });
  }
  for (const [prefix, why] of [["de-registration", "voluntarily removed from the OfS Register"], ["deregistration", "deregistered by the OfS"]]) {
    for (const r of sheet(wb, prefix)) {
      const u = ukprn(col(r, "ukprn"));
      if (!u || seen.has(u)) continue;
      seen.add(u);
      const when = col(r, "date of removal") || col(r, "date of", "deregistration");
      const reason = col(r, "reason").slice(0, 300);
      out.push({
        ...base, registry_id: u, name: col(r, "legal name"), aliases: names(col(r, "trading name")).slice(0, 12),
        city: null, address: null, postal_code: null, local_type: null, type: null, highest_award: null, status: "excluded", recognition: null,
        website: null, domain: null, issues: [`${why}${when ? ` on ${when.slice(0, 10)}` : ""}${reason ? `: ${reason}` : ""}`],
      });
    }
  }
  if (out.length < 100) return Response.json({ error: `only ${out.length} rows parsed; the spreadsheet layout may have changed` }, { status: 500 });

  for (let i = 0; i < out.length; i += 500) {
    const { error } = await db.from("hed_institutions").upsert(out.slice(i, i + 500), { onConflict: "registry,registry_id" });
    if (error) return Response.json({ error: error.message, at: i }, { status: 500 });
  }
  const counts: Record<string, number> = { records: out.length };
  for (const r of out) counts[r.status as string] = (counts[r.status as string] ?? 0) + 1;
  await db.from("hed_manifest").upsert({
    country: "GB", region: "uk", source_id: src.id, denominator: counts.active ?? 0, counts, phase: "inventory", updated_at: now,
    scope: "England: every provider on the Office for Students Register of English higher education providers (universities, colleges with higher education, specialist and private providers). Scotland, Wales and Northern Ireland are not yet loaded. Providers removed from the Register are kept as excluded.",
    notes: "England only so far (OfS Register). Next for the UK: Scotland (SFC), Wales (Medr) and Northern Ireland (DfE NI) funded and degree-awarding bodies.",
  });
  return Response.json({ ok: true, counts });
});
