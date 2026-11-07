"""OfS Register (England) -> hed_institutions rows.

Scope (UK, England): every provider on the Office for Students Register of English higher education providers
(HERA 2017 s.3) is `active`. Providers removed from the Register (s.18 deregistration, s.22 voluntary removal) are
kept as `excluded` with the date and reason, unless they are back on the Register. An active suspension of
registration is recorded as an issue. Scotland, Wales and Northern Ireland are not on this register.
Usage: python3 -I ofs.py ofs-register.xlsx out.json
"""
import json, re, sys
from collections import Counter
from datetime import date, datetime
from urllib.parse import urlparse

import openpyxl

POSTCODE = re.compile(r"^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$", re.I)
NONE = {"", "none", "not applicable", "n/a", "no"}


def clean(v):
    if v is None:
        return ""
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    return re.sub(r"[ \t\xa0]+", " ", str(v).replace("\r", "")).strip()


def sheet(wb, prefix):
    for ws in wb.worksheets:
        if ws.title.lower().startswith(prefix):
            rows = list(ws.iter_rows(values_only=True))
            hi = next(i for i, r in enumerate(rows) if r and any("UKPRN" in clean(c) for c in r))
            head = [clean(c).lower() for c in rows[hi]]
            return [dict(zip(head, r)) for r in rows[hi + 1:] if r and any(clean(c) for c in r)]
    return []


def col(row, *keys):
    for k, v in row.items():
        if k and all(x in k for x in keys):
            return clean(v)
    return ""


def url(u):
    u = (u or "").strip().split()[0] if (u or "").strip() else ""
    if not u or u.lower() in NONE:
        return None
    return u if u.lower().startswith(("http://", "https://")) else "https://" + u


def domain(u):
    try:
        h = (urlparse(u).hostname or "").lower()
    except ValueError:
        return None
    return h[4:] if h.startswith("www.") else (h or None)


def names(v):
    return [x.strip() for x in re.split(r"[\n;]+", v or "") if x.strip() and x.strip().lower() not in NONE]


def ukprn(v):
    m = re.search(r"\d{8}", clean(v))
    return m.group(0) if m else None


def address(v):
    lines = [x.strip() for x in str(v or "").split("\n") if x.strip()]
    if lines and lines[-1].lower() in ("united kingdom", "uk", "england"):
        lines = lines[:-1]
    pc = lines[-1] if lines and POSTCODE.match(lines[-1]) else None
    rest = lines[:-1] if pc else lines
    return ", ".join(lines) or None, (rest[-1] if rest else None), pc


def kind(name, title, dap):
    if title == "yes":
        return "university"
    n = name.lower()
    if "conservatoire" in n or "academy" in n or "school of" in n or "institute" in n:
        return "specialised"
    if dap.startswith("research"):
        return "university"
    return "college"


wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
out, seen = [], set()

suspended = {}
for r in sheet(wb, "registration_suspension"):
    if (u := ukprn(col(r, "ukprn"))) and "active" in col(r, "status").lower():
        suspended[u] = col(r, "reason")[:300]

for r in sheet(wb, "register"):
    u = ukprn(col(r, "ukprn"))
    legal = col(r, "legal name")
    if not u or not legal or u in seen:
        continue
    seen.add(u)
    trading = names(col(r, "trading name"))
    # the name people know: the first trading name when the legal name is a company ("Lamda Limited" -> "LAMDA")
    formal = re.search(r"\b(limited|ltd|plc|llp|corporation|cic)\b|^the (chancellor|governing body|board of|council of|university court)", legal, re.I)
    name = trading[0] if trading and formal else re.sub(r"\s*\(the\)$", "", legal, flags=re.I)
    if formal and not trading and (m := re.search(r"\b(university of [a-z ,]+?)$", legal, re.I)):
        name = m.group(1).strip().title().replace(" Of ", " of ")
    aliases = [x for x in [legal, *trading] if x != name][:12]
    addr, city, pc = address(col(r, "contact address"))
    title = col(r, "right to use", "university").lower()
    dap = col(r, "highest level of degree awarding").lower()
    web = url(col(r, "website"))
    issues = []
    if u in suspended:
        issues.append(f"registration suspended (OfS): {suspended[u]}")
    cat = col(r, "category")
    out.append({
        "country": "GB", "registry": "ofs", "registry_id": u, "name": name, "aliases": aliases,
        "region": "England", "city": city, "address": addr, "postal_code": pc, "latitude": None, "longitude": None,
        "local_type": "; ".join(x for x in [cat and f"OfS {cat}", dap and dap.lower() not in NONE and f"{dap} degree awarding powers", title == "yes" and "university title"] if x) or None,
        "type": kind(name, title, dap), "control": None,
        "highest_award": None if dap.lower() in NONE else f"{dap} degree awarding powers",
        "status": "active", "recognition": f"Registered with the Office for Students ({cat})" if cat else "Registered with the Office for Students",
        "website": web, "domain": domain(web) if web else None,
        "admissions_url": None, "financial_aid_url": None, "application_url": None, "net_price_url": None,
        "issues": issues,
    })

for prefix, why in (("de-registration", "voluntarily removed from the OfS Register"), ("deregistration", "deregistered by the OfS")):
    for r in sheet(wb, prefix):
        u = ukprn(col(r, "ukprn"))
        if not u or u in seen:
            continue
        seen.add(u)
        legal = col(r, "legal name")
        trading = names(col(r, "trading name"))
        when = col(r, "date of removal") or col(r, "date of", "deregistration")
        out.append({
            "country": "GB", "registry": "ofs", "registry_id": u, "name": legal, "aliases": trading[:12],
            "region": "England", "city": None, "address": None, "postal_code": None, "latitude": None, "longitude": None,
            "local_type": None, "type": None, "control": None, "highest_award": None, "status": "excluded", "recognition": None,
            "website": None, "domain": None, "admissions_url": None, "financial_aid_url": None, "application_url": None, "net_price_url": None,
            "issues": [f"{why}{f' on {when[:10]}' if when else ''}: {col(r, 'reason')[:300]}".rstrip(": ")],
        })

json.dump(out, open(sys.argv[2], "w"), separators=(",", ":"))
act = [x for x in out if x["status"] == "active"]
print(len(out), "rows", dict(Counter(x["status"] for x in out)), dict(Counter(x["type"] for x in act)),
      "with website:", sum(1 for x in act if x["website"]), "university title:", sum(1 for x in act if "university title" in (x["local_type"] or "")))
