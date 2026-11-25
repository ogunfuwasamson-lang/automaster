import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/page";
import { ConnectChrome } from "./connect";
import { CHROME_STORE_URL, storeLive } from "@/lib/chrome-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Ivyward to Chrome" };

export default async function Page({ searchParams }: { searchParams: Promise<{ then?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { then } = await searchParams;
  let school: string | null = null;
  if (then && /^[0-9a-f-]{36}$/.test(then)) {
    const { data } = await admin().from("applications").select("programs(schools(name))").eq("id", then).eq("user_id", auth.user.id).maybeSingle();
    school = (data?.programs as unknown as { schools: { name: string } } | null)?.schools?.name ?? null;
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add Ivyward to Chrome" description="For application sites that won't let a cloud browser in. Free, about two minutes on a computer." />
      <ConnectChrome then={school && then ? { id: then, school } : null} store={(await storeLive()) ? CHROME_STORE_URL : null} />
    </div>
  );
}
