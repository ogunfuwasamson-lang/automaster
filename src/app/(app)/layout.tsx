import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, CirclePause } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wordmark";
import { RailNav, TabBar } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { sb, user } = auth;
  const [{ count: approvals }, { count: runner }, { data: cords }] = await Promise.all([
    sb.from("approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("applications").select("id", { count: "exact", head: true }).in("runner_status", ["needs_you", "failed"]),
    sb.from("ripcords").select("id").eq("active", true).eq("scope_kind", "all").limit(1),
  ]);
  const needsYou = (approvals ?? 0) + (runner ?? 0);
  const paused = !!cords?.length;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line px-4 py-6 lg:flex">
        <div className="px-2">
          <Wordmark href="/dashboard" />
        </div>
        <RailNav needsYou={needsYou} />
        <div className="mt-auto space-y-3 px-2 text-xs text-muted">
          {paused ? (
            <Link href="/dashboard" className="flex items-center gap-2 rounded-lg bg-stop/10 px-3 py-2 font-medium text-stop">
              <CirclePause className="size-4" aria-hidden /> Agents paused
            </Link>
          ) : null}
          <p className="truncate" title={user.email ?? ""}>{user.email}</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Wordmark href="/dashboard" small />
          <div className="flex items-center gap-1">
            {paused ? <span className="rounded-full bg-stop/10 px-2.5 py-1 text-xs font-medium text-stop">Paused</span> : null}
            <Link href="/documents" className="rounded-lg px-2.5 py-2 text-sm text-muted">Documents</Link>
            <Link href="/settings" aria-label="Settings" className="rounded-lg p-2 text-muted"><Settings className="size-5" /></Link>
          </div>
        </header>
        <div className="px-4 pb-28 pt-6 sm:px-8 lg:pb-16 lg:pt-10">{children}</div>
      </div>
      <TabBar needsYou={needsYou} />
    </div>
  );
}
