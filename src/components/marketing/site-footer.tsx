import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import type { SessionNav } from "@/lib/session-nav";

// Read once at module load rather than during render, which must stay pure.
const YEAR = new Date().getFullYear();

export function SiteFooter({ session }: { session: SessionNav }) {
  return (
    <footer className="mt-24 border-t border-border bg-surface-muted/40">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs space-y-3">
          <Logo />
          <p className="text-sm leading-relaxed text-ink-muted">
            One link for your preorder batches. Built in Ghana, for the people
            already doing this in WhatsApp every day.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:gap-14">
          <div className="space-y-3">
            <p className="font-medium text-ink">Product</p>
            <ul className="space-y-2 text-ink-muted">
              <li>
                <Link href="/#how" className="hover:text-ink">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/#shipping" className="hover:text-ink">
                  Fair shipping
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-ink">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-ink">Company</p>
            <ul className="space-y-2 text-ink-muted">
              <li>
                {session.status === "guest" ? (
                  <Link href="/login" className="hover:text-ink">
                    Sign in
                  </Link>
                ) : session.status === "onboarding" ? (
                  <Link href="/onboarding/business" className="hover:text-ink">
                    Continue setup
                  </Link>
                ) : (
                  <Link href="/dashboard" className="hover:text-ink">
                    Dashboard
                  </Link>
                )}
              </li>
              <li>
                <Link href="/terms" className="hover:text-ink">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-ink">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      <Container className="border-t border-border py-6">
        <p className="text-xs text-ink-subtle">
          &copy; {YEAR} Preorders. Prices in Ghana cedis.
        </p>
      </Container>
    </footer>
  );
}
