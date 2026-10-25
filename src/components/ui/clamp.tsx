"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// long text stays short until asked: a fixed height with a soft fade, and "show more" only when it overflows
export function Clamp({ children, lines = 4, className = "", more = "Show more", less = "Show less" }: { children: ReactNode; lines?: number; className?: string; more?: string; less?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOver(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);
  return (
    <div className={className}>
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={open ? undefined : { maxHeight: `${lines * 1.6}em`, maskImage: over ? "linear-gradient(to bottom, #000 55%, transparent)" : undefined }}
      >
        {children}
      </div>
      {(over || open) && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand hover:underline">
          {open ? less : more}
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      )}
    </div>
  );
}

// a list that shows its first few items and folds the rest
export function ShowList<T>({ items, first = 3, render, label = "items" }: { items: T[]; first?: number; render: (x: T, i: number) => ReactNode; label?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, first);
  return (
    <>
      {shown.map(render)}
      {items.length > first && (
        <li className="list-none">
          <button type="button" onClick={() => setAll(!all)} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-brand hover:underline">
            {all ? "Show fewer" : `Show all ${items.length} ${label}`}
            <ChevronDown className={`size-3.5 transition-transform ${all ? "rotate-180" : ""}`} aria-hidden />
          </button>
        </li>
      )}
    </>
  );
}
