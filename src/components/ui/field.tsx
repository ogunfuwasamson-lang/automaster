import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-foreground placeholder:text-neutral-400 shadow-[0_1px_2px_rgb(9_9_11/0.03)] outline-none transition-[border-color,box-shadow] focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/5 dark:focus:border-neutral-500 dark:focus:ring-white/5";

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${control} h-11 ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`${control} py-3 leading-relaxed ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: ComponentProps<"select">) {
  return <select className={`${control} h-11 pr-8 ${className}`} {...rest} />;
}

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      {children}
      {error ? <span className="block text-xs text-stop">{error}</span> : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
