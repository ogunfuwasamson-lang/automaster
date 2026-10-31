import { SITE } from "@/lib/site";

// share a library page where applicants actually talk: WhatsApp first (most of our readers), then X, LinkedIn, Telegram
export function ShareRow({ path, title }: { path: string; title: string }) {
  const url = `${SITE.url}${path}?utm_source=share&utm_medium=social`;
  const t = encodeURIComponent(`${title}: ${url}`);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${t}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${t}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  ];
  return (
    <div className="mt-10 flex flex-wrap items-center gap-2 text-[13.5px]">
      <span className="mr-1 text-muted">Know someone applying? Share this:</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener" className="rounded-full border border-line px-3 py-1.5 hover:border-foreground/40">
          {l.label}
        </a>
      ))}
    </div>
  );
}
