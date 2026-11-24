import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { admin } from "@/lib/supabase/admin";
import { dayKey } from "@/lib/creator-terms";
import { overviewOf } from "@/lib/creators";
import { Apply, Declined, Overview, Waiting } from "./home";
import { me } from "./me";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creator studio" };

// the creator studio's home: the application (before approval), then the month at a glance, the links, where
// sign-ups drop off, and the videos
export default async function CreatorHome() {
  const who = await me();
  if (!who) redirect("/login?next=/creator");
  if (!who.ready)
    return (
      <div className="mx-auto max-w-xl space-y-3 py-10 text-center">
        <h1 className="font-serif text-[34px] leading-tight">The creator partnership opens soon</h1>
        <p className="text-[15px] leading-relaxed text-muted">Applications open here in the next few days. Come back to this page to apply.</p>
      </div>
    );
  const c = who.creator;
  if (!c) {
    const { data: p } = await admin().from("profiles").select("profile").eq("id", who.user.id).maybeSingle();
    return <Apply name={loadProfile(p?.profile).identity.full_name ?? ""} />;
  }
  if (c.status === "pending") return <Waiting c={c} />;
  if (c.status === "rejected") return <Declined c={c} />;
  const now = new Date();
  return <Overview c={c} o={await overviewOf(c, now)} today={dayKey(now)} />;
}

