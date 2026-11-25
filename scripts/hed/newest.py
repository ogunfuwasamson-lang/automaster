"""the newest spreadsheet resource of a CKAN package (data.gov.au's CRICOS dataset).
Usage: python3 -I newest.py package_show.json
"""
import json, sys

res = json.load(open(sys.argv[1]))["result"]["resources"]
sheets = [r for r in res if str(r.get("url", "")).lower().split("?")[0].endswith((".xlsx", ".xls")) or str(r.get("format", "")).lower() in ("xlsx", "xls")]
sheets.sort(key=lambda r: (r.get("created") or "", r.get("last_modified") or ""), reverse=True)
print(sheets[0]["url"] if sheets else "")
