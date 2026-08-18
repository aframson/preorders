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
    openGraph: {
      title: data.vendor.businessName,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: data.vendor.businessName,
      description,
    },
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
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">
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

        {(vendor.reviewCount > 0 || recentReviews.length > 0) && (
          <section className="mt-10 space-y-3 border-t border-border pt-8">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold text-ink">
                What buyers say
              </h2>
              {vendor.reviewCount > 0 && vendor.ratingAverage != null ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                  <StarRow value={vendor.ratingAverage} size="sm" />
                  <span data-numeric>
                    {vendor.ratingAverage.toFixed(1)} · {vendor.reviewCount}{" "}
                    review{vendor.reviewCount === 1 ? "" : "s"}
                  </span>
                </div>
              ) : null}
            </div>
            {recentReviews.length > 0 ? (
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
            ) : null}
          </section>
        )}
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
