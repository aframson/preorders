import type { Metadata } from "next";
import { Layers, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VendorHeader } from "@/components/public/vendor-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRow } from "@/components/ui/star-row";
import { StatusPill } from "@/components/ui/status-pill";
import { getPublicVendor } from "@/lib/queries/public-vendor";
import { dropPath, vendorPath, whatsappChatLink } from "@/lib/site";
import { BATCH_STATUS, batchTone } from "@/lib/status";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatAccraDateTime } from "@/lib/time";

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

        {drops.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Layers}
              title="Nothing open yet"
              description={`${vendor.businessName} has not published a batch link yet.`}
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {drops.map((drop) => {
              const live = drop.openBatch;
              const upcoming = drop.nextBatch;
              const href = dropPath(vendor.slug, drop.slug);
              const tone = live
                ? batchTone("open", new Date(live.closesAt))
                : upcoming
                  ? "neutral"
                  : "closed";

              return (
                <li key={drop.id}>
                  <Link
                    href={href}
                    className="flex gap-3 overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-brand-300"
                  >
                    <div className="relative w-24 shrink-0 self-stretch bg-surface-muted sm:w-28">
                      {drop.coverPath ? (
                        <Image
                          src={publicUrl(BUCKETS.vendorAssets, drop.coverPath)}
                          alt=""
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-ink-subtle">
                          <Layers className="size-5" aria-hidden />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 py-3 pr-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-display text-base font-semibold text-ink">
                          {drop.title}
                        </h3>
                        <StatusPill tone={tone} pulse={tone === "closing"}>
                          {live
                            ? BATCH_STATUS.open.publicLabel
                            : upcoming
                              ? BATCH_STATUS.scheduled.publicLabel
                              : "Closed"}
                        </StatusPill>
                      </div>

                      {drop.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                          {drop.description}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-ink-subtle">
                        {live
                          ? `Batch ${live.number} · closes ${formatAccraDateTime(live.closesAt)}${
                              live.orderCount > 0
                                ? ` · ${live.orderCount} orders in`
                                : ""
                            }`
                          : upcoming
                            ? `Batch ${upcoming.number} opens ${formatAccraDateTime(upcoming.opensAt)}`
                            : "The next batch has not been scheduled yet."}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
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
