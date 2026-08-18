import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { SearchableVendorDrops } from "@/components/public/searchable-vendor-drops";
import { VendorHeader } from "@/components/public/vendor-header";
import { StarRow } from "@/components/ui/star-row";
import { getPublicVendor } from "@/lib/queries/public-vendor";
import { vendorPath, whatsappChatLink } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[vendor]">): Promise<Metadata> {
  const { vendor } = await params;
  const data = await getPublicVendor(vendor);
  if (!data) return {};

  const openCount = data.drops.filter((drop) => drop.openBatch).length;
  const description =
    openCount > 0
      ? `${openCount} batch${openCount === 1 ? "" : "es"} open now. Pick a link and order.`
      : `Preorder batches from ${data.vendor.businessName}.`;

  return {
    title: data.vendor.businessName,
    description,
    openGraph: { title: data.vendor.businessName, description, type: "website" },
  };
}

export default async function PublicVendorPage({
  params,
}: PageProps<"/[vendor]">) {
  const { vendor: vendorSlug } = await params;
  const data = await getPublicVendor(vendorSlug);
  if (!data) notFound();

  const { vendor, drops, recentReviews } = data;

  return (
    <div className="flex min-h-dvh flex-col">
      <VendorHeader
        businessName={vendor.businessName}
        logoPath={vendor.logoPath}
        batchesDelivered={vendor.batchesDelivered}
        ratingAverage={vendor.ratingAverage}
        reviewCount={vendor.reviewCount}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">
        {recentReviews.length > 0 && (
          <section className="mb-8 space-y-3">
            <h2 className="font-display text-lg font-semibold text-ink">
              What buyers say
            </h2>
            <ul className="space-y-3">
              {recentReviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-card border border-border bg-surface px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink">
                      {review.customerDisplayName}
                    </p>
                    <StarRow value={review.rating} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="mt-1.5 text-sm text-ink-muted">
                      {review.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <h2 className="font-display text-lg font-semibold text-ink">
          {drops.length === 1 ? "The batch" : "Batches"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Each link is a running preorder. Open one to pick and pay.
        </p>

        <SearchableVendorDrops
          vendorSlug={vendor.slug}
          businessName={vendor.businessName}
          drops={drops}
        />
      </main>

      <footer className="mx-auto w-full max-w-3xl px-5 py-8">
        {vendor.whatsappNumber && (
          <a
            href={whatsappChatLink(
              vendor.whatsappNumber,
              `Hi ${vendor.businessName}, I have a question about your preorders.`,
            )}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-card border border-border bg-surface px-4 py-3.5 text-sm font-medium text-ink"
          >
            <MessageCircle className="size-4 text-open" aria-hidden />
            Questions? Chat with {vendor.businessName.split(" ")[0]}
          </a>
        )}
        <p className="mt-6 text-center text-xs text-ink-subtle">
          {vendorPath(vendor.slug).slice(1)} on Preorders
        </p>
      </footer>
    </div>
  );
}
