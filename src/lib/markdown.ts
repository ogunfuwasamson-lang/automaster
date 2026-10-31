import { Marked } from "marked";

// renders the library's markdown (our own writing, never user input) to html, giving each "## " heading an id
// so the table of contents and shared links can jump to it.
export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const decode = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export function renderMarkdown(md: string): { html: string; toc: { id: string; text: string }[] } {
  const toc: { id: string; text: string }[] = [];
  const m = new Marked({ gfm: true });
  m.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const plain = decode(text.replace(/<[^>]+>/g, ""));
        const id = slugify(plain);
        if (depth === 2) toc.push({ id, text: plain });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href) && !href.startsWith("https://tryivyward.com");
        return `<a href="${href}"${title ? ` title="${title}"` : ""}${external ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
      },
      table(token) {
        // wide tables scroll inside their own box on phones instead of pushing the page sideways
        const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join("");
        const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`).join("");
        return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  const html = m.parse(md, { async: false }) as string;
  return { html, toc };
}

export function plainText(md: string) {
  return md
    .replace(/\|/g, " ")
    .replace(/[#>*_`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function readMinutes(md: string) {
  return Math.max(2, Math.round(plainText(md).split(" ").length / 220));
}
