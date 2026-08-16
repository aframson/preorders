import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5">
        <Link href="/" aria-label="Preorders home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-5 pb-24 sm:items-center sm:pb-16">
        {children}
      </main>
    </div>
  );
}
