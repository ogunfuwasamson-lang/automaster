import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import { creatorFor, creatorsReady } from "@/lib/creators";

// the signed-in person and their creator account, once per request (the layout and the page both ask)
export const me = cache(async () => {
  const auth = await requireUser();
  if (!auth) return null;
  const [creator, ready] = await Promise.all([creatorFor(auth.user.id), creatorsReady()]);
  return { user: auth.user, creator, ready };
});
