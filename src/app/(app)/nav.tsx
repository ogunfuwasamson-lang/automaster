"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { House, Send, ListChecks, MessagesSquare, UserRound, FolderOpen, Settings, LogOut, CirclePause, ChevronDown } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: House, mobile: true },
  { href: "/applications", label: "Applications", icon: Send, mobile: true },
  { href: "/shortlist", label: "Shortlist", icon: ListChecks, mobile: true },
  { href: "/interview", label: "Interview", icon: MessagesSquare, mobile: true },
  { href: "/documents", label: "Documents", icon: FolderOpen, mobile: false },
  { href: "/profile", label: "Profile", icon: UserRound, mobile: true },
];
const isOn = (path: string, href: string) => path === href || path.startsWith(href + "/");

// desktop: pill nav with a sliding ink indicator
export function TopNav({ needsYou }: { needsYou: number }) {
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
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function UserMenu({ name, email, paused }: { name: string; email: string; paused: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || email[0]?.toUpperCase() || "A";
  return (
    <Menu.Root>
      <Menu.Trigger className="group flex items-center gap-2 rounded-xl p-1 pr-2 outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-focus dark:hover:bg-neutral-800" aria-label="Account menu">
        <span className="grid size-9 place-items-center rounded-[11px] bg-[linear-gradient(135deg,#fdba74,#f472b6)] text-[13px] font-bold text-white">{initials}</span>
        <ChevronDown className="hidden size-4 text-muted transition-transform group-data-[state=open]:rotate-180 sm:block" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={8} className="z-50 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-lift data-[state=open]:animate-in">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-bold">{name || "Your account"}</p>
            <p className="truncate text-xs text-muted">{email}</p>
            {paused && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-stop/10 px-2.5 py-1 text-xs font-bold text-stop">
                <CirclePause className="size-3.5" aria-hidden /> Agents paused
              </p>
            )}
          </div>
          <Menu.Separator className="my-1 h-px bg-line" />
          {[
            ["/documents", "Documents", FolderOpen],
            ["/settings", "Settings", Settings],
          ].map(([href, label, Icon]) => {
            const I = Icon as typeof Settings;
            return (
              <Menu.Item key={href as string} asChild>
                <Link href={href as string} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800">
                  <I className="size-4 text-muted" aria-hidden />
                  {label as string}
                </Link>
              </Menu.Item>
            );
          })}
          <Menu.Separator className="my-1 h-px bg-line" />
          <form action="/auth/signout" method="post">
            <Menu.Item asChild>
              <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800">
                <LogOut className="size-4 text-muted" aria-hidden />
                Sign out
              </button>
            </Menu.Item>
          </form>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

// mobile: a floating glass tab bar
export function TabBar({ needsYou }: { needsYou: number }) {
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
