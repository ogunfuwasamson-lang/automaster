import Link from "next/link";

// the mark: a college gate (an arch between two towers) in oxblood, beside a serif wordmark
export function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`text-brand ${className}`} fill="none" aria-hidden>
      <path d="M5 28V11l3-4 3 4v17M21 28V11l3-4 3 4v17" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M11 28V19a5 5 0 0 1 10 0v9" stroke="currentColor" strokeWidth="2.2" />
      <path d="M3 28h26" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 14h10" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

export function Wordmark({ small = false, href = "/" }: { small?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="automaster home">
      <Mark className={small ? "size-[22px]" : "size-6"} />
      <span className={`font-serif tracking-[-0.02em] ${small ? "text-[20px]" : "text-[22px]"}`}>automaster</span>
    </Link>
  );
}
