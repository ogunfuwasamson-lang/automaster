"""IPEDS institutional characteristics (HD) -> hed_institutions rows.

Scope (US): institutions in IPEDS's postsecondary Title IV universe (PSET4FLG = 1) are in scope. Of those, ACT
A/N/R with no closing date are `active`; closed, merged and deleted ones keep their row with that status, so the
history and any agent links survive. Institutions outside the Title IV universe are `excluded` with the reason.
Usage: python3 -I ipeds.py HD2024.csv out.json
"""
import csv, json, sys
from urllib.parse import urlparse

SECTOR = {"0": "Administrative unit", "1": "Public, 4-year or above", "2": "Private nonprofit, 4-year or above", "3": "Private for-profit, 4-year or above",
          "4": "Public, 2-year", "5": "Private nonprofit, 2-year", "6": "Private for-profit, 2-year", "7": "Public, less-than 2-year",
          "8": "Private nonprofit, less-than 2-year", "9": "Private for-profit, less-than 2-year", "99": "Sector unknown"}
HLOFFER = {"0": "Other", "1": "Postsecondary award, certificate or diploma of less than one academic year", "2": "At least 1, but less than 2 academic years",
           "3": "Associate's degree", "4": "At least 2, but less than 4 academic years", "5": "Bachelor's degree", "6": "Postbaccalaureate certificate",
           "7": "Master's degree", "8": "Post-master's certificate", "9": "Doctor's degree", "b": "None of the above or no answer", "-3": "Not available"}
CONTROL = {"1": "public", "2": "private_nonprofit", "3": "private_for_profit"}

def url(u):
    u = (u or "").strip()
    if not u:
        return None
    if not u.lower().startswith(("http://", "https://")):
        u = "https://" + u
    return u

def domain(u):
    try:
        h = urlparse(u).hostname or ""
    except ValueError:
        return None
    return h[4:] if h.startswith("www.") else (h or None)

def kind(r):
    lvl, ctl, hl = r["ICLEVEL"], r["CONTROL"], r["HLOFFER"]
    if lvl == "1":
        return "university" if hl in ("8", "9") else "college"
    if lvl == "2":
        return "community_college" if ctl == "1" else "college"
    return "institute"

def status(r):
    closed = r["CLOSEDAT"].strip() not in ("", "-2")
    if r["ACT"] in ("M", "G"):
        return "merged"
    if r["ACT"] == "C" or closed:
        return "closed"
    if r["ACT"] == "D":
        return "excluded"
    if r["PSET4FLG"] != "1":
        return "excluded"
    return "active"

def num(v):
    try:
        return float(v)
    except ValueError:
        return None

out = []
for r in csv.DictReader(open(sys.argv[1], encoding="utf-8-sig", errors="replace")):
    st = status(r)
    issues = []
    if r["PSET4FLG"] != "1":
        issues.append(f"outside the Title IV universe (PSET4FLG={r['PSET4FLG']})")
    if r["NEWID"].strip() not in ("", "-2"):
        issues.append(f"merged into UNITID {r['NEWID'].strip()}")
    web = url(r["WEBADDR"])
    out.append({
        "country": "US", "registry": "ipeds", "registry_id": r["UNITID"], "name": r["INSTNM"].strip(),
        "aliases": [a.strip() for a in r["IALIAS"].replace("|", ",").split(",") if a.strip()][:12],
        "region": r["STABBR"], "city": r["CITY"].strip(), "address": r["ADDR"].strip(), "postal_code": r["ZIP"].strip(),
        "latitude": num(r["LATITUDE"]), "longitude": num(r["LONGITUD"]),
        "local_type": SECTOR.get(r["SECTOR"], r["SECTOR"]), "type": kind(r), "control": CONTROL.get(r["CONTROL"], "other"),
        "highest_award": HLOFFER.get(r["HLOFFER"], r["HLOFFER"]), "status": st,
        "recognition": "Title IV participating (IPEDS)" if r["PSET4FLG"] == "1" else None,
        "website": web, "domain": domain(web) if web else None,
        "admissions_url": url(r["ADMINURL"]), "financial_aid_url": url(r["FAIDURL"]), "application_url": url(r["APPLURL"]), "net_price_url": url(r["NPRICURL"]),
        "issues": issues,
    })
json.dump(out, open(sys.argv[2], "w"), separators=(",", ":"))
from collections import Counter
print(len(out), "rows", dict(Counter(x["status"] for x in out)), dict(Counter(x["type"] for x in out if x["status"] == "active")))
