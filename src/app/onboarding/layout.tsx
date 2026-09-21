import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Preorders home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-4 pb-24 sm:items-center sm:pb-16">
        <div className="flex w-full max-w-lg justify-center rounded-sheet border border-border bg-surface p-6 shadow-sm sm:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
