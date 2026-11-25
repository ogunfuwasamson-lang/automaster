import Link from "next/link";
import { ThemeButton } from "@/components/theme";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { CHANNELS, SITE } from "@/lib/site";
import { CHROME_STORE_URL } from "@/lib/chrome-store";
import { FEATURES } from "@/lib/features";

// the public site's header and footer, shared by the landing and pricing pages
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm text-muted md:flex">
          <Link href="/#how" className="px-3 py-2 hover:text-foreground">
            How it works
          </Link>
          <Link href="/pricing" className="px-3 py-2 hover:text-foreground">
            Pricing
          </Link>
          <Link href="/guides" className="px-3 py-2 hover:text-foreground">
            Guides
          </Link>
          <Link href="/scholarships" className="px-3 py-2 hover:text-foreground">
            Scholarships
          </Link>
          <Link href="/universities" className="hidden px-3 py-2 hover:text-foreground lg:inline">
            Universities
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeButton />
          {signedIn ? (
            <ButtonLink href="/dashboard" size="sm">
              Open Ivyward
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" size="sm" variant="secondary" className="hidden sm:inline-flex">
                Sign in
              </ButtonLink>
              <ButtonLink href="/login?mode=signup" size="sm">
                Start free
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const link = "block text-muted hover:text-foreground";

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="space-y-2.5">
      <p className="font-medium">{title}</p>
      {children}
    </nav>
  );
}

// the footer: the brand on its own row, then six short columns
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-14 text-sm">
        <div className="flex flex-col gap-4 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Wordmark small />
            <p className="mt-3 max-w-sm leading-relaxed text-muted">{SITE.short}</p>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1.5 text-muted">
            <a href={CHANNELS.whatsapp} target="_blank" rel="noopener me" className="hover:text-foreground">WhatsApp</a>
            <a href={CHANNELS.linkedin} target="_blank" rel="noopener me" className="hover:text-foreground">LinkedIn</a>
            <a href={CHANNELS.facebook} target="_blank" rel="noopener me" className="hover:text-foreground">Facebook</a>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 pt-10 md:grid-cols-3 lg:grid-cols-6">
          <Col title="Product">
            <Link href="/#how" className={link}>How it works</Link>
            <Link href="/#compare" className={link}>Ivyward vs. a consultant</Link>
            <Link href="/pricing" className={link}>Pricing</Link>
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener" className={link}>Add to Chrome</a>
            <Link href="/#faq" className={link}>Questions</Link>
            <a href="https://ivyward.userjot.com" target="_blank" rel="noreferrer" className={link}>Feedback and support</a>
            <a href="https://ivyward.userjot.com/roadmap" target="_blank" rel="noreferrer" className={link}>Roadmap</a>
          </Col>
          <Col title="Features">
            {FEATURES.map((f) => (
              <Link key={f.slug} href={`/features/${f.slug}`} className={link}>
                {f.nav}
              </Link>
            ))}
          </Col>
          <Col title="Find programmes">
            <Link href="/match" className={link}>Programme matcher</Link>
            <Link href="/programmes" className={link}>Programmes by country</Link>
            <Link href="/study-abroad" className={link}>By home country</Link>
            <Link href="/universities" className={link}>How to apply, by university</Link>
            <Link href="/schools" className={link}>School directory (US and UK)</Link>
            <Link href="/deadlines" className={link}>Deadlines by month</Link>
          </Col>
          <Col title="Scholarships">
            <Link href="/scholarships" className={link}>All scholarships</Link>
            <Link href="/tools/scholarship-finder" className={link}>Scholarship finder</Link>
            <Link href="/scholarships/deadlines" className={link}>Scholarship deadlines</Link>
            <Link href="/alerts" className={link}>Deadline alerts</Link>
            <a href={CHANNELS.whatsapp} target="_blank" rel="noopener" className={link}>5 scholarships a day on WhatsApp</a>
          </Col>
          <Col title="Guides">
            <Link href="/guides" className={link}>All guides</Link>
            <Link href="/guides/how-to-get-application-fee-waivers" className={link}>Application fee waivers</Link>
            <Link href="/guides/fully-funded-masters-scholarships-international-students" className={link}>Fully funded master&apos;s</Link>
            <Link href="/guides/fully-funded-phd-how-funding-works" className={link}>Funded PhDs</Link>
            <Link href="/guides/application-deadlines-2027-intake" className={link}>2027 deadlines</Link>
            <Link href="/glossary" className={link}>Glossary</Link>
          </Col>
          <Col title="Company">
            <Link href="/about" className={link}>About Ivyward</Link>
            <Link href="/ambassadors" className={link}>Become an ambassador</Link>
            <Link href="/creator" prefetch={false} className={link}>Creator partnership</Link>
            <Link href="/login" className={link}>Sign in</Link>
            <Link href="/privacy" className={link}>Privacy</Link>
            <Link href="/terms" className={link}>Terms</Link>
          </Col>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-muted">
          <p>Application fees are paid to schools directly. Agents ask for waivers first.</p>
          <p className="flex gap-3">
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
          </p>
        </div>
      </div>
    </footer>
  );
}
