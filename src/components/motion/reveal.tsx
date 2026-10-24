import type { ReactNode } from "react";

// one orchestrated entrance per page, in CSS: children rise in a beat apart. no delays and no fill-mode, so if
// the animation never runs (old device, background tab, no javascript) the content is simply there.
export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`stagger ${className}`}>{children}</div>;
}

export function Rise({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rise ${className}`}>{children}</div>;
}
