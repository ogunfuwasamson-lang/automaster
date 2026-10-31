import Link from "next/link";
import { ThemeButton } from "@/components/theme";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { SITE } from "@/lib/site";

// the public site's header and footer, shared by the landing and pricing pages
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm text-muted sm:flex">
          <Link href="/#how" className="px-3 py-2 hover:text-foreground">
            How it works
          </Link>
          <Link href="/pricing" className="px-3 py-2 hover:text-foreground">
            Pricing
          </Link>
          <Link href="/#faq" className="px-3 py-2 hover:text-foreground">
            Questions
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

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 text-sm sm:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Wordmark small />
          <p className="mt-3 max-w-xs leading-relaxed text-muted">{SITE.short}</p>
        </div>
        <nav aria-label="Product" className="space-y-2.5">
          <p className="font-medium">Product</p>
          <Link href="/#how" className="block text-muted hover:text-foreground">
            How it works
          </Link>
          <Link href="/#compare" className="block text-muted hover:text-foreground">
            Ivyward vs. a consultant
          </Link>
          <Link href="/pricing" className="block text-muted hover:text-foreground">
            Pricing
          </Link>
          <Link href="/#faq" className="block text-muted hover:text-foreground">
            Questions
          </Link>
          <a href="https://ivyward.userjot.com" target="_blank" rel="noreferrer" className="block text-muted hover:text-foreground">
            Feedback and support
          </a>
          <a href="https://ivyward.userjot.com/roadmap" target="_blank" rel="noreferrer" className="block text-muted hover:text-foreground">
            Roadmap
          </a>
        </nav>
        <nav aria-label="Account" className="space-y-2.5">
          <p className="font-medium">Account</p>
          <Link href="/login" className="block text-muted hover:text-foreground">
            Sign in
          </Link>
          <Link href="/login?mode=signup" className="block text-muted hover:text-foreground">
            Create an account
          </Link>
          <Link href="/privacy" className="block text-muted hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="block text-muted hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted">Application fees are paid to schools directly. Agents ask for waivers first.</p>
      </div>
    </footer>
  );
}
