"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark" | "system";
const KEY = "am-theme";

// runs before paint (inlined in <head>) so the page never flashes the wrong theme
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

function apply(t: Theme) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    let t: Theme = "system";
    try {
      t = (localStorage.getItem(KEY) as Theme) || "system";
    } catch {}
    setTheme(t);
    // follow the device while on "system"
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => {
      let cur: Theme = "system";
      try {
        cur = (localStorage.getItem(KEY) as Theme) || "system";
      } catch {}
      if (cur === "system") apply("system");
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return [
    theme,
    (t: Theme) => {
      setTheme(t);
      try {
        localStorage.setItem(KEY, t);
      } catch {}
      apply(t);
    },
  ];
}

const OPTIONS: [Theme, string, typeof Sun][] = [
  ["light", "Light", Sun],
  ["dark", "Dark", Moon],
  ["system", "Device", Monitor],
];

// a three-way segmented switch: light, dark, or follow the device
export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const [theme, set] = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/70">
      {OPTIONS.map(([k, label, Icon]) => (
        <button
          key={k}
          role="radio"
          aria-checked={theme === k}
          onClick={() => set(k)}
          className={`flex items-center justify-center gap-1.5 rounded-[9px] px-2 py-1.5 text-xs font-semibold transition-all ${
            theme === k ? "bg-surface text-foreground shadow-[0_1px_3px_rgb(15_18_34/0.12)]" : "text-muted hover:text-foreground"
          }`}
        >
          <Icon className="size-3.5" aria-hidden />
          {compact ? <span className="sr-only">{label}</span> : label}
        </button>
      ))}
    </div>
  );
}

// one button that flips between light and dark, for the public pages' headers
export function ThemeButton() {
  const [theme, set] = useTheme();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), [theme]);
  return (
    <button
      onClick={() => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        set(next);
        setDark(next === "dark");
      }}
      className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
