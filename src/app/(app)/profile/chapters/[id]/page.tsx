import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { loadProfile } from "@/lib/profile";
import { CHAPTERS, type Level } from "@/lib/profile-chapters";
import type { PortalDetails } from "@/lib/portal-fields";
import { QuestionDeck } from "@/components/profile/question-deck";

export const dynamic = "force-dynamic";
export const metadata = { title: "Application profile" };

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapter = CHAPTERS.find((c) => c.id === id);
  if (!chapter) notFound();
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await admin().from("profiles").select("portal_details, profile").eq("id", auth.user.id).single();
  const level = (loadProfile(data?.profile).goals.study_level as Level | null) ?? null;
  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-5">
      <Link href="/profile?tab=chapters" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        All chapters
      </Link>
      <div className="mt-4">
        <QuestionDeck initial={(data?.portal_details as PortalDetails) ?? {}} level={level} chapterId={chapter.id} />
      </div>
    </div>
  );
}
