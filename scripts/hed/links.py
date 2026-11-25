"""print the spreadsheet links on a downloaded page, made absolute against the page's own address.
Usage: python3 -I links.py page.html https://the.page/url
"""
import re, sys, urllib.parse

html = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
for href in dict.fromkeys(re.findall(r"""href\s*=\s*["']([^"']+\.(?:xlsx?|XLSX?|csv))["']""", html)):
    print(urllib.parse.urljoin(sys.argv[2], href))
