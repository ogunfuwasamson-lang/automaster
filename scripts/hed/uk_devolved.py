"""Scotland, Wales and Northern Ireland -> hed_institutions rows.

Scope:
- Scotland: higher education institutions that are fundable bodies under Schedule 2 of the Further and Higher Education
  (Scotland) Act 2005 (the Open University is in the England rows), and the 24 colleges the Scottish Funding Council funds.
- Wales: every provider on Medr's Register of Higher Education Providers.
- Northern Ireland: the Department for the Economy's list of higher education providers (recognised and listed bodies;
  the Open University is in the England rows).
All are `active`. UKPRN, address and postcode location come from the UK learning providers list (UKRLP) when a
provider matches it by website domain or name; otherwise the id is a slug of the official name.
Usage: python3 -I uk_devolved.py gb-devolved-seed.json medr-register.xlsx learning-providers-plus.csv out.json
"""
import csv, json, re, sys, unicodedata
from collections import Counter
from urllib.parse import urlparse

import openpyxl

seed = json.load(open(sys.argv[1]))
STOP = {"the", "of", "and", "&"}


def toks(s):
    return frozenset(t for t in re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower().replace("&", " and ")).split() if t not in STOP)


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def url(u):
    u = (u or "").strip()
    if not u:
        return None
    u = u if u.lower().startswith(("http://", "https://")) else "https://" + u
    p = urlparse(u)
    return f"{p.scheme}://{p.netloc}/" if p.path in ("", "/", "/About", "/about-us", "/en/") else u


def domain(u):
    try:
        h = (urlparse(u).hostname or "").lower()
    except ValueError:
        return None
    return h[4:] if h.startswith("www.") else (h or None)


def nation(pc):
    a = re.match(r"[A-Z]+", (pc or "").upper())
    a = a.group(0) if a else ""
    if a == "BT":
        return "Northern Ireland"
    if a in ("AB", "DD", "DG", "EH", "FK", "G", "HS", "IV", "KA", "KW", "KY", "ML", "PA", "PH", "TD", "ZE"):
        return "Scotland"
    if a in ("CF", "LL", "NP", "SA", "LD", "SY"):  # SY straddles the border; only Welsh-matched names use it
        return "Wales"
    return "England"


lp = list(csv.DictReader(open(sys.argv[3], encoding="utf-8-sig")))
for r in lp:
    r["_nation"], r["_toks"], r["_domain"] = nation(r["POSTCODE"]), toks(r["VIEW_NAME"]), domain(url(r["WEBSITE_URL"]))


def match(name, web, where):
    cands = [r for r in lp if r["_nation"] == where]
    d = domain(web) if web else None
    for r in cands:
        if d and r["_domain"] == d:
            return r
    t = toks(seed.get("formerly", {}).get(name, name))
    exact = [r for r in cands if r["_toks"] == t or toks(r["PROVIDER_NAME"]) == t]
    if len(exact) == 1:
        return exact[0]
    sub = [r for r in cands if t and (t <= r["_toks"] or r["_toks"] <= t)]
    return sub[0] if len(sub) == 1 else None


def row(name, where, registry, kind, web, recognition, local_type, highest=None, aliases=(), issues=(), extra=None):
    m = match(name, web, where)
    web = url(web) or (url(m["WEBSITE_URL"]) if m else None)
    addr = ", ".join(x for x in [m["BUILDING_NAME_NUMBER"], m["STREET_NAME"], m["LOCALITY"], m["TOWN"], m["POSTCODE"]] if x.strip()).title() if m else None
    al = [a for a in [*aliases, *([m["VIEW_NAME"]] if m and m["VIEW_NAME"] != name else [])] if a and a != name]
    out = {
        "country": "GB", "registry": registry, "registry_id": m["UKPRN"] if m else slug(name), "name": name, "aliases": list(dict.fromkeys(al))[:12],
        "region": where, "city": m["TOWN"].title() if m else None, "address": addr, "postal_code": m["POSTCODE"] if m else None,
        "latitude": float(m["LATITUDE"]) if m and m["LATITUDE"] else None, "longitude": float(m["LONGITUDE"]) if m and m["LONGITUDE"] else None,
        "local_type": local_type, "type": kind, "control": None, "highest_award": highest, "status": "active", "recognition": recognition,
        "website": web, "domain": domain(web) if web else None,
        "admissions_url": None, "financial_aid_url": None, "application_url": None, "net_price_url": None,
        "issues": list(issues) + ([] if web else ["website not published in the source list"]),
    }
    if extra:
        out.update(extra)
    return out


out = []

# Scotland
for n in seed["scotland_universities"]:
    k = "specialised" if n in ("Glasgow School of Art", "Royal Conservatoire of Scotland", "SRUC") else "university"
    out.append(row(n, "Scotland", "sfc", k, None, "Fundable body: higher education institution (Further and Higher Education (Scotland) Act 2005, Schedule 2)",
                   "Scottish higher education institution"))
for n, web, reg in seed["scotland_colleges"]:
    out.append(row(n, "Scotland", "sfc", "college", web, f"College funded by the Scottish Funding Council ({reg} region)", f"Scottish college ({reg})"))

# Wales: Medr register
wb = openpyxl.load_workbook(sys.argv[2], read_only=True, data_only=True)
ws = wb.worksheets[0]
rows = [r for r in ws.iter_rows(values_only=True) if any(c not in (None, "") for c in r)]
hi = next(i for i, r in enumerate(rows) if r and r[0] and "provider name" in str(r[0]).lower())
head = [str(c or "").strip().lower() for c in rows[hi]]
for r in rows[hi + 1:]:
    d = dict(zip(head, r))
    name = str(d.get("provider name") or "").strip()
    if not name:
        continue
    g = lambda k: str(next((v for kk, v in d.items() if kk.startswith(k)), "") or "").strip()
    research, taught = g("authorised to grant research").lower(), g("authorised to grant taught").lower()
    highest = "research degree awarding powers" if research.startswith("by") else "taught degree awarding powers" if taught.startswith("by") else None
    lines = [x.strip().rstrip(",") for x in g("main address").split("\n") if x.strip()]
    pc = lines[-1] if lines and re.match(r"^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$", lines[-1], re.I) else None
    rt = g("registration type")
    x = row(name, "Wales", "medr", "university" if "university" in name.lower() else "college", g("website address"),
            f"Registered with Medr (Higher Education ({rt}))", f"Medr Higher Education ({rt}); {g('tertiary education type')}".strip("; "), highest,
            extra={"address": ", ".join(lines) or None, "postal_code": pc})
    if not x["city"] and len(lines) >= 2:
        x["city"] = lines[-2] if pc else lines[-1]
    out.append(x)

# Northern Ireland
for n, kind_of_body, k, web in seed["northern_ireland"]:
    rec = "Recognised body (degree awarding powers), Department for the Economy NI" if kind_of_body == "recognised" else "Listed body (courses validated by a recognised body), Department for the Economy NI"
    out.append(row(n, "Northern Ireland", "dfeni", k, web, rec, f"Northern Ireland {kind_of_body} body",
                   "degree awarding powers" if kind_of_body == "recognised" else None))

ids = Counter((r["registry"], r["registry_id"]) for r in out)
assert all(v == 1 for v in ids.values()), [k for k, v in ids.items() if v > 1]
json.dump(out, open(sys.argv[4], "w"), separators=(",", ":"))
print(len(out), "rows", dict(Counter(r["region"] for r in out)), dict(Counter(r["type"] for r in out)),
      "ukprn matched:", sum(1 for r in out if r["registry_id"].isdigit()), "with website:", sum(1 for r in out if r["website"]))
