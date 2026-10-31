// dependency-free label helpers (the chrome extension bundles these)

// "(required)", "- optional", a trailing "required" or "*": form markers, not words in the question
// ("McGill is required to report..." keeps its "required")
export function stripMarkers(label: string): string {
  return label
    .replace(/\(\s*(required|optional)\s*\)/gi, " ")
    .replace(/\s[-–—]\s*(required|optional)\s*$/i, "")
    .replace(/^\s*(required|optional)\s*[:*-]?\s+/i, "")
    .replace(/\s+(required|optional)\s*\**\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// a <select> inside its <label> reads "Country of birth Select Ghana Nigeria": keep just the question
// a neighbouring dropdown's options run into a label ("Start date * Month Jan Feb Mar ... Dec"): cut the run
const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";
export function stripOptionRuns(label: string): string {
  return label
    .replace(new RegExp(`\\b(month\\s+)?((${MONTHS})\\b[\\s,/]*){4,}(\\w{1,3}\\s*$)?`, "gi"), " ")
    .replace(/\b(day|year)?\s*(\b\d{1,4}\b[\s,/]*){6,}/gi, " ")
    .replace(/\b(month|day|year|select|choose)\b(\s+\b(month|day|year|select|choose)\b)*\s*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanLabel(label: string, options: string[] = []): string {
  let l = stripOptionRuns(stripMarkers(label.replace(/\s+/g, " ")));
  const tails = [...options, "select", "select one", "choose", "choose one", "please select", "-- select --"].map((o) => o.trim().toLowerCase()).filter(Boolean).sort((a, b) => b.length - a.length);
  for (let guard = 0; guard < 60; guard++) {
    const low = l.toLowerCase();
    const t = tails.find((o) => low.endsWith(` ${o}`) && low.length > o.length + 3);
    if (!t) break;
    l = l.slice(0, l.length - t.length).trim();
  }
  return l.replace(/\s*[*:]+\s*$/, "").trim();
}

