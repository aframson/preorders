"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-16 text-center">
      <Link href="/" aria-label="Preorders home">
        <Logo />
      </Link>

      <div className="mt-10 flex size-12 items-center justify-center rounded-full bg-danger-tint text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </div>

      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
        Something broke while loading this page. Try again — if it keeps
        happening, go back to the dashboard and reopen it.
      </p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/dashboard" variant="secondary">
          Go to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
