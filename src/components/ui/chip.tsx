import type { ComponentProps, ReactNode } from "react";

// a toggle pill for picking from a set (regions, degrees, fields)
export function chipClass(on: boolean, size: "sm" | "md" = "sm") {
  return `rounded-full border transition-colors ${size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-[13px]"} ${
    on ? "border-foreground bg-foreground text-background" : "border-line bg-surface text-foreground hover:border-neutral-400"
  }`;
}

export function Chip({ on, size = "sm", className = "", ...rest }: ComponentProps<"button"> & { on: boolean; size?: "sm" | "md" }) {
  return <button type="button" aria-pressed={on} className={`${chipClass(on, size)} ${className}`} {...rest} />;
}

// a quiet fact label: "No test", "Fee $90"
export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "go" | "stop" | "signal" }) {
  const t = {
    plain: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    go: "bg-go/10 text-go",
    stop: "bg-stop/10 text-stop",
    signal: "bg-signal/20 text-foreground",
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}
