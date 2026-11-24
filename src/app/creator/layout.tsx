import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { ThemeButton } from "@/components/theme";
import { CreatorNav, SignOut } from "./ui";
import { me } from "./me";

export const metadata = { title: { default: "Creator studio", template: "%s · Ivyward creators" }, robots: { index: false, follow: false } };

// the creator partnership's own space (lib/creators): separate from the student app, with its own header. the tabs
// show once the creator is approved.
export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const who = await me();
  if (!who) redirect("/login?next=/creator");
  const live = who.creator && (who.creator.status === "active" || who.creator.status === "paused");
  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Wordmark href="/creator" small />
            <span className="rounded-md border border-line px-1.5 py-0.5 text-[11.5px] font-semibold text-muted">Creators</span>
          </div>
          {live ? <CreatorNav /> : null}
          <div className="ml-auto flex items-center gap-1">
            <Link href="/dashboard" className="hidden rounded-lg px-2.5 py-2 text-[13px] text-muted hover:bg-neutral-100 hover:text-foreground sm:block dark:hover:bg-neutral-800">
              Student app
            </Link>
            <ThemeButton />
            <SignOut />
          </div>
        </div>
        {live ? (
          <div className="border-t border-line md:hidden">
            <CreatorNav mobile />
          </div>
        ) : null}
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-24 pt-7 sm:px-6 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
