import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
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
      <main className="flex flex-1 items-start justify-center px-5 pb-16 sm:items-center">
        {children}
      </main>
    </div>
  );
}
