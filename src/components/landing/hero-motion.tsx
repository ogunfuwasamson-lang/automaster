"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// the landing page's one orchestrated moment: the hero rises in
export function HeroIn({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

// a status card that pops in beside the product preview, then floats gently
export function FloatChip({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`glass absolute z-10 items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left shadow-lift ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.9, y: 10 }}
      animate={reduce ? undefined : { opacity: 1, scale: 1, y: [0, -6, 0] }}
      transition={{ opacity: { delay, duration: 0.4 }, scale: { delay, duration: 0.4 }, y: { delay: delay + 0.4, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
    >
      {children}
    </motion.div>
  );
}
