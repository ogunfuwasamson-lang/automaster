import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "accent" | "signal" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-[background-color,box-shadow,transform,border-color,color] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap";
const variants: Record<Variant, string> = {
  // ink: the default action
  primary: "bg-ink text-on-ink shadow-[0_8px_20px_-6px_rgb(15_18_34/0.35)] hover:shadow-[0_12px_26px_-8px_rgb(15_18_34/0.45)] hover:-translate-y-px",
  // gradient: the one action a page is about
  accent: "bg-[linear-gradient(135deg,#4f46e5,#7c3aed_60%,#06b6d4)] text-white shadow-[0_10px_24px_-8px_rgb(79_70_229/0.6)] hover:-translate-y-px hover:shadow-[0_14px_30px_-8px_rgb(79_70_229/0.7)]",
  // warm: an action that unblocks the applicant's agents
  signal: "bg-signal text-white shadow-[0_8px_20px_-8px_rgb(234_88_12/0.6)] hover:-translate-y-px",
  secondary: "border border-line bg-surface text-foreground shadow-[0_1px_2px_rgb(15_18_34/0.04)] hover:border-neutral-300 dark:hover:border-neutral-700",
  ghost: "text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800",
  danger: "border border-stop/30 bg-surface text-stop hover:bg-stop/8",
};
const sizes: Record<Size, string> = {
  sm: "h-8 rounded-[10px] px-3 text-[13px]",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-12 rounded-[14px] px-6 text-[15px]",
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
