import Link from "next/link";

export default function Home() {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <main className="mx-auto max-w-2xl px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">automaster</h1>
      <p className="mt-3 text-neutral-500">
        upload your docs once. agents build the shortlist, write the drafts, chase the funding, and prep every
        submission. you review, they run.
      </p>
      {configured ? (
        <Link href="/dashboard" className="mt-8 inline-block rounded-md bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900">
          open dashboard
        </Link>
      ) : (
        <p className="mt-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          not configured yet. set the env vars from <code>.env.example</code> and run the migrations. see README.
        </p>
      )}
    </main>
  );
}
