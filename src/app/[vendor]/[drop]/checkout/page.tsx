import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicDrop } from "@/lib/queries/public-drop";
import { dropPath } from "@/lib/site";
import { CheckoutForm } from "./checkout-form";
import { ClosedNotice } from "./closed-notice";

export const metadata = { title: "Review your order" };

export default async function CheckoutPage({
  params,
}: PageProps<"/[vendor]/[drop]/checkout">) {
  const { vendor: vendorSlug, drop: dropSlug } = await params;

  const data = await getPublicDrop(vendorSlug, dropSlug);
  if (!data) notFound();

  const base = dropPath(vendorSlug, dropSlug);

  if (!data.openBatch) {
    return <ClosedNotice base={base} businessName={data.vendor.businessName} />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-canvas/95 px-5 py-3 backdrop-blur">
        <Link
          href={base}
          className="inline-flex items-center gap-1 text-sm text-ink-muted"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Keep shopping
        </Link>
      </header>

      <CheckoutForm
        vendorSlug={vendorSlug}
        dropSlug={dropSlug}
        batch={data.openBatch}
        businessName={data.vendor.businessName}
        pickupMapsUrl={data.vendor.pickupMapsUrl}
      />
    </div>
  );
}
