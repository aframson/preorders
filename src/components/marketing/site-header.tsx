"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { SessionNav } from "@/lib/session-nav";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

export function SiteHeader({ session }: { session: SessionNav }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-200",
        scrolled
          ? "border-b border-border bg-canvas/85 backdrop-blur"
          : "border-b border-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${SITE.name} home`}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
          <Link href="/#how" className="transition-colors hover:text-ink">
            How it works
          </Link>
          <Link href="/#shipping" className="transition-colors hover:text-ink">
            Shipping
          </Link>
          <Link href="/#pricing" className="transition-colors hover:text-ink">
            Pricing
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-ink">
            Questions
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {session.status === "guest" ? (
            <>
              <ButtonLink
                href="/login"
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Sign in
              </ButtonLink>
              <ButtonLink href="/onboarding" size="sm">
                Get started
              </ButtonLink>
            </>
          ) : session.status === "onboarding" ? (
            <ButtonLink href="/onboarding/business" size="sm">
              Continue setup
            </ButtonLink>
          ) : (
            <>
              <span className="hidden max-w-[10rem] truncate text-sm text-ink-muted sm:inline">
                {session.businessName}
              </span>
              <ButtonLink href="/dashboard" size="sm">
                Dashboard
              </ButtonLink>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
