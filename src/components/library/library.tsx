import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

// shared pieces of the public library (guides and scholarship profiles). pages stay static so they load fast
// and every crawler sees the full text.

export function LibraryShell({ crumbs, children }: { crumbs: [string, string][]; children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <BreadcrumbJsonLd items={[["Ivyward", "/"], ...crumbs]} />
      <SiteHeader signedIn={false} />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Crumbs({ items }: { items: [string, string][] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13.5px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-foreground">
            Ivyward
          </Link>
        </li>
        {items.map(([name, href], i) => (
          <li key={href} className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-foreground/80">
                {name}
              </span>
            ) : (
              <Link href={href} className="hover:text-foreground">
                {name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ShortAnswer({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6" style={{ borderLeft: "4px solid var(--brand)" }}>
      <p className="font-serif text-[19px] leading-snug">The short answer</p>
      <div className="mt-2 text-[16px] leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

export function Cta({ title, body, href = "/login?mode=signup", label = "Start free" }: { title: string; body: string; href?: string; label?: string }) {
  return (
    <aside className="my-12 rounded-2xl bg-ink p-6 text-on-ink sm:p-8">
      <p className="font-serif text-[24px] leading-snug">{title}</p>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed opacity-80">{body}</p>
      <ButtonLink href={href} size="lg" variant="secondary" className="mt-5">
        {label}
      </ButtonLink>
    </aside>
  );
}

export function Faq({ items }: { items: [string, string][] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="faq-h" className="mt-14">
      <h2 id="faq-h" className="font-serif text-[30px] leading-tight">
        Questions people ask
      </h2>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {items.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="cursor-pointer list-none text-[16.5px] font-medium marker:hidden">
              <span className="flex items-start justify-between gap-4">
                {q}
                <span aria-hidden className="mt-0.5 text-muted transition group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-2.5 text-[15.5px] leading-relaxed text-foreground/85">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Sources({ items }: { items: [string, string][] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="src-h" className="mt-12">
      <h2 id="src-h" className="font-serif text-[22px]">
        Sources
      </h2>
      <ul className="mt-3 space-y-1.5 text-[14.5px]">
        {items.map(([t, u]) => (
          <li key={u}>
            <a href={u} target="_blank" rel="noopener" className="text-brand underline decoration-current/30 underline-offset-4 hover:decoration-current">
              {t}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">Deadlines, amounts and rules change. Always confirm on the official page before you apply.</p>
    </section>
  );
}

export function Related({ items }: { items: { href: string; title: string; kind: string }[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="rel-h" className="mt-14">
      <h2 id="rel-h" className="font-serif text-[22px]">
        Read next
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="group flex h-full flex-col justify-between rounded-xl border border-line bg-surface p-4 transition hover:border-foreground/30">
              <span className="text-[12.5px] text-muted">{r.kind}</span>
              <span className="mt-1 flex items-start justify-between gap-3 text-[15.5px] font-medium leading-snug">
                {r.title}
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function longDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
