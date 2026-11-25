"""CRICOS (Australia) -> hed_institutions rows.

Scope (Australia): every provider on the Commonwealth Register of Institutions and Courses for Overseas Students
(Department of Education) registered to teach overseas students at least one bachelor's, master's or doctoral degree
that hasn't expired. One record per CRICOS provider code. Name, website and state from the Institutions sheet; the
town most of its locations are in from the Locations sheet; its highest degree from the Courses sheet.
Usage: python3 -I au_cricos.py RAW_DIR out.json   (reads RAW_DIR/au-cricos.xlsx)
"""
import json, os, re, sys
from collections import Counter, defaultdict
import openpyxl

DEG = {"Bachelor Degree": 1, "Bachelor Honours Degree": 1, "Masters Degree (Coursework)": 2, "Masters Degree (Research)": 2, "Masters Degree (Extended)": 2, "Doctoral Degree": 3}
AWARD = {1: "Bachelor's degree", 2: "Master's degree", 3: "Doctor's degree"}
STATE = {"NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"}

wb = openpyxl.load_workbook(os.path.join(sys.argv[1], "au-cricos.xlsx"), read_only=True)
def rows(sheet):
    it = wb[sheet].iter_rows(values_only=True)
    head = None
    for r in it:
        if head is None:
            if r and r[0] == "CRICOS Provider Code":
                head = [str(c) for c in r]
            continue
        if r and r[0]:
            yield {h: ("" if v is None else str(v).strip()) for h, v in zip(head, r)}

top = defaultdict(int)
ncourses = Counter()
for c in rows("Courses"):
    lvl = DEG.get(c["Course Level"])
    if lvl and c.get("Expired", "No") != "Yes":
        top[c["CRICOS Provider Code"]] = max(top[c["CRICOS Provider Code"]], lvl)
        ncourses[c["CRICOS Provider Code"]] += 1
towns = defaultdict(Counter)
for l in rows("Locations"):
    if l["City"]:
        towns[l["CRICOS Provider Code"]][(l["City"].title(), l["State"])] += 1

def site(u):
    u = (u or "").strip()
    if not u:
        return None
    if not re.match(r"https?://", u, re.I):
        u = "https://" + u.lstrip("/")
    return u

out = []
for i in rows("Institutions"):
    code = i["CRICOS Provider Code"]
    if code not in top:
        continue
    inst, trading = i["Institution Name"], i["Trading Name"]
    # "Macquarie University (Macquarie)": the trading name is the plain one when there is one
    name = trading or re.sub(r"\s*\([^)]*\)\s*$", "", inst) or inst
    aliases = [a for a in dict.fromkeys([inst, re.sub(r"\s*\([^)]*\)\s*$", "", inst)]) if a and a != name]
    gov = i["Institution Type"] == "Government"
    # town and state both from the provider's own address, so they agree (a location count picks delivery partners:
    # the University of the Sunshine Coast came out in Adelaide); its teaching locations only when it has no address
    postal = (i["Postal Address City"].title() or None, i["Postal Address State"])
    town = postal if postal[0] and postal[1] in STATE else (towns[code].most_common(1)[0][0] if towns[code] else postal)
    state = town[1] if town and town[1] in STATE else None
    web = site(i["Website"])
    dom = re.sub(r"^www\.", "", re.sub(r"^https?://", "", web).split("/")[0].lower()) if web else None
    uni = bool(re.search(r"\buniversity\b", name, re.I))
    out.append({
        "country": "AU", "registry": "cricos", "registry_id": code, "name": name, "aliases": aliases,
        "region": state, "city": town[0] if town else None,
        "address": None, "postal_code": i["Postal Address Postcode"] or None, "latitude": None, "longitude": None,
        "local_type": f"{'Public' if gov else 'Private'} higher education provider; {ncourses[code]} degree courses registered for overseas students",
        "type": "university" if uni else "institute", "control": "public" if gov else "other",
        "highest_award": AWARD[top[code]], "status": "active",
        "recognition": f"Registered on CRICOS to teach overseas students (Australian Government Department of Education), provider {code}",
        "website": web, "domain": dom,
        "admissions_url": None, "financial_aid_url": None, "application_url": None, "net_price_url": None,
        "issues": [],
    })

json.dump(out, open(sys.argv[2], "w"), separators=(",", ":"))
print(len(out), "rows", dict(Counter(x["type"] for x in out)), "public:", sum(1 for x in out if x["control"] == "public"), "with website:", sum(1 for x in out if x["website"]), dict(Counter(x["region"] for x in out)))
