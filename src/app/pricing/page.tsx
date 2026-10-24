import Link from "next/link";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "pricing · automaster" };

export default function Pricing() {
  const plans = [PLANS.free, PLANS.pro, PLANS.season];
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">pricing</h1>
      <p className="mt-2 max-w-2xl text-neutral-500">
        bachelor&apos;s, master&apos;s and PhD applications, anywhere in the world. agents research programs, draft and
        fact-check your essays, and chase funding. you review and approve everything.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <section key={p.id} className={`flex flex-col rounded-lg border p-6 ${p.id === "pro" ? "border-neutral-900 dark:border-neutral-100" : "border-neutral-200 dark:border-neutral-800"}`}>
            <h2 className="text-lg font-medium">{p.name}</h2>
            <p className="mt-1 text-2xl font-semibold">{p.priceLabel}</p>
            <p className="mt-1 text-sm text-neutral-500">{p.blurb}</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-neutral-400">—</span>{f}</li>)}
            </ul>
            <Link
              href="/login"
              className={`mt-6 rounded-md px-3 py-2 text-center text-sm ${p.id === "pro" ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "border border-neutral-300 dark:border-neutral-700"}`}
            >
              {p.id === "free" ? "start free" : `get ${p.name}`}
            </Link>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-neutral-500">
        no application fees are included: schools charge those directly, and the agents ask for fee waivers first.
        AI usage on every plan has a monthly cap, so your bill never surprises you.
      </p>
    </main>
  );
}
