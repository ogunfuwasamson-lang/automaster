import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ExternalLink } from "lucide-react";
import { Cta, LibraryShell } from "@/components/library/library";
import { loadShareProgram } from "@/lib/share-data";
import { TEST_SHORT, shareFacts } from "@/lib/share-school";

// the page a friend opens from a shared programme: the facts, the official page, and Ivyward's offer to apply for
// them. public, kept out of search (it repeats the library), and it never shows who shared it.
type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params;
  const p = await loadShareProgram(id);
  if (!p) return { title: "Programme", robots: { index: false } };
  const f = shareFacts(p, new Date().toISOString().slice(0, 10));
  const title = f.program ? `${f.title}: ${f.program}` : f.title;
  const description = [f.deadline && `Next deadline ${f.deadline.when}`, f.tuition && `tuition ${f.tuition}`, f.english].filter(Boolean).join(", ") + ". Checked by Ivyward against the official pages.";
  return { title, description, robots: { index: false, follow: true }, openGraph: { title, description, type: "article" } };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-[13.5px] text-muted">{label}</dt>
      <dd className="text-[15.5px] leading-snug">{children}</dd>
    </div>
  );
}

export default async function SharedProgramme({ params }: P) {
  const { id } = await params;
  const p = await loadShareProgram(id);
  if (!p) notFound();
  const f = shareFacts(p, new Date().toISOString().slice(0, 10));
  // came through a friend's link (middleware keeps the code): you both get one application free
  const invited = !!(await cookies()).get("iv_ref")?.value;
  const path = `/s/${id}`;
  return (
    <LibraryShell crumbs={[["Shared programme", path]]}>
      <div className="mx-auto max-w-[760px] px-5 pb-16 pt-10 sm:pt-14">
        <p className="text-[13.5px] text-muted">A friend thought you&apos;d like this programme</p>
        <h1 className="mt-4 text-[38px] leading-[1.06] sm:text-[52px]">{f.title}</h1>
        {f.program && <p className="mt-3 text-[19px] leading-snug sm:text-[21px]">{f.program}</p>}
        {(f.place || f.length) && <p className="mt-2 text-[15px] text-muted">{[f.place, f.length].filter(Boolean).join(" · ")}</p>}

        <dl className="mt-8 border-t-2 border-ink">
          <Fact label="Next deadline">
            {f.deadline ? (
              <>
                {f.deadline.when}
                {f.deadline.note && <span className="text-muted"> ({f.deadline.note})</span>}
              </>
            ) : (
              <span className="text-muted">Not published yet</span>
            )}
          </Fact>
          {f.later.length > 0 && (
            <Fact label="Later rounds">
              <ul className="space-y-1">
                {f.later.map((d) => (
                  <li key={d.when + d.round}>
                    {d.when}
                    {d.round && <span className="text-muted"> ({d.round})</span>}
                  </li>
                ))}
              </ul>
            </Fact>
          )}
          {f.tuition && <Fact label="Tuition">{f.tuition}, converted to US dollars</Fact>}
          {f.fee && <Fact label="Application fee">{f.fee}</Fact>}
          {f.waiver && <Fact label="Fee waiver">{f.waiver}</Fact>}
          {f.english && <Fact label="English">{f.english}</Fact>}
          {f.tests && <Fact label="GRE / GMAT">{TEST_SHORT[p.test_policy ?? ""] ?? f.tests}</Fact>}
        </dl>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          {f.checked ? `Checked against the school's official pages on ${f.checked}. ` : ""}Deadlines and fees can change, so confirm them on the official page before you apply.
        </p>
        {p.url && (
          <a href={p.url} target="_blank" rel="noopener nofollow" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-brand underline decoration-current/30 underline-offset-4">
            Official programme page <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}

        <Cta
          title="Ivyward AI can apply for you"
          body={`Ivyward's agents find programmes that fit you, draft and fact-check your essays, ask schools to waive the fee and fill in each portal. You review and sign before anything is sent.${invited ? " You came from a friend's link: finish setup and you both get one application free." : ""}`}
          href="/login?mode=signup"
          label="Start free"
        />
      </div>
    </LibraryShell>
  );
}
