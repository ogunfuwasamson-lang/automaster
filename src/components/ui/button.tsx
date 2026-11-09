import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "accent" | "signal" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-[background-color,box-shadow,border-color,color,opacity] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap";
const variants: Record<Variant, string> = {
  // ink: the default action
  primary: "bg-ink text-on-ink shadow-[0_1px_2px_rgb(9_9_11/0.12)] hover:opacity-90",
  // the one action a page is about: ink, like primary
  accent: "bg-ink text-on-ink shadow-[0_1px_2px_rgb(9_9_11/0.12)] hover:opacity-90",
  // warm: an action that unblocks the applicant's agents
  signal: "bg-signal text-white shadow-[0_1px_2px_rgb(9_9_11/0.12)] hover:opacity-90",
  secondary: "border border-line bg-surface text-foreground shadow-[0_1px_2px_rgb(9_9_11/0.04)] hover:bg-neutral-50 dark:hover:bg-neutral-900",
  ghost: "text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800",
  danger: "border border-stop/30 bg-surface text-stop hover:bg-stop/8",
};
const sizes: Record<Size, string> = {
  sm: "h-8 rounded-md px-3 text-[13px]",
  md: "h-10 rounded-lg px-4 text-sm",
  lg: "h-12 rounded-lg px-6 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ href, variant = "primary", size = "md", className = "", children, external }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; external?: boolean }) {
  if (external) return <a href={href} target="_blank" rel="noreferrer" className={buttonClass(variant, size, className)}>{children}</a>;
  // api routes do things when requested (start a gmail connection, set cookies, redirect to google): a plain link,
  // so next's <Link> never prefetches them as the button scrolls into view
  if (href.startsWith("/api/")) return <a href={href} className={buttonClass(variant, size, className)}>{children}</a>;
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}
