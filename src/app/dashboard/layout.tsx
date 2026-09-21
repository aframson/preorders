import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { BottomTabs, Sidebar } from "@/components/dashboard/nav";
import { VendorApprovalBanner } from "@/components/dashboard/payout-verification-banner";
import { RegisterServiceWorker } from "@/components/dashboard/register-service-worker";
import { requireVendor } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const vendor = await requireVendor();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
      <RegisterServiceWorker />
      <header className="border-b border-border bg-surface px-5 py-4 lg:hidden">
        <Link href="/dashboard" aria-label="Dashboard">
          <Logo />
        </Link>
      </header>

      <Sidebar businessName={vendor.businessName} vendorSlug={vendor.slug} />

      <div className="flex min-w-0 flex-1 flex-col bg-surface lg:m-2 lg:ml-0 lg:min-h-[calc(100dvh-1rem)] lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:shadow-sm">
        <VendorApprovalBanner vendor={vendor} />
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-7">{children}</main>
        <BottomTabs />
      </div>
    </div>
  );
}
