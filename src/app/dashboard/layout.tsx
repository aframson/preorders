import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { BottomTabs, Sidebar } from "@/components/dashboard/nav";
import { PayoutVerificationBanner } from "@/components/dashboard/payout-verification-banner";
import { requireVendor } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const vendor = await requireVendor();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <header className="border-b border-border px-5 py-4 lg:hidden">
        <Link href="/dashboard" aria-label="Dashboard">
          <Logo />
        </Link>
      </header>

      <Sidebar businessName={vendor.businessName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <PayoutVerificationBanner vendor={vendor} />
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
        <BottomTabs />
      </div>
    </div>
  );
}
