import { Search } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-16 text-center">
      <Link href="/" aria-label="Preorders home">
        <Logo />
      </Link>

      <div className="mt-10 flex size-12 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
        <Search className="size-5" aria-hidden />
      </div>

      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink">
        This page is not here
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
        The link may be outdated, or this page was moved. Check the address and
        try again.
      </p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Preorders home
        </ButtonLink>
      </div>
    </div>
  );
}
