"""Ministry of Education national list of regular higher education institutions (China) -> hed_institutions rows.

Scope (China): every regular higher education institution (普通高等学校) on the Ministry of Education's national list
(published 18 June 2026; Hong Kong, Macao and Taiwan not included), read from the ministry's own lookup at
hudong.moe.gov.cn/qggxmd/. One record per institution code (学校标识码). The list gives the Chinese name, supervising
authority, province and level (本科 undergraduate and above, 专科 vocational). English names and websites come from
Wikidata, matched on the exact Chinese name, and are marked as such.
Usage: python3 -I cn_moe.py RAW_DIR out.json   (reads RAW_DIR/cn-moe-pages.html and RAW_DIR/cn-wikidata.csv)
"""
import csv, html, json, os, re, sys
from collections import Counter, defaultdict

PROV = {"北京市": "Beijing", "天津市": "Tianjin", "河北省": "Hebei", "山西省": "Shanxi", "内蒙古自治区": "Inner Mongolia", "辽宁省": "Liaoning", "吉林省": "Jilin",
        "黑龙江省": "Heilongjiang", "上海市": "Shanghai", "江苏省": "Jiangsu", "浙江省": "Zhejiang", "安徽省": "Anhui", "福建省": "Fujian", "江西省": "Jiangxi",
        "山东省": "Shandong", "河南省": "Henan", "湖北省": "Hubei", "湖南省": "Hunan", "广东省": "Guangdong", "广西壮族自治区": "Guangxi", "海南省": "Hainan",
        "重庆市": "Chongqing", "四川省": "Sichuan", "贵州省": "Guizhou", "云南省": "Yunnan", "西藏自治区": "Tibet", "陕西省": "Shaanxi", "甘肃省": "Gansu",
        "青海省": "Qinghai", "宁夏回族自治区": "Ningxia", "新疆维吾尔自治区": "Xinjiang"}

raw = open(os.path.join(sys.argv[1], "cn-moe-pages.html"), encoding="utf-8", errors="ignore").read()
recs = []
for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", raw, re.S):
    cells = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
    if len(cells) >= 7 and re.fullmatch(r"\d{10}", cells[2]):
        recs.append(cells[:7])

wd = defaultdict(dict)
for r in csv.DictReader(open(os.path.join(sys.argv[1], "cn-wikidata.csv"), encoding="utf-8")):
    e = wd[r["zh"]].setdefault(r["item"], {"en": set(), "site": set()})
    if r["en"]:
        e["en"].add(r["en"])
    if r["site"]:
        e["site"].add(r["site"])

out, seen = [], set()
for _, name, code, dept, loc, level, note in recs:
    if code in seen:
        continue
    seen.add(code)
    hit = wd.get(name)
    en = site = None
    issues = []
    if hit and len(hit) == 1:
        e = next(iter(hit.values()))
        en = sorted(e["en"], key=len)[0] if e["en"] else None
        site = sorted(e["site"], key=lambda s: (not s.startswith("https"), "english" in s, len(s)))[0] if e["site"] else None
        if en:
            issues.append("English name from Wikidata (not in the Ministry of Education list)")
        if site:
            issues.append("website from Wikidata (not in the Ministry of Education list)")
    private = "民办" in note
    sino = "合作办学" in note or "中外合作" in note
    undergrad = level.startswith("本科")
    dom = re.sub(r"^www\.", "", re.sub(r"^https?://", "", site).split("/")[0].lower()) if site else None
    out.append({
        "country": "CN", "registry": "moe_cn", "registry_id": code, "name": en or name, "aliases": [name] if en else [],
        "region": PROV.get(loc, loc) or None, "city": None,
        "address": None, "postal_code": None, "latitude": None, "longitude": None,
        "local_type": f"{'Private (民办)' if private else 'Public'} regular higher education institution; {'undergraduate and above (本科)' if undergrad else 'vocational, three-year diplomas (专科)'}; supervised by {dept}" + ("; Sino-foreign cooperative" if sino else "") + (f"; note: {note}" if note and not private and not sino else ""),
        "type": "university" if re.search(r"大学", name) else "college" if undergrad else "vocational", "control": "other" if private else "public",
        "highest_award": "Bachelor's degree" if undergrad else "Associate degree (zhuanke diploma)", "status": "active",
        "recognition": f"On the Ministry of Education's national list of regular higher education institutions (18 June 2026), code {code}",
        "website": site, "domain": dom,
        "admissions_url": None, "financial_aid_url": None, "application_url": None, "net_price_url": None,
        "issues": issues,
    })

json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "rows", dict(Counter(x["highest_award"] for x in out)), "public:", sum(1 for x in out if x["control"] == "public"), "English name:", sum(1 for x in out if x["aliases"]), "website:", sum(1 for x in out if x["website"]))
