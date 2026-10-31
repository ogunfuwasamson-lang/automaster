"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { House, Send, ListChecks, Mail, UserRound, FolderOpen, Settings, LogOut, CirclePause, ChevronDown, KeyRound, MessageSquareText, Sparkles } from "lucide-react";
import { ThemeSwitch } from "@/components/theme";
import { openFeedback } from "@/components/support/userjot";

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
    <nav aria-label="Main" className="hidden h-16 items-stretch gap-1 lg:flex">
      {ITEMS.map(({ href, label }) => {
        const on = isOn(path, href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`relative flex items-center px-3 text-sm transition-colors ${on ? "text-foreground" : "text-muted hover:text-foreground"}`}>
            {on && <motion.span layoutId="nav-line" className="absolute inset-x-3 -bottom-px h-[2px] bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative flex items-center gap-2">
              {label}
              {href === "/dashboard" && needsYou > 0 ? (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-signal px-1 text-[10.5px] font-semibold tabular text-white" aria-label={`${needsYou} need you`}>
                  {needsYou}
                </span>
              ) : null}
              {href === "/messages" && unread > 0 ? (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10.5px] font-semibold tabular text-white dark:text-neutral-950" aria-label={`${unread} unread`}>
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
    ["/logins", "Portal logins", "Accounts agents made for you", KeyRound, "border border-line text-muted"],
    ["/documents", "Documents", "CV, transcripts, certificates", FolderOpen, "border border-line text-muted"],
    ["/settings", "Settings", "Gmail, autonomy, fees", Settings, "border border-line text-muted"],
  ];
  return (
    <Menu.Root>
      <Menu.Trigger className="group flex items-center gap-2 rounded-lg p-1 pr-2 outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-focus data-[state=open]:bg-neutral-100 dark:hover:bg-neutral-800 dark:data-[state=open]:bg-neutral-800" aria-label="Account menu">
        <span className="relative grid size-8 place-items-center rounded-full bg-hero-gradient text-[12px] font-semibold text-white">
          {initials}
          {paused && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-stop ring-2 ring-surface" aria-hidden />}
        </span>
        <ChevronDown className="hidden size-4 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={10} className="menu-pop z-50 w-[19rem] overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
          <div className="relative overflow-hidden px-4 pb-4 pt-4">
            <span className="relative grid size-11 place-items-center rounded-full bg-hero-gradient text-[15px] font-semibold text-white">{initials}</span>
            <p className="relative mt-2.5 truncate font-serif text-[19px]">{name || "Your account"}</p>
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
                <Link href={href} className="flex items-center gap-3 rounded-lg px-2.5 py-2 outline-none transition-colors data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium">{label}</span>
                    <span className="block truncate text-[11.5px] text-muted">{hint}</span>
                  </span>
                </Link>
              </Menu.Item>
            ))}
          </div>
          <div className="border-t border-line p-1.5">
            {(
              [
                ["feedback", "Feedback and support", "Report a problem or suggest something", MessageSquareText],
                ["updates", "What's new", "Roadmap and product updates", Sparkles],
              ] as const
            ).map(([section, label, hint, Icon]) => (
              <Menu.Item key={section} onSelect={() => openFeedback(section)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 outline-none transition-colors data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">{label}</span>
                  <span className="block truncate text-[11.5px] text-muted">{hint}</span>
                </span>
              </Menu.Item>
            ))}
          </div>
          <div className="border-t border-line px-3.5 py-3">
            <p className="mb-2 text-[11.5px] font-bold text-muted">Appearance</p>
            <ThemeSwitch />
          </div>
          <div className="border-t border-line p-1.5">
            {/* the menu unmounts its items when one is picked, which would cancel a form submit; sign out directly */}
            <Menu.Item
              onSelect={(e) => {
                e.preventDefault();
                fetch("/auth/signout", { method: "POST", redirect: "manual" }).finally(() => window.location.assign("/"));
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-stop outline-none data-[highlighted]:bg-stop/8"
            >
              <span className="grid size-8 place-items-center rounded-lg border border-stop/20">
                <LogOut className="size-4" aria-hidden />
              </span>
              Sign out
            </Menu.Item>
          </div>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

// mobile: a tab bar docked to the bottom edge
export function TabBar({ needsYou, unread = 0 }: { needsYou: number; unread?: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-5 px-1.5 py-1">
        {ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => {
          const on = isOn(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors ${on ? "text-foreground" : "text-muted"}`}>
                {on && <motion.span layoutId="tab-line" className="absolute inset-x-6 top-0 h-[2px] bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon className="relative size-5" aria-hidden />
                <span className="relative">{label}</span>
                {href === "/dashboard" && needsYou > 0 ? <span className="absolute right-[calc(50%-16px)] top-1.5 size-2 rounded-full bg-signal ring-2 ring-surface" aria-hidden /> : null}
                {href === "/messages" && unread > 0 ? <span className="absolute right-[calc(50%-16px)] top-1.5 size-2 rounded-full bg-brand ring-2 ring-surface" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
