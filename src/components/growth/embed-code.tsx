"use client";
import { useState } from "react";
import { SITE } from "@/lib/site";

// blogs, student groups and school career pages can put the scholarship finder on their own site
const CODE = `<iframe src="${SITE.url}/embed/scholarship-finder" title="Scholarship finder by Ivyward" width="100%" height="720" style="border:1px solid #e4e4e7;border-radius:12px" loading="lazy"></iframe>
<p style="font:13px sans-serif">Scholarship finder by <a href="${SITE.url}/?utm_source=embed">Ivyward</a></p>`;

export function EmbedCode() {
  const [copied, setCopied] = useState(false);
  return (
    <section className="mt-12 rounded-2xl border border-line bg-surface p-6" aria-labelledby="embed-h">
      <h2 id="embed-h" className="font-serif text-[22px]">
        Put this finder on your website
      </h2>
      <p className="mt-1.5 text-[14.5px] text-muted">Free for blogs, student associations and career offices. Paste this where you want it to appear.</p>
      <textarea readOnly value={CODE} rows={4} aria-label="Embed code" className="mt-3 w-full rounded-xl border border-line bg-background p-3 font-mono text-[12.5px]" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(CODE).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="mt-2 h-10 rounded-xl bg-ink px-4 text-[14px] font-medium text-on-ink"
      >
        {copied ? "Copied" : "Copy embed code"}
      </button>
    </section>
  );
}
