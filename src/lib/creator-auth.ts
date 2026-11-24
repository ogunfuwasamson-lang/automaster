import "server-only";
import { requireUser } from "@/lib/supabase/server";
import { creatorFor, type Creator } from "@/lib/creators";

// the signed-in creator, for the creator api routes: null when not signed in or not an approved creator
export async function activeCreator(): Promise<{ creator: Creator; email: string } | null> {
  const auth = await requireUser();
  if (!auth) return null;
  const creator = await creatorFor(auth.user.id);
  if (!creator || creator.status !== "active") return null;
  return { creator, email: auth.user.email ?? "" };
}
