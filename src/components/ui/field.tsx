import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-foreground placeholder:text-neutral-400 outline-none transition-colors focus:border-focus focus:ring-2 focus:ring-focus/20";

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${control} h-10 ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`${control} py-2.5 leading-relaxed ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: ComponentProps<"select">) {
  return <select className={`${control} h-10 pr-8 ${className}`} {...rest} />;
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
