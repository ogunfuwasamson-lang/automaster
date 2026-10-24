import { requireUser } from "@/lib/supabase/server";
import { loadProfile, completeness } from "@/lib/profile";
import { Interview } from "./interview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Interview" };

export default async function InterviewPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const [{ data: last }, { data: prof }] = await Promise.all([
    auth.sb.from("interview_turns").select("session_id").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    auth.sb.from("profiles").select("profile").single(),
  ]);
  let turns: { role: "agent" | "user"; content: string }[] = [];
  if (last?.session_id) {
    const { data } = await auth.sb
      .from("interview_turns")
      .select("role, content")
      .eq("session_id", last.session_id)
      .order("created_at");
    turns = (data ?? []) as typeof turns;
  }
  return (
    <Interview
      initialSessionId={last?.session_id ?? null}
      initialTurns={turns}
      initialCompleteness={completeness(loadProfile(prof?.profile))}
    />
  );
}
