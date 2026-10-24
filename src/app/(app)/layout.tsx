import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePause } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { Wordmark } from "@/components/wordmark";
import { Suspense } from "react";
import { TopNav, TabBar, UserMenu } from "./nav";
import { ChatDock } from "@/components/chat/chat-dock";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { sb, user } = auth;
  const [{ count: approvals }, { count: runner }, { data: cords }, { data: prof }] = await Promise.all([
    sb.from("approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("applications").select("id", { count: "exact", head: true }).in("runner_status", ["needs_you", "failed"]),
    sb.from("ripcords").select("id").eq("active", true).eq("scope_kind", "all").limit(1),
    sb.from("profiles").select("profile").single(),
  ]);
  const needsYou = (approvals ?? 0) + (runner ?? 0);
  const unreadQ = await sb.from("messages").select("id", { count: "exact", head: true }).eq("direction", "in").is("read_at", null);
  const unread = unreadQ.error ? 0 : (unreadQ.count ?? 0);
  const paused = !!cords?.length;
  const name = loadProfile(prof?.profile).identity.full_name ?? "";

  return (
    <div className="relative min-h-dvh">
      <div className="aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="glass mx-auto flex max-w-[1320px] items-center gap-4 rounded-[20px] border border-white/70 px-3 py-2 shadow-card dark:border-white/[0.06] sm:pl-5">
          <Wordmark href="/dashboard" small />
          <div className="mx-auto">
            <TopNav needsYou={needsYou} unread={unread} />
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {paused ? (
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-full bg-stop/10 px-3 py-1.5 text-xs font-bold text-stop">
                <CirclePause className="size-3.5" aria-hidden />
                Paused
              </Link>
            ) : null}
            <UserMenu name={name} email={user.email ?? ""} paused={paused} needsYou={needsYou} />
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-[1320px] px-4 pb-32 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">{children}</main>
      <TabBar needsYou={needsYou} unread={unread} />
      <Suspense>
        <ChatDock />
      </Suspense>
    </div>
  );
}
