import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FindOrdersForm } from "@/app/[vendor]/orders/find-orders-form";
import { ResumeOrdersLink } from "@/app/[vendor]/orders/resume-orders-link";
import { VendorHeader } from "@/components/public/vendor-header";
import { getPublicVendor } from "@/lib/queries/public-vendor";
import { vendorPath } from "@/lib/site";

export const metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

export default async function VendorFindOrdersPage({
  params,
}: {
  params: Promise<{ vendor: string }>;
}) {
  const { vendor: vendorSlug } = await params;
  const data = await getPublicVendor(vendorSlug);
  if (!data) notFound();

  const { vendor } = data;

  return (
    <div className="flex min-h-dvh flex-col">
      <VendorHeader
        businessName={vendor.businessName}
        logoPath={vendor.logoPath}
        batchesDelivered={vendor.batchesDelivered}
        href={vendorPath(vendorSlug)}
      />

      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-5 py-6">
        <div>
          <Link
            href={vendorPath(vendorSlug)}
            className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back to shop
          </Link>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
            My orders
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Look up every order you have with {vendor.businessName}. We emailed
            you a link after checkout — this finds it again.
          </p>
        </div>

        <ResumeOrdersLink vendorSlug={vendorSlug} />

        <FindOrdersForm vendorSlug={vendorSlug} />
      </main>
    </div>
  );
}
