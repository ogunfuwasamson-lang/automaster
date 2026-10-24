import Link from "next/link";

// the mark: a departures tile with a rising track
export function Wordmark({ small = false, href = "/" }: { small?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="automaster home">
      <svg viewBox="0 0 28 28" className={small ? "size-6" : "size-7"} aria-hidden>
        <rect x="0.5" y="0.5" width="27" height="27" rx="6.5" fill="var(--board)" stroke="rgba(255,255,255,0.18)" />
        <rect x="4" y="13.5" width="20" height="1" fill="#000" opacity="0.5" />
        <path d="M7 19.5 L13 13 L16.5 16 L21.5 9" fill="none" stroke="var(--signal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`font-display font-bold tracking-tight ${small ? "text-lg" : "text-[22px]"}`}>automaster</span>
    </Link>
  );
}
