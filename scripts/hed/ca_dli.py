"""IRCC designated learning institutions (Canada) -> hed_institutions rows.

Scope (Canada): every post-secondary institution on Immigration, Refugees and Citizenship Canada's designated
learning institutions (DLI) list, i.e. the institutions that may enrol international students on a study permit.
One record per DLI number (campuses of the same DLI are merged; their cities are kept). All are `active` while they
are on the list. The list has no websites: a website is added from the Hipo university-domains list when the name
matches exactly, and marked as such.
Usage: python3 -I ca_dli.py dli-full-list.json world_universities_and_domains.json out.json
"""
import json, re, sys, unicodedata
from collections import Counter, defaultdict

PROV = {"Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB", "New Brunswick": "NB", "Newfoundland and Labrador": "NL",
        "Nova Scotia": "NS", "Northwest Territories": "NT", "Nunavut": "NU", "Ontario": "ON", "Prince Edward Island": "PE",
        "Quebec": "QC", "Saskatchewan": "SK", "Yukon": "YT"}


def norm(s):
    s = (s or "").replace("’", "'").replace("‘", "'")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().replace("&", " and ")
    s = re.sub(r"\b(the|of|de|des|du|la|le|l)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def variants(name):
    base = re.split(r",\s*including\b", name)[0]
    out = {name, base, re.sub(r"\s*\(.*?\)\s*", " ", base).strip()}
    out |= set(re.findall(r"\(([^)]+)\)", name))
    out |= {p.strip() for p in base.split("/") if p.strip()}
    return {norm(v) for v in out if v.strip()}


def text(v):
    v = re.sub(r"<[^>]+>", " ", str(v or ""))
    return re.sub(r"\s+", " ", v).strip()


def kind(name, public):
    n = norm(name)
    if re.search(r"\b(universit[ey]|universite)\b", n) and not re.search(r"\bcollege .* at\b", n):
        return "university"
    if re.search(r"\bpolytechni|institute technology|institut technologie", n):
        return "polytechnic"
    if re.search(r"\b(college|cegep|college)\b", n):
        return "college"
    if re.search(r"\b(language|english|french|languages|esl)\b", n):
        return "specialised"
    if re.search(r"\b(school|academy|institute|institut|ecole|conservatory|seminary)\b", n):
        return "institute" if public else "specialised"
    return "other"


rows = json.load(open(sys.argv[1]))["data"]
hipo = [x for x in json.load(open(sys.argv[2])) if x.get("alpha_two_code") == "CA"]
by_name = defaultdict(list)
for h in hipo:
    by_name[norm(h["name"])].append(h)

groups = defaultdict(list)
for r in rows:
    d = text(r.get("DLI #"))
    if d:
        groups[d].append(r)

out = []
for dli, rs in groups.items():
    first = rs[0]
    # several affiliated colleges can share one DLI number (St. Jerome's, Conrad Grebel... under Waterloo): name the
    # record after the institution most of its campuses carry, preferring a name without "(...)"
    cnt = Counter(text(r["Institution"]) for r in rs)
    names = sorted(cnt, key=lambda n: (-cnt[n], "(" in n, len(n)))
    name = names[0]
    public = "public" in text(first["Public/Private"]).lower()
    cities = list(dict.fromkeys(c.strip() for r in rs for c in text(r["City"]).split(",") if c.strip()))
    campuses = list(dict.fromkeys(text(r["Campus"]) for r in rs if text(r["Campus"])))
    grad = any(text(r["Grad Program"]).lower() == "yes" for r in rs)
    pg = Counter(text(r["PGWP"]).lower() for r in rs)
    pgwp = "yes" if pg.get("yes") else "see IRCC details" if pg.get("details") else "no"
    hit = None
    for v in variants(name):
        if len(by_name.get(v, [])) == 1:
            hit = by_name[v][0]
            break
    web = (hit["web_pages"][0] if hit and hit.get("web_pages") else None)
    dom = hit["domains"][0].lower() if hit and hit.get("domains") else None
    issues = []
    if re.search(r"\bat\b", name) and re.search(r"\b(college|collège)\b.*\bat\b", name, re.I):
        issues.append("public college program delivered at a private partner campus")
    if web:
        issues.append("website from the Hipo university-domains list (not in the IRCC list)")
    if len(campuses) > 1:
        issues.append("campuses: " + "; ".join(campuses[:20]))
    out.append({
        "country": "CA", "registry": "ircc_dli", "registry_id": dli, "name": name, "aliases": names[1:12],
        "region": PROV.get(text(first["Province"]), text(first["Province"])), "city": cities[0] if cities else None,
        "address": None, "postal_code": None, "latitude": None, "longitude": None,
        "local_type": f"{'Public' if public else 'Private'} institution; graduate programs: {'yes' if grad else 'no'}; PGWP-eligible programs: {pgwp}",
        "type": kind(name, public), "control": "public" if public else "other", "highest_award": None,
        "status": "active", "recognition": f"Designated learning institution (IRCC), DLI {dli}",
        "website": web, "domain": dom,
        "admissions_url": None, "financial_aid_url": None, "application_url": None, "net_price_url": None,
        "issues": issues,
    })

json.dump(out, open(sys.argv[3], "w"), separators=(",", ":"))
print(len(out), "rows", dict(Counter(x["type"] for x in out)), "public:", sum(1 for x in out if x["control"] == "public"),
      "graduate:", sum(1 for x in out if "graduate programs: yes" in x["local_type"]), "with website:", sum(1 for x in out if x["website"]),
      dict(Counter(x["region"] for x in out)))
