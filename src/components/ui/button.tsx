import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "signal" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap";
const variants: Record<Variant, string> = {
  // ink on paper: the default action
  primary: "bg-foreground text-background hover:bg-neutral-700 dark:hover:bg-neutral-200",
  // amber: an action that unblocks the applicant's agents
  signal: "bg-signal text-neutral-950 hover:brightness-95",
  secondary: "border border-line bg-surface text-foreground hover:border-neutral-400",
  ghost: "text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800",
  danger: "border border-stop/40 text-stop hover:bg-stop/10",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ href, variant = "primary", size = "md", className = "", children, external }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; external?: boolean }) {
  if (external) return <a href={href} target="_blank" rel="noreferrer" className={buttonClass(variant, size, className)}>{children}</a>;
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}
