import type { Metadata } from "next";
import { LibraryShell } from "@/components/library/library";
import { AmbassadorForm } from "./form";

export const metadata: Metadata = {
  title: "Become an Ivyward ambassador",
  description: "Help students in your university, school or community apply abroad with Ivyward. Everyone who joins through your link gets a free submission, and you earn free submissions as they apply.",
  alternates: { canonical: "/ambassadors" },
};

const WHO = [
  ["Student leaders", "Class reps, association presidents and society leads with classmates heading for master's degrees."],
  ["Scholarship communities", "Admins of WhatsApp, Telegram and Facebook groups that share scholarships and admissions news."],
  ["Creators", "People who post about studying abroad on TikTok, YouTube, Instagram, X or LinkedIn."],
  ["Mentors and career offices", "Alumni mentors, career advisers and education NGOs who help students apply."],
];

export default function Ambassadors() {
  return (
    <LibraryShell crumbs={[["Ambassadors", "/ambassadors"]]}>
      <div className="mx-auto max-w-[820px] px-5 pb-20 pt-12 sm:pt-16">
        <h1 className="text-[42px] leading-[1.05] sm:text-[58px]">Bring your people with you.</h1>
        <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-muted">
          Ivyward ambassadors help students in their university, school or community apply abroad. Everyone who joins through your link gets a free submission, and each time one of them submits their first application, you get one too.
        </p>
        <section className="mt-12">
          <h2 className="font-serif text-[28px]">Who it&apos;s for</h2>
          <dl className="mt-4 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {WHO.map(([t, d]) => (
              <div key={t} className="border-l border-line pl-4">
                <dt className="font-medium">{t}</dt>
                <dd className="mt-1 text-[14.5px] leading-relaxed text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="mt-12">
          <h2 className="font-serif text-[28px]">What you get</h2>
          <ul className="prose-iv mt-3">
            <li>Your own invite link, with a much higher limit on the free submissions you can earn than regular members</li>
            <li>Ready-to-post material: guides, the scholarship finder and the monthly deadline list</li>
            <li>A free embed of the scholarship finder for your group&apos;s website or blog</li>
            <li>Early access to new features, and a direct line to the team for your community&apos;s questions</li>
          </ul>
        </section>
        <section className="mt-12">
          <h2 className="mb-4 font-serif text-[28px]">Apply</h2>
          <AmbassadorForm />
        </section>
      </div>
    </LibraryShell>
  );
}
