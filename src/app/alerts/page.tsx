import type { Metadata } from "next";
import Link from "next/link";
import { AlertSignup } from "@/components/growth/alert-signup";
import { LibraryShell } from "@/components/library/library";
import { closingSoon } from "@/lib/deadline-alerts";

export const metadata: Metadata = {
  title: "Scholarship deadline alerts by email",
  description: "A monthly email listing the major fully funded scholarships (Chevening, Commonwealth, Erasmus Mundus, DAAD, MEXT, GKS and more) that usually close in the next few weeks.",
  alternates: { canonical: "/alerts" },
};

export default async function Alerts({ searchParams }: { searchParams: Promise<{ confirmed?: string; unsubscribed?: string; error?: string }> }) {
  const q = await searchParams;
  const soon = closingSoon();
  return (
    <LibraryShell crumbs={[["Scholarship alerts", "/alerts"]]}>
      <div className="mx-auto max-w-[760px] px-5 pb-20 pt-12 sm:pt-16">
        {q.confirmed && <p className="mb-6 rounded-xl border border-line bg-surface p-4 font-medium" role="status">You&apos;re subscribed. The first alert arrives on the 1st of next month.</p>}
        {q.unsubscribed && <p className="mb-6 rounded-xl border border-line bg-surface p-4 font-medium" role="status">You&apos;re unsubscribed. No more alerts will be sent.</p>}
        {q.error && <p className="mb-6 rounded-xl border border-line bg-surface p-4 font-medium" role="alert">That link didn&apos;t work. Sign up again below.</p>}
        <h1 className="text-[42px] leading-[1.05] sm:text-[56px]">Never miss a scholarship deadline.</h1>
        <p className="mt-5 text-[18px] leading-relaxed text-muted">Once a month, the big fully funded scholarships that usually close in the next few weeks, with links to the official pages.</p>
        <AlertSignup source="alerts-page" />
        {soon.length > 0 && (
          <section>
            <h2 className="font-serif text-[27px]">Usually closing soon</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {soon.map((s) => (
                <li key={s.slug} className="py-3.5">
                  <Link href={`/scholarships/${s.slug}`} className="font-serif text-[19px] hover:text-brand">
                    {s.name}
                  </Link>
                  <p className="mt-0.5 text-[14.5px] text-muted">{s.deadline}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </LibraryShell>
  );
}
