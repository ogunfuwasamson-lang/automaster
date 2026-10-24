"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlaneTakeoff, Send, ListChecks, MessagesSquare, UserRound, FileText, Settings, LogOut } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: PlaneTakeoff, mobile: true },
  { href: "/applications", label: "Applications", icon: Send, mobile: true },
  { href: "/shortlist", label: "Shortlist", icon: ListChecks, mobile: true },
  { href: "/interview", label: "Interview", icon: MessagesSquare, mobile: true },
  { href: "/profile", label: "Profile", icon: UserRound, mobile: true },
  { href: "/documents", label: "Documents", icon: FileText, mobile: false },
  { href: "/settings", label: "Settings", icon: Settings, mobile: false },
];

export function RailNav({ needsYou }: { needsYou: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const on = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors ${on ? "bg-foreground font-medium text-background" : "text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"}`}
          >
            <Icon className="size-[18px]" aria-hidden />
            <span className="flex-1">{label}</span>
            {href === "/dashboard" && needsYou > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1.5 text-[11px] font-semibold text-neutral-950 tabular" aria-label={`${needsYou} need you`}>{needsYou}</span>
            ) : null}
          </Link>
        );
      })}
      <form action="/auth/signout" method="post" className="mt-2">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800">
          <LogOut className="size-[18px]" aria-hidden />
          Sign out
        </button>
      </form>
    </nav>
  );
}

export function TabBar({ needsYou }: { needsYou: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => {
          const on = path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] ${on ? "font-semibold text-foreground" : "text-muted"}`}>
                <Icon className="size-5" aria-hidden />
                {label}
                {href === "/dashboard" && needsYou > 0 ? <span className="absolute right-[calc(50%-18px)] top-1.5 size-2 rounded-full bg-signal" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
