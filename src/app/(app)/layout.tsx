import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

const NAV = [
  { href: "/dashboard", label: "dashboard" },
  { href: "/documents", label: "documents" },
  { href: "/interview", label: "interview" },
  { href: "/profile", label: "profile" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-10 border-b border-neutral-200 bg-[var(--background)]/90 backdrop-blur dark:border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-3 text-sm">
          <span className="mr-3 font-semibold tracking-tight">automaster</span>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-2.5 py-1 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100">
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
