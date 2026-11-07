"""normalised institution rows (JSON from ipeds.py and the other country importers) -> one idempotent SQL file:
the source row, then upserts on (registry, registry_id), then the country's manifest.
Usage: python3 -I to_sql.py rows.json source.json out.sql
source.json: {url, title, publisher, source_type, license, lineage, notes, country, region, scope}
"""
import json, sys
from collections import Counter

rows = json.load(open(sys.argv[1]))
src = json.load(open(sys.argv[2]))
q = lambda s: "null" if s is None else "'" + str(s).replace("'", "''") + "'"
COLS = "country text, registry text, registry_id text, name text, aliases text[], region text, city text, address text, postal_code text, latitude double precision, longitude double precision, local_type text, type text, control text, highest_award text, status text, recognition text, website text, domain text, admissions_url text, financial_aid_url text, application_url text, net_price_url text, issues text[]"
names = ", ".join(c.strip().split(" ")[0] for c in COLS.split(","))
upd = ", ".join(f"{n} = excluded.{n}" for n in names.split(", ") if n not in ("country", "registry", "registry_id"))
srcq = f"(select id from public.hed_sources where url = {q(src['url'])} order by accessed_at desc limit 1)"
out = ["begin;",
       f"insert into public.hed_sources(url, title, publisher, source_type, license, lineage, notes) values ({q(src['url'])}, {q(src.get('title'))}, {q(src.get('publisher'))}, {q(src.get('source_type', 'dataset'))}, {q(src.get('license'))}, {q(src.get('lineage'))}, {q(src.get('notes'))});"]
for i in range(0, len(rows), 1000):
    blob = json.dumps(rows[i:i + 1000], separators=(",", ":"))
    assert "$hed$" not in blob
    out.append(f"insert into public.hed_institutions ({names}, source_id, checked_at)\nselect {names}, {srcq}, now() from jsonb_to_recordset($hed${blob}$hed$::jsonb) as x({COLS})\non conflict (registry, registry_id) do update set {upd}, source_id = excluded.source_id, checked_at = now(), updated_at = now();")
by = Counter(r["status"] for r in rows)
out.append(f"insert into public.hed_manifest(country, region, scope, source_id, phase, notes) values ({q(src['country'])}, {q(src['region'])}, {q(src['scope'])}, {srcq}, 'inventory', {q(src.get('manifest_notes'))})\non conflict (country) do update set scope = excluded.scope, source_id = excluded.source_id, notes = excluded.notes, updated_at = now();")
out.append(f"select public.hed_refresh_manifest({q(src['country'])});")
out.append("commit;")
open(sys.argv[3], "w").write("\n".join(out))
print(len(rows), "rows ->", sys.argv[3], dict(by))
