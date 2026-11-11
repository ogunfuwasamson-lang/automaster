// a tailored CV may reorder, select and reword what the applicant told us. it may not add: every number and every
// organisation in it must already be in their facts. dependency-free, so it can be tested on its own.

export type CvItem = { title: string; org: string; dates: string; bullets: string[] };
export type Cv = { headline: string; sections: { title: string; items: CvItem[] }[] };

const nums = (t: string) => (t.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[,.]$/, "").replace(/,/g, ""));
const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// keep what the facts support; drop a bullet with a number they don't have, and an item whose organisation is unknown
export function groundCv(cv: Cv, facts: string): { cv: Cv; dropped: string[] } {
  const factNums = new Set(nums(facts));
  const factText = words(facts);
  const dropped: string[] = [];
  const okNum = (t: string) => nums(t).every((n) => factNums.has(n) || /^(19|20)\d\d$/.test(n));
  const sections = cv.sections
    .map((s) => ({
      title: s.title,
      items: s.items
        .filter((it) => {
          const org = words(it.org);
          const known = !org || factText.includes(org) || org.split(" ").filter((w) => w.length > 3).some((w) => factText.includes(w));
          if (!known) dropped.push(`${it.title} at ${it.org}`);
          return known;
        })
        .map((it) => ({
          ...it,
          bullets: it.bullets.filter((b) => {
            const ok = okNum(b);
            if (!ok) dropped.push(b);
            return ok;
          }),
        })),
    }))
    .filter((s) => s.items.length);
  return { cv: { headline: okNum(cv.headline) ? cv.headline : "", sections }, dropped };
}

export function cvText(name: string, contact: string, cv: Cv): string {
  const L: string[] = [name, contact, ""];
  if (cv.headline) L.push(cv.headline, "");
  for (const s of cv.sections) {
    L.push(s.title.toUpperCase(), "");
    for (const it of s.items) {
      L.push(`${it.title}${it.org ? `, ${it.org}` : ""}${it.dates ? `  (${it.dates})` : ""}`);
      for (const b of it.bullets) L.push(`  - ${b}`);
      L.push("");
    }
  }
  return L.join("\n");
}
