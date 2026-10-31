"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bell, X } from "lucide-react";

export interface NoticeItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  action_label: string | null;
  urgent: boolean;
  created_at: string;
  read_at: string | null;
}

function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// the bell in the top bar: everything agents need you to know or do, in one list
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [items, setItems] = useState<NoticeItem[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const load = useCallback(async () => {
    const r = await fetch("/api/notifications").catch(() => null);
    if (!r?.ok) return;
    const { items } = (await r.json()) as { items: NoticeItem[] };
    setItems(items);
    setUnread(items.filter((i) => !i.read_at).length);
  }, []);
  // new notices arrive while the app is open (the shortlist finishing, a school's reply)
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <Popover.Root
      onOpenChange={(o) => {
        if (!o) return;
        load().then(() => {
          fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "read_all" }) }).catch(() => {});
          setUnread(0);
        });
      }}
    >
      <Popover.Trigger className="relative grid size-9 place-items-center rounded-lg text-muted outline-none transition-colors hover:bg-neutral-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus data-[state=open]:bg-neutral-100 dark:hover:bg-neutral-800 dark:data-[state=open]:bg-neutral-800" aria-label={unread ? `${unread} new notifications` : "Notifications"}>
        <Bell className="size-[18px]" aria-hidden />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-semibold tabular text-white ring-2 ring-surface">{unread}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="menu-pop z-50 w-[min(24rem,calc(100vw-24px))] overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-medium">Notifications</p>
            <Popover.Close className="rounded-md p-1 text-muted hover:text-foreground" aria-label="Close">
              <X className="size-4" aria-hidden />
            </Popover.Close>
          </div>
          <div className="max-h-[min(70vh,520px)] overflow-y-auto">
            {items === null ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Nothing needs you. New notices from your agents show up here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <li key={n.id} className="group relative px-4 py-3.5">
                    <div className="flex gap-3">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.urgent ? "bg-signal" : !n.read_at ? "bg-brand" : "bg-transparent"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium leading-snug">{n.title}</p>
                        {n.body && <p className="mt-1 text-[13px] leading-relaxed text-muted">{n.body}</p>}
                        <div className="mt-2 flex items-center gap-3 text-[12px]">
                          {n.href && (
                            <Popover.Close asChild>
                              <Link href={n.href} className="font-medium text-brand hover:underline">
                                {n.action_label ?? "Open"}
                              </Link>
                            </Popover.Close>
                          )}
                          <span className="text-muted">{ago(n.created_at)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setItems((xs) => (xs ?? []).filter((x) => x.id !== n.id));
                          fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "dismiss", id: n.id }) }).catch(() => {});
                        }}
                        className="h-fit rounded-md p-1 text-muted opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Dismiss: ${n.title}`}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
