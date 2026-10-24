import type { ComponentProps, ReactNode } from "react";

// a toggle pill for picking from a set (regions, degrees, fields)
export function chipClass(on: boolean, size: "sm" | "md" = "sm") {
  return `rounded-full border font-semibold transition-all duration-200 ${size === "md" ? "px-4 py-2 text-sm" : "px-3.5 py-1.5 text-[13px]"} ${
    on
      ? "border-transparent bg-accent/10 text-accent ring-1 ring-accent/30"
      : "border-line bg-surface text-muted hover:border-neutral-300 hover:text-foreground dark:hover:border-neutral-700"
  }`;
}

export function Chip({ on, size = "sm", className = "", ...rest }: ComponentProps<"button"> & { on: boolean; size?: "sm" | "md" }) {
  return <button type="button" aria-pressed={on} className={`${chipClass(on, size)} ${className}`} {...rest} />;
}

// a quiet fact label: "No test", "Fee $90"
export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "go" | "stop" | "signal" | "accent" }) {
  const t = {
    plain: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    go: "bg-go/10 text-go",
    stop: "bg-stop/10 text-stop",
    signal: "bg-signal/10 text-signal",
    accent: "bg-accent/10 text-accent",
  }[tone];
  return <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${t}`}>{children}</span>;
}
