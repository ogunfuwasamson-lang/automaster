import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeButton } from "@/components/theme";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { L } from "@/content/i18n/labels";
import type { Lang } from "@/content/i18n/types";

// the French and Spanish library: same look as the English pages, with its own header and footer in that language.
export function LocalShell({ lang, crumbs, english, children }: { lang: Lang; crumbs: [string, string][]; english?: string; children: ReactNode }) {
  const t = L[lang];
  return (
    <div lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="relative min-h-dvh overflow-x-clip">
      {/* the root layout is English; correct the document language for screen readers and translation prompts */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(lang)}` }} />
      <BreadcrumbJsonLd items={[["Ivyward", "/"], ...crumbs]} />
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Wordmark href={t.home} />
          <nav aria-label={t.library} className="hidden items-center gap-1 text-sm text-muted md:flex">
            <Link href={t.home} className="px-3 py-2 hover:text-foreground">
              {t.library}
            </Link>
            <Link href={`${t.home}#pays`} className="px-3 py-2 hover:text-foreground">
              {t.countries}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href={english ?? "/"} hrefLang="en" className="px-2 text-sm text-muted hover:text-foreground">
              {t.english}
            </Link>
            <ThemeButton />
            <ButtonLink href="/login?mode=signup" size="sm">
              {t.start}
            </ButtonLink>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-muted">
          <Wordmark small href={t.home} />
          <p className="mt-3 max-w-xl leading-relaxed">{t.footer}</p>
          <p className="mt-4 flex flex-wrap gap-4">
            <Link href="/fr" hrefLang="fr" className="hover:text-foreground">
              Français
            </Link>
            <Link href="/es" hrefLang="es" className="hover:text-foreground">
              Español
            </Link>
            <Link href="/pt" hrefLang="pt" className="hover:text-foreground">
              Português
            </Link>
            <Link href="/ar" hrefLang="ar" className="hover:text-foreground">
              العربية
            </Link>
            <Link href="/guides" hrefLang="en" className="hover:text-foreground">
              English
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

export function LocalCrumbs({ items }: { items: [string, string][] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13.5px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map(([name, href], i) => (
          <li key={href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
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

export function LocalAnswer({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6" style={{ borderInlineStart: "4px solid var(--brand)" }}>
      <p className="font-serif text-[19px] leading-snug">{L[lang].shortAnswer}</p>
      <div className="mt-2 text-[16px] leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

export function LocalCta({ lang, title, body }: { lang: Lang; title?: string; body?: string }) {
  const t = L[lang];
  return (
    <aside className="my-12 rounded-2xl bg-ink p-6 text-on-ink sm:p-8">
      <p className="font-serif text-[24px] leading-snug">{title ?? t.ctaTitle}</p>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed opacity-80">{body ?? t.ctaBody}</p>
      <ButtonLink href="/login?mode=signup" size="lg" variant="secondary" className="mt-5">
        {t.start}
      </ButtonLink>
    </aside>
  );
}

export function LocalFaq({ lang, items }: { lang: Lang; items: [string, string][] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="faq-h" className="mt-14">
      <h2 id="faq-h" className="font-serif text-[30px] leading-tight">
        {L[lang].faq}
      </h2>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {items.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="cursor-pointer list-none text-[16.5px] font-medium">
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

export function LocalSources({ lang, items }: { lang: Lang; items: [string, string][] }) {
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <h2 className="font-serif text-[22px]">{L[lang].sources}</h2>
      <ul className="mt-3 space-y-1.5 text-[14.5px]">
        {items.map(([t, u]) => (
          <li key={u}>
            <a href={u} target="_blank" rel="noopener" className="text-brand underline decoration-current/30 underline-offset-4">
              {t}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">{L[lang].sourcesNote}</p>
    </section>
  );
}

export function LocalRelated({ lang, items }: { lang: Lang; items: { href: string; title: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-14">
      <h2 className="font-serif text-[22px]">{L[lang].readNext}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="block h-full rounded-xl border border-line bg-surface p-4 text-[15.5px] font-medium leading-snug transition hover:border-foreground/30">
              {r.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
