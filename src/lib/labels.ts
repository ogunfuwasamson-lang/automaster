// dependency-free label helpers (the chrome extension bundles these)

// a <select> inside its <label> reads "Country of birth Select Ghana Nigeria": keep just the question
export function cleanLabel(label: string, options: string[] = []): string {
  let l = label.replace(/\s+/g, " ").replace(/\(?(required|optional)\)?/gi, "").trim();
  const tails = [...options, "select", "select one", "choose", "choose one", "please select", "-- select --"].map((o) => o.trim().toLowerCase()).filter(Boolean).sort((a, b) => b.length - a.length);
  for (let guard = 0; guard < 60; guard++) {
    const low = l.toLowerCase();
    const t = tails.find((o) => low.endsWith(` ${o}`) && low.length > o.length + 3);
    if (!t) break;
    l = l.slice(0, l.length - t.length).trim();
  }
  return l.replace(/\s*[*:]+\s*$/, "").trim();
}

