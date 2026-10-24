"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

// a number that counts up once when it scrolls into view
export function Count({ value, className = "", pad = 0 }: { value: number; className?: string; pad?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!seen || reduce) return setN(value);
    const c = animate(0, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [seen, value, reduce]);
  return (
    <span ref={ref} className={`tabular ${className}`}>
      {String(n).padStart(pad, "0")}
    </span>
  );
}

// a progress bar that fills from empty just after it mounts
export function Bar({ value, className = "", tone = "accent" }: { value: number; className?: string; tone?: "accent" | "go" | "signal" }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const fill = tone === "go" ? "bg-go" : tone === "signal" ? "bg-signal" : "bg-bar-gradient";
  return (
    <span className={`block h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span className={`block h-full rounded-full ${fill} transition-[width] duration-1000 ease-[cubic-bezier(.16,1,.3,1)]`} style={{ width: on ? `${Math.max(0, Math.min(1, value)) * 100}%` : "0%" }} />
    </span>
  );
}
