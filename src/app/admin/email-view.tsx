import { AUDIENCES, history } from "@/lib/broadcast";
import { TEMPLATES } from "@/lib/broadcast-templates";
import { Broadcast } from "./broadcast";

// emails to many applicants: the composer, and what went out before
export async function EmailView() {
  const past = await history(15);
  return (
    <div className="space-y-8">
      <Broadcast audiences={AUDIENCES.map((a) => ({ ...a }))} templates={TEMPLATES} />
      <section>
        <h2 className="font-serif text-[20px]">Sent before</h2>
        {past.length ? (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {past.map((p) => (
              <li key={p.at} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-[13.5px]">
                <span className="min-w-0 flex-1 truncate font-medium">{p.subject}</span>
                <span className="text-muted">
                  {p.audience} · {p.sent} sent{p.failed ? `, ${p.failed} failed` : ""} · {new Date(p.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13.5px] text-muted">Nothing sent to a group yet.</p>
        )}
      </section>
    </div>
  );
}
