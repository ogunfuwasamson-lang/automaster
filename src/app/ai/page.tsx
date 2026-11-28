import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/mcp-tools";
import { Contact } from "@/components/legal/legal-page";
import { LibraryShell } from "@/components/library/library";

// public documentation for Ivyward's MCP server (app/mcp, lib/mcp-tools): what the Claude connectors directory and
// the ChatGPT plugin directory link to as "documentation". keep the tool list read from lib/mcp-tools so it can't drift.
export const metadata: Metadata = {
  title: "Ivyward in ChatGPT and Claude: programmes, scholarships and visa steps",
  description: "Add Ivyward to ChatGPT, Claude or any MCP client: checked programmes, scholarships, deadlines, university look-ups and student-visa steps. No sign-in.",
  alternates: { canonical: "/ai" },
};

const SERVER = `${SITE.url}/mcp`;

const PROMPTS = [
  "Find funded master's programmes in data science in Canada.",
  "Which scholarships can a Nigerian apply to for a master's in the UK?",
  "Which big scholarships are open right now?",
  "Look up the University of Toronto.",
  "I got admitted to a UK university. What are the visa steps?",
];

export default function AiPage() {
  return (
    <LibraryShell crumbs={[["Ivyward in ChatGPT and Claude", "/ai"]]}>
      <div className="mx-auto max-w-[760px] px-5 pb-20 pt-12 sm:pt-16">
        <h1 className="text-[40px] leading-[1.05] sm:text-[54px]">Ivyward in ChatGPT, Claude and other AI assistants</h1>
        <p className="mt-6 text-[18px] leading-relaxed">
          Ask your AI assistant about studying abroad and it can look up what Ivyward has checked on official pages: programmes with their next deadline, tuition and funding, scholarships open to your nationality, which big scholarships are open now, universities from six national registers, and the student-visa steps for your destination. Every answer links to the official page.
        </p>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          It works without an account or sign-in, and it only reads. It doesn&apos;t submit applications, ask for personal details or keep your questions.
        </p>

        <section className="mt-12">
          <h2 className="font-serif text-[30px]">Add it to your assistant</h2>
          <div className="prose-iv mt-3">
            <p>
              Server address (MCP, streamable HTTP, no authentication): <code>{SERVER}</code>
            </p>
            <h3>Claude</h3>
            <ol>
              <li>Open Claude&apos;s connector directory and search for Ivyward, then select Connect.</li>
              <li>
                Or add it yourself: Settings → Connectors → Add custom connector. Name it Ivyward, paste <code>{SERVER}</code> and select Add. No sign-in is needed.
              </li>
              <li>In a chat, turn Ivyward on from the tools menu and ask a question.</li>
            </ol>
            <h3>ChatGPT</h3>
            <ol>
              <li>Open the plugin directory in ChatGPT and search for Ivyward, then add it.</li>
              <li>Developers can also connect the server in developer mode: create an app or connector with the address above and no authentication.</li>
            </ol>
            <h3>Other MCP clients</h3>
            <p>Any client that supports remote MCP servers over streamable HTTP can use the same address. The server answers JSON-RPC over POST and keeps no session.</p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-[30px]">What it can look up</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line">
            {TOOLS.map((t) => (
              <div key={t.name} className="py-4">
                <dt className="text-[17px] font-semibold">
                  {t.title} <code className="ml-1 text-[13px] font-normal text-muted">{t.name}</code>
                </dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-muted">{t.description}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[14px] leading-relaxed text-muted">All five tools are read-only: they change nothing, anywhere.</p>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-[30px]">Things to ask</h2>
          <ul className="prose-iv mt-3">
            {PROMPTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-[30px]">Limits</h2>
          <ul className="prose-iv mt-3">
            <li>Programmes come from the list Ivyward&apos;s agents have checked, which grows every week. A field or country with nothing checked yet returns no results rather than a guess.</li>
            <li>Deadlines, fees and visa rules change. Each answer links to the official page: confirm there before you apply or pay.</li>
            <li>University look-ups cover the official registers of the United States, the United Kingdom, Canada, Australia, France and China.</li>
            <li>It can&apos;t apply for you, see your Ivyward account or read anything you haven&apos;t typed into the chat.</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-[30px]">Privacy and support</h2>
          <div className="prose-iv mt-3">
            <p>
              The server receives only the field, level, country, nationality or school name your assistant sends, and saves none of it. Details are in the{" "}
              <Link href="/privacy#ai-assistants">privacy policy</Link>. Use is covered by Ivyward&apos;s <Link href="/terms">terms</Link>.
            </p>
            <p>
              Something wrong or missing? <Contact />
            </p>
          </div>
        </section>
      </div>
    </LibraryShell>
  );
}
