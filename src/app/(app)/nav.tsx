"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { House, Send, ListChecks, Mail, UserRound, FolderOpen, Settings, LogOut, CirclePause, ChevronDown, KeyRound } from "lucide-react";
import { ThemeSwitch } from "@/components/theme";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: House, mobile: true },
  { href: "/applications", label: "Applications", icon: Send, mobile: true },
  { href: "/shortlist", label: "Shortlist", icon: ListChecks, mobile: true },
  { href: "/messages", label: "Messages", icon: Mail, mobile: true },
  { href: "/documents", label: "Documents", icon: FolderOpen, mobile: false },
  { href: "/profile", label: "Profile", icon: UserRound, mobile: true },
];
const isOn = (path: string, href: string) => path === href || path.startsWith(href + "/");

// desktop: pill nav with a sliding ink indicator
export function TopNav({ needsYou, unread = 0 }: { needsYou: number; unread?: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
      {ITEMS.map(({ href, label }) => {
        const on = isOn(path, href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`relative rounded-xl px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${on ? "text-on-ink" : "text-muted hover:text-foreground"}`}>
            {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative flex items-center gap-2">
              {label}
              {href === "/dashboard" && needsYou > 0 ? (
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular ${on ? "bg-signal text-white" : "bg-signal/12 text-signal"}`} aria-label={`${needsYou} need you`}>
                  {needsYou}
                </span>
              ) : null}
              {href === "/messages" && unread > 0 ? (
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular ${on ? "bg-accent-2 text-white" : "bg-accent/12 text-accent"}`} aria-label={`${unread} unread`}>
                  {unread}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function UserMenu({ name, email, paused, needsYou = 0 }: { name: string; email: string; paused: boolean; needsYou?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || email[0]?.toUpperCase() || "A";
  const items: [string, string, string, typeof Settings, string][] = [
    ["/logins", "Portal logins", "Accounts agents made for you", KeyRound, "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300"],
    ["/documents", "Documents", "CV, transcripts, certificates", FolderOpen, "text-cyan-700 bg-cyan-50 dark:bg-cyan-500/15 dark:text-cyan-300"],
    ["/settings", "Settings", "Gmail, autonomy, fees", Settings, "text-violet-600 bg-violet-50 dark:bg-violet-500/15 dark:text-violet-300"],
  ];
  return (
    <Menu.Root>
      <Menu.Trigger className="group flex items-center gap-2 rounded-2xl p-1 pr-2 outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-focus data-[state=open]:bg-neutral-100 dark:hover:bg-neutral-800 dark:data-[state=open]:bg-neutral-800" aria-label="Account menu">
        <span className="relative grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#6366f1,#a855f7_55%,#ec4899)] text-[13px] font-bold text-white shadow-[0_6px_14px_-6px_rgb(168_85_247/0.7)]">
          {initials}
          {paused && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-stop ring-2 ring-surface" aria-hidden />}
        </span>
        <ChevronDown className="hidden size-4 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={10} className="menu-pop z-50 w-[19rem] overflow-hidden rounded-[22px] border border-line bg-surface shadow-lift">
          <div className="relative overflow-hidden px-4 pb-4 pt-4">
            <span className="bg-hero-gradient pointer-events-none absolute inset-x-0 top-0 h-16 opacity-90" aria-hidden />
            <span className="relative mt-5 grid size-14 place-items-center rounded-2xl border-4 border-surface bg-[linear-gradient(135deg,#6366f1,#a855f7_55%,#ec4899)] text-lg font-bold text-white shadow-card">{initials}</span>
            <p className="relative mt-2 truncate text-[15px] font-bold tracking-[-0.01em]">{name || "Your account"}</p>
            <p className="relative truncate text-xs text-muted">{email}</p>
            <div className="relative mt-2.5 flex flex-wrap gap-1.5">
              {paused ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stop/10 px-2.5 py-1 text-[11px] font-bold text-stop">
                  <CirclePause className="size-3.5" aria-hidden /> Agents paused
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-go/10 px-2.5 py-1 text-[11px] font-bold text-go">
                  <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden /> Agents working
                </span>
              )}
              {needsYou > 0 && <span className="rounded-full bg-signal/10 px-2.5 py-1 text-[11px] font-bold text-signal">{needsYou} need you</span>}
            </div>
          </div>
          <div className="border-t border-line p-1.5">
            {items.map(([href, label, hint, Icon, tone]) => (
              <Menu.Item key={href} asChild>
                <Link href={href} className="flex items-center gap-3 rounded-2xl px-2.5 py-2 outline-none transition-colors data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold">{label}</span>
                    <span className="block truncate text-[11.5px] text-muted">{hint}</span>
                  </span>
                </Link>
              </Menu.Item>
            ))}
          </div>
          <div className="border-t border-line px-3.5 py-3">
            <p className="mb-2 text-[11.5px] font-bold text-muted">Appearance</p>
            <ThemeSwitch />
          </div>
          <div className="border-t border-line p-1.5">
            <form action="/auth/signout" method="post">
              <Menu.Item asChild>
                <button className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-[13.5px] font-bold text-stop outline-none data-[highlighted]:bg-stop/8">
                  <span className="grid size-9 place-items-center rounded-xl bg-stop/10">
                    <LogOut className="size-4" aria-hidden />
                  </span>
                  Sign out
                </button>
              </Menu.Item>
            </form>
          </div>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

// mobile: a floating glass tab bar
export function TabBar({ needsYou, unread = 0 }: { needsYou: number; unread?: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-30 lg:hidden">
      <ul className="glass grid grid-cols-5 rounded-[22px] border border-line p-1.5 shadow-lift">
        {ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => {
          const on = isOn(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] font-semibold transition-colors ${on ? "text-on-ink" : "text-muted"}`}>
                {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-2xl bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon className="relative size-5" aria-hidden />
                <span className="relative">{label}</span>
                {href === "/dashboard" && needsYou > 0 ? <span className="absolute right-[calc(50%-16px)] top-1.5 size-2 rounded-full bg-signal ring-2 ring-surface" aria-hidden /> : null}
                {href === "/messages" && unread > 0 ? <span className="absolute right-[calc(50%-16px)] top-1.5 size-2 rounded-full bg-accent ring-2 ring-surface" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
