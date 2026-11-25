"""MESR principal higher education institutions (France) -> hed_institutions rows.

Scope (France): every institution in the Ministry of Higher Education and Research's dataset "Principaux
établissements d'enseignement supérieur" (data.enseignementsup-recherche.gouv.fr, Licence Ouverte): universities,
grands établissements, écoles (public and private) and other degree-awarding institutions. One record per Paysage id.
Usage: python3 -I fr_mesr.py RAW_DIR out.json   (reads RAW_DIR/fr-esr-etablissements.csv)
"""
import csv, json, os, re, sys
from collections import Counter

rows = list(csv.DictReader(open(os.path.join(sys.argv[1], "fr-esr-etablissements.csv"), encoding="utf-8-sig"), delimiter=";"))
# hed_institutions.type: grands établissements (Dauphine, Sciences Po, EHESS...) award degrees like universities
KIND = {"Université": "university", "Grand établissement": "university", "École": "specialised", "Autre établissement": "other"}
LABEL = {"Université": "University", "Grand établissement": "Grand établissement (public institution with special status)", "École": "École (school)", "Autre établissement": "Other institution"}

def site(u):
    u = (u or "").strip()
    return u if re.match(r"https?://", u, re.I) else (("https://" + u) if u else None)

out = []
for r in rows:
    pid = r["etablissement_id_paysage"].strip()
    if not pid:
        continue
    name = r["uo_lib"].strip()
    aliases = [a.strip() for a in [r["uo_lib_officiel"], r["uo_lib_en"], r["nom_court"], r["sigle"]] if a and a.strip() and a.strip() != name]
    lat = lon = None
    m = re.match(r"\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)", r.get("coordonnees") or "")
    if m:
        lat, lon = float(m.group(1)), float(m.group(2))
    web = site(r["url"]) or site(r["url_en"])
    dom = re.sub(r"^www\.", "", re.sub(r"^https?://", "", web).split("/")[0].lower()) if web else None
    public = r["secteur_d_etablissement"].strip().lower() == "public"
    t = r["type_d_etablissement"].strip()
    legal = r["statut_juridique_long"].strip()
    out.append({
        "country": "FR", "registry": "mesr", "registry_id": pid, "name": name, "aliases": list(dict.fromkeys(aliases))[:11],
        "region": r["reg_nom"].strip() or None, "city": r["com_nom"].strip() or None,
        "address": r["adresse_uai"].strip() or None, "postal_code": r["code_postal_uai"].strip() or None, "latitude": lat, "longitude": lon,
        "local_type": f"{LABEL.get(t, t)}, {'public' if public else 'private'}" + (f"; {legal}" if legal else ""),
        "type": KIND.get(t, "other"), "control": "public" if public else "other",
        "highest_award": None, "status": "active",
        "recognition": "Listed by the French Ministry of Higher Education and Research (MESR) as a principal higher education institution" + (f", UAI {r['uai'].strip()}" if r["uai"].strip() else ""),
        "website": web, "domain": dom,
        "admissions_url": None, "financial_aid_url": None, "application_url": None, "net_price_url": None,
        "issues": [],
    })

json.dump(out, open(sys.argv[2], "w"), separators=(",", ":"))
print(len(out), "rows", dict(Counter(x["type"] for x in out)), "public:", sum(1 for x in out if x["control"] == "public"), "with website:", sum(1 for x in out if x["website"]))
