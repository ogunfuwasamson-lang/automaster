import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { previewMode, previewClient, PREVIEW_USER } from "./preview";

// user-scoped client for server components and route handlers. RLS applies.
export async function serverClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // called from a server component: middleware refreshes the session instead
          }
        },
      },
    },
  );
}

export async function requireUser() {
  if (previewMode()) return { sb: previewClient() as unknown as Awaited<ReturnType<typeof serverClient>>, user: PREVIEW_USER };
  const sb = await serverClient();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return { sb, user: data.user };
}
