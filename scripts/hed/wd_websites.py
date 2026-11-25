"""fill in websites the official list doesn't give, from Wikidata, on an exact name match (one Wikidata item only).
Usage: python3 -I wd_websites.py rows.json wikidata.csv out.json
"""
import csv, json, re, sys, unicodedata
from collections import defaultdict

def norm(s):
    s = (s or "").replace("’", "'")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().replace("&", " and ")
    s = re.sub(r"\b(the|of|de|des|du|la|le|l)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

rows = json.load(open(sys.argv[1]))
items = defaultdict(set)
sites = defaultdict(set)
for r in csv.DictReader(open(sys.argv[2], encoding="utf-8")):
    for label in (r.get("en"), r.get("fr")):
        if label:
            items[norm(label)].add(r["item"])
    if r.get("site"):
        sites[r["item"]].add(r["site"])
n = 0
for x in rows:
    if x.get("website"):
        continue
    hits = set()
    for name in [x["name"], *x.get("aliases", [])]:
        hits |= items.get(norm(name), set())
    if len(hits) != 1:
        continue
    s = sorted(sites[next(iter(hits))], key=lambda u: (not u.startswith("https"), len(u)))
    if not s:
        continue
    x["website"] = s[0]
    x["domain"] = re.sub(r"^www\.", "", re.sub(r"^https?://", "", s[0]).split("/")[0].lower())
    x["issues"] = [*x.get("issues", []), "website from Wikidata (not in the official list)"]
    n += 1
json.dump(rows, open(sys.argv[3], "w"), separators=(",", ":"))
print("websites added from Wikidata:", n, "now with website:", sum(1 for x in rows if x.get("website")), "of", len(rows))
