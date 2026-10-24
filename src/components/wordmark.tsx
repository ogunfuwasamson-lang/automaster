import Link from "next/link";

// the mark: a gradient tile with an upward route
export function Wordmark({ small = false, href = "/" }: { small?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="automaster home">
      <span className={`grid place-items-center rounded-[10px] bg-[linear-gradient(135deg,#4f46e5,#06b6d4)] text-white shadow-[0_6px_16px_rgb(79_70_229/0.35)] ${small ? "size-7" : "size-8"}`}>
        <svg viewBox="0 0 24 24" className={small ? "size-4" : "size-[18px]"} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 17 L10.5 11.5 L13.5 14.5 L19 8.5" />
          <path d="M14.5 8.5 H19 V13" />
        </svg>
      </span>
      <span className={`font-bold tracking-[-0.03em] ${small ? "text-[17px]" : "text-lg"}`}>automaster</span>
    </Link>
  );
}
