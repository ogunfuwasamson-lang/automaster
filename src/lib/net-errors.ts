// what a portal's server said when it refused a save. pages often hide it ("didn't accept this page" with nothing on
// screen) while the reply carries the reason: {"errors":[{"field":"phone","message":"Invalid format"}]}.
// dependency-free: used by the cloud runner and the chrome extension.

const MSG_KEYS = ["message", "error_description", "errorMessage", "detail", "title", "error", "msg", "reason", "description"];

function fromJson(j: unknown, out: string[], depth = 0) {
  if (depth > 4 || out.length >= 4 || j == null) return;
  if (typeof j === "string") {
    if (j.length > 2 && j.length < 300 && /[a-z]/i.test(j)) out.push(j);
    return;
  }
  if (Array.isArray(j)) {
    for (const x of j.slice(0, 6)) fromJson(x, out, depth + 1);
    return;
  }
  if (typeof j === "object") {
    const o = j as Record<string, unknown>;
    const field = ["field", "fieldName", "property", "path", "name", "param"].map((k) => o[k]).find((v) => typeof v === "string") as string | undefined;
    for (const k of MSG_KEYS) {
      const v = o[k];
      if (typeof v === "string" && v.trim() && v.length < 300) {
        out.push(field && !v.toLowerCase().includes(field.toLowerCase()) ? `${field}: ${v.trim()}` : v.trim());
        return;
      }
    }
    for (const k of ["errors", "fieldErrors", "validationErrors", "details", "data", "error"]) if (o[k] && typeof o[k] === "object") fromJson(o[k], out, depth + 1);
    // {"phone": ["is invalid"]} (rails, django)
    if (!out.length) for (const [k, v] of Object.entries(o).slice(0, 8)) if (Array.isArray(v) && typeof v[0] === "string") out.push(`${k}: ${v[0]}`);
  }
}

// one line from a refused reply, or null when it says nothing useful (a bare 500 page, a login redirect)
export function netError(status: number, body: string, contentType = ""): string | null {
  if (status < 400 || status === 401 || status === 403 || status === 404 || status === 429) return null;
  const t = body.trim();
  const out: string[] = [];
  if (/json/i.test(contentType) || /^[[{]/.test(t)) {
    try {
      fromJson(JSON.parse(t), out);
    } catch {
      /* not json after all */
    }
  }
  if (!out.length && /html|text/i.test(contentType)) {
    const text = t
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // a short plain refusal; a full error page is noise
    if (text && text.length < 240 && !/<html/i.test(t.slice(0, 200))) out.push(text);
  }
  const line = [...new Set(out.map((x) => x.replace(/\s+/g, " ").trim()))].filter((x) => !/^(error|bad request|unprocessable entity|internal server error)$/i.test(x)).slice(0, 3).join("; ");
  return line ? line.slice(0, 240) : null;
}
