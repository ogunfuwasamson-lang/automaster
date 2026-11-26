import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePause, Coins } from "lucide-react";
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
import { balance } from "@/lib/wallet";
import { CREDITS } from "@/lib/credit-prices";
import { SETUP, countryFrom, needsWhatsApp } from "@/lib/setup-steps";

// the signed-in app is private: keep it out of search results
export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { sb, user } = auth;
  // WhatsApp is required in setup for accounts made since 26 nov 2026 (founder's call): until their number is
  // linked, the app sends them back to that step. a number that later replied STOP stays linked; where WhatsApp is
  // blocked (lib/setup-steps) it's optional
  if (needsWhatsApp(user.created_at, false, countryFrom(await headers()))) {
    const { data: wa } = await admin().from("whatsapp_contacts").select("linked_at").eq("user_id", user.id).maybeSingle();
    if (!wa?.linked_at) redirect(`/onboarding?step=${SETUP.whatsapp}`);
  }
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
  // the credit balance beside the bell (lib/wallet); it opens the credits page
  const credits = await balance(user.id).catch(() => null);
  const low = credits !== null && credits < CREDITS.application;
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
            {credits !== null ? (
              <Link
                href="/credits"
                aria-label={`${credits} credit${credits === 1 ? "" : "s"}. Open credits`}
                title={low ? `Not enough for an application (${CREDITS.application} credits). Get more` : "Your credits"}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${low ? "bg-signal/10 text-signal hover:bg-signal/15" : "text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"}`}
              >
                <Coins className="size-[17px]" aria-hidden />
                <span className={`font-semibold tabular ${low ? "" : "text-foreground"}`}>{credits}</span>
                <span className="hidden sm:inline">credit{credits === 1 ? "" : "s"}</span>
              </Link>
            ) : null}
            <NotificationBell initialUnread={notices} />
            <UserMenu name={name} email={user.email ?? ""} paused={paused} needsYou={needsYou} />
          </div>
        </div>
      </header>
      <PageInk />
      <main id="main" tabIndex={-1} className="relative z-10 mx-auto max-w-[1320px] px-4 pb-32 pt-7 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">{children}</main>
      <TabBar needsYou={needsYou} unread={unread} />
      <UserJot user={{ id: user.id, email: user.email ?? "", firstName, lastName: rest.join(" ") || undefined, signature: ujSignature }} />
      <Suspense>
        <ChatDock />
      </Suspense>
    </div>
  );
}
