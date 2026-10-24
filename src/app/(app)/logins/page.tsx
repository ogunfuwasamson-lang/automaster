import Link from "next/link";
import { ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { PageHeader, Empty } from "@/components/ui/page";
import { Tag } from "@/components/ui/chip";
import { SchoolTile } from "@/components/home/app-list";
import { Reveal, CopyText } from "./reveal";
import { AddLogin } from "./add";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portal logins" };

const STATUS: Record<string, [string, "go" | "accent" | "stop" | "plain"]> = {
  verified: ["Signed in by agents", "go"],
  created: ["Saved", "accent"],
  failed: ["Password rejected", "stop"],
};

export default async function Logins() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data: apps } = await auth.sb.from("applications").select("id, portal_url, programs(schools(name))").not("status", "in", "(researching,dropped,withdrawn)").order("target_deadline");
  const appList = ((apps ?? []) as unknown as { id: string; portal_url: string | null; programs: { schools: { name: string } } }[]).map((a) => ({ id: a.id, school: a.programs.schools.name, portal: a.portal_url }));
  const { data: rows } = await admin()
    .from("portal_accounts")
    .select("id, application_id, portal_host, login_email, status, created_at, applications(id, portal_url, programs(name, schools(name)))")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  const list = (rows ?? []) as unknown as {
    id: string;
    application_id: string | null;
    portal_host: string;
    login_email: string;
    status: string;
    created_at: string;
    applications: { id: string; portal_url: string | null; programs: { name: string; schools: { name: string } } } | null;
  }[];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Portal logins"
        description="Every account the agents created on a school's portal, any login a school emailed you, and any you add. The agents sign in with these on their own."
        actions={<AddLogin apps={appList} />}
      />
      {list.length ? (
        <div className="grid gap-3">
          {list.map((l) => {
            const school = l.applications?.programs?.schools?.name ?? l.portal_host;
            const [label, tone] = STATUS[l.status] ?? ["Saved", "plain"];
            const url = l.applications?.portal_url ?? `https://${l.portal_host}`;
            return (
              <div key={l.id} className="grid items-center gap-4 rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <SchoolTile name={school} />
                  <span className="min-w-0">
                    {l.applications ? (
                      <Link href={`/applications/${l.applications.id}`} className="block truncate font-bold tracking-[-0.01em] hover:text-accent">
                        {school}
                      </Link>
                    ) : (
                      <span className="block truncate font-bold">{school}</span>
                    )}
                    <span className="block truncate text-[12.5px] text-muted">{l.portal_host}</span>
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11.5px] font-semibold text-muted">Email or user ID</p>
                  <span className="flex items-center gap-1 rounded-xl border border-line bg-background py-1 pl-3 pr-1">
                    <span className="min-w-0 flex-1 truncate text-[13px]">{l.login_email}</span>
                    <CopyText text={l.login_email} />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11.5px] font-semibold text-muted">Password</p>
                  <Reveal id={l.id} />
                </div>
                <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                  <Tag tone={tone}>{label}</Tag>
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
                    Open portal <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
              </div>
            );
          })}
          <p className="mt-3 flex items-start gap-2 px-1 text-[13px] text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-go" aria-hidden />
            Passwords are encrypted. Changed one on a portal? Your agents will tell you when a saved password stops working.
          </p>
        </div>
      ) : (
        <Empty icon={<KeyRound className="size-5" />} title="No portal logins yet" body="When the agents create your account on a school's portal, or a school emails you a login, it appears here." />
      )}
    </div>
  );
}
