import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePause } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { Wordmark } from "@/components/wordmark";
import { Suspense } from "react";
import { TopNav, TabBar, UserMenu } from "./nav";
import { ChatDock } from "@/components/chat/chat-dock";
import { PageInk } from "@/components/landing/page-ink";
import { NotificationBell } from "@/components/notifications/bell";
import { UserJot } from "@/components/support/userjot";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { admin } from "@/lib/supabase/admin";

// the signed-in app is private: keep it out of search results
export const metadata = { robots: { index: false, follow: false } };

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
  // notifications arrive with their migration; before it, the bell just shows none
  const noticeQ = await sb.from("notifications").select("id", { count: "exact", head: true }).is("resolved_at", null).is("read_at", null);
  const notices = noticeQ.error ? 0 : (noticeQ.count ?? 0);
  const paused = !!cords?.length;
  // where they are decides how they pay: recorded once, from the first signed-in visit (Vercel's country header)
  const country = (await headers()).get("x-vercel-ip-country");
  if (country) {
    const { data: bc, error: bcErr } = await admin().from("profiles").select("billing_country").eq("id", user.id).maybeSingle();
    if (!bcErr && bc && !bc.billing_country) await admin().from("profiles").update({ billing_country: country.toUpperCase() }).eq("id", user.id);
  }
  const name = loadProfile(prof?.profile).identity.full_name ?? "";
  const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);
  // signed with the UserJot project secret so feedback is tied to this account without a second sign-in
  const ujSecret = process.env.USERJOT_SECRET;
  const ujSignature = ujSecret ? createHmac("sha256", ujSecret).update(user.id).digest("hex") : null;

  return (
    <div className="relative min-h-dvh">
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-4 sm:px-6 lg:px-8">
          <Wordmark href="/dashboard" small />
          <TopNav needsYou={needsYou} unread={unread} />
          <div className="ml-auto flex items-center gap-2">
            {paused ? (
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-md border border-stop/25 px-2.5 py-1 text-xs font-medium text-stop">
                <CirclePause className="size-3.5" aria-hidden />
                Paused
              </Link>
            ) : null}
            <NotificationBell initialUnread={notices} />
            <UserMenu name={name} email={user.email ?? ""} paused={paused} needsYou={needsYou} />
          </div>
        </div>
      </header>
      <PageInk />
      <main className="relative z-10 mx-auto max-w-[1320px] px-4 pb-32 pt-7 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">{children}</main>
      <TabBar needsYou={needsYou} unread={unread} />
      <UserJot user={{ id: user.id, email: user.email ?? "", firstName, lastName: rest.join(" ") || undefined, signature: ujSignature }} />
      <Suspense>
        <ChatDock />
      </Suspense>
    </div>
  );
}
