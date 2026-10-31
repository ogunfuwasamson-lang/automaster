import { LegalPage, Contact } from "@/components/legal/legal-page";

export const metadata = {
  title: "Privacy policy",
  description: "What Ivyward keeps, how the agents use it, how Gmail is connected through Composio, and the controls you have over your data.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="25 October 2026">
      <section>
        <p>Ivyward runs university applications for you with AI agents. This page explains what we collect, why, and what control you have. We don&apos;t sell your data, and we don&apos;t use it to advertise to you.</p>
      </section>
      <section>
        <h2>What we keep</h2>
        <ul>
          <li>Your account: your email address and sign-in records.</li>
          <li>Your profile: what you tell Ivyward AI, what we read from documents you upload (CV, transcripts, certificates), and answers you give to portal questions.</li>
          <li>Your applications: shortlisted programs, essays and drafts, the packets you approve and sign, and a log of everything the agents do for you.</li>
          <li>Portal logins the agents create for you, encrypted at rest. You can see them under Portal logins.</li>
          <li>Emails between you and schools, when you connect Gmail.</li>
        </ul>
      </section>
      <section>
        <h2>Gmail</h2>
        <p>
          If you connect Gmail, the agents use it to send emails you&apos;ve approved and to read messages from schools and application portals (replies, verification codes, logins a portal emails you). We keep only the messages that relate to your applications. We don&apos;t read unrelated mail for any other purpose, and Google user data is never used to train AI models or for advertising. You can disconnect Gmail in Settings at any time, which revokes our access.
        </p>
        <p>
          We connect to Gmail through Composio, an integration service. When you connect, Google asks you to allow Composio, which holds the Gmail access on Ivyward&apos;s behalf and passes our requests to Google. Messages the agents read or send pass through Composio to reach us. Composio acts only on Ivyward&apos;s instructions for your account and doesn&apos;t use your mail for anything else. Disconnecting Gmail in Settings removes that connection.
        </p>
      </section>
      <section>
        <h2>How the agents use your data</h2>
        <p>Your profile, documents and messages are sent to our AI provider (Anthropic) to research programs, draft essays, fill application forms and read school replies. The provider processes this data to answer our requests and does not use it to train its models.</p>
        <p>
          When the agents submit an application, they enter your answers on the school&apos;s own portal. When you open the live browser, screenshots of the portal are stored briefly to show them to you and deleted when the session ends. What you type there goes to the portal and isn&apos;t kept. The Chrome extension, if you install it, acts only on application portals and on Ivyward itself.
        </p>
      </section>
      <section>
        <h2>What we never take</h2>
        <ul>
          <li>Card or bank details: you pay application fees on the school&apos;s site yourself.</li>
          <li>Government ID numbers: the agents never fill passport or national ID fields.</li>
        </ul>
      </section>
      <section>
        <h2>Where it&apos;s stored</h2>
        <p>Data is stored with our hosting and database providers (Vercel and Supabase) and is encrypted in transit. Our email providers handle only the messages they carry: Resend sends Ivyward&apos;s own emails, and Composio carries the Gmail connection. Portal passwords are additionally encrypted with our own keys.</p>
      </section>
      <section>
        <h2>Your control</h2>
        <ul>
          <li>Edit your profile and documents at any time, and delete any document you uploaded.</li>
          <li>Pause every agent at once from your home page.</li>
          <li>Ask us to export or delete your account and everything in it.</li>
        </ul>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about your data? <Contact />
        </p>
      </section>
    </LegalPage>
  );
}
