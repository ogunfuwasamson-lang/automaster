import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { ReportBody, type WeeklyReport } from "@/components/home/weekly-report";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly report" };

export default async function Report({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { id } = await params;
  const { data } = await auth.sb.from("digests").select("id, content").eq("id", id).maybeSingle();
  if (!data || (data.content as { kind?: string }).kind !== "weekly") notFound();
  return (
    <div className="mx-auto max-w-[880px] space-y-4">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Weekly reports
      </Link>
      <div className="overflow-hidden rounded-2xl border border-line bg-background shadow-card">
        <ReportBody id={data.id} r={data.content as WeeklyReport} />
      </div>
    </div>
  );
}
