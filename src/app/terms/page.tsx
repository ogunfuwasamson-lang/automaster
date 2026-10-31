import { LegalPage, Contact } from "@/components/legal/legal-page";

export const metadata = {
  title: "Terms of use",
  description: "The terms for using Ivyward, the AI agents that prepare and submit university applications you approve.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="25 October 2026">
      <section>
        <p>These terms cover your use of Ivyward. By creating an account, you agree to them.</p>
      </section>
      <section>
        <h2>What Ivyward does</h2>
        <p>
          AI agents help you research programs, draft and check essays, fill in and submit applications, and follow up with schools. You stay responsible for your applications: you review and sign each packet before it&apos;s submitted, and anything that speaks for you waits for your approval unless you choose otherwise in Settings.
        </p>
      </section>
      <section>
        <h2>Your information must be true</h2>
        <p>The agents use only what&apos;s in your profile and documents. You confirm that what you give us is accurate and that the essays you approve are your own account of yourself. Don&apos;t ask the agents to invent facts or submit anything you couldn&apos;t stand behind.</p>
      </section>
      <section>
        <h2>No guarantees about admission</h2>
        <p>Schools make their own decisions. We don&apos;t promise admission, scholarships or fee waivers, and we can&apos;t control portals that change, go down or block automated browsers.</p>
      </section>
      <section>
        <h2>Fees and plans</h2>
        <p>Preparing applications is free. In Africa each submission is paid for just before the agents submit it (the local equivalent of ₦2,500). Elsewhere the first 3 applications are free and Pro is $20 a month for up to 10 submissions a month, renewed monthly until you cancel; it runs to the end of the month you paid for. Payments are processed by Bachs; card details never reach Ivyward. You pay application fees directly to schools; the agents never enter card details.</p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>Use Ivyward only for your own applications. Don&apos;t use it to apply in someone else&apos;s name, to break a school&apos;s rules, or to get around a portal&apos;s security.</p>
      </section>
      <section>
        <h2>Ending your account</h2>
        <p>You can stop using Ivyward at any time and ask us to delete your account. We may suspend accounts that break these terms.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions? <Contact />
        </p>
      </section>
    </LegalPage>
  );
}
