import { LegalPage, Contact } from "@/components/legal/legal-page";
import { CREATOR_TERMS_VERSION, CreatorTermsBody } from "@/components/legal/creator-terms";

export const metadata = {
  title: "Creator Partnership terms",
  description: "The terms for Ivyward's Creator Partnership: how sign-ups are tracked and counted, what creators are paid, payouts, and the content rules.",
  alternates: { canonical: "/creator-terms" },
};

// the creator partnership's terms, public so anyone can read them before applying (app/creator links here)
export default function CreatorTerms() {
  return (
    <LegalPage title="Creator Partnership terms" updated={CREATOR_TERMS_VERSION}>
      <CreatorTermsBody />
      <section>
        <h2>20. Contact</h2>
        <p>
          Questions about these terms or your payouts? <Contact />
        </p>
      </section>
    </LegalPage>
  );
}
