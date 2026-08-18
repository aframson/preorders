import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BatchBanner,
  DeliveryExpectation,
} from "@/components/public/batch-banner";
import { CartBar } from "@/components/public/cart";
import { NotifyMeForm } from "@/components/public/notify-me-form";
import { PublicProductCatalog } from "@/components/public/public-product-catalog";
import { VendorHeader } from "@/components/public/vendor-header";
import { cn } from "@/lib/cn";
import { getPublicDrop } from "@/lib/queries/public-drop";
import { dropPath, vendorPath, whatsappChatLink } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[vendor]/[drop]">): Promise<Metadata> {
  const { vendor, drop } = await params;
  const data = await getPublicDrop(vendor, drop);
  if (!data) return {};

  const title = `${data.vendor.businessName} — ${data.drop.title}`;
  const description = data.openBatch
    ? `Batch ${data.openBatch.number} is open. ${data.openBatch.orderCount} orders in. Pick what you want and pay online.`
    : `Orders are closed right now. Leave your email to hear when the next batch opens.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    other: data.openBatch
      ? { "og:url": `/${vendor}/${drop}?b=${data.openBatch.number}` }
      : undefined,
  };
}

export default async function PublicDropPage({
  params,
  searchParams,
}: PageProps<"/[vendor]/[drop]">) {
  const { vendor: vendorSlug, drop: dropSlug } = await params;
  const query = await searchParams;
  const activeCategory =
    typeof query.category === "string" ? query.category : null;

  const data = await getPublicDrop(vendorSlug, dropSlug);
  if (!data) notFound();

  const { vendor, drop, categories, products, openBatch, nextBatch } = data;
  const base = dropPath(vendorSlug, dropSlug);

  const visible = activeCategory
    ? products.filter((product) => product.categoryId === activeCategory)
    : products;

  const usedCategories = categories.filter((category) =>
    products.some((product) => product.categoryId === category.id),
  );

  const questionsHref = vendor.whatsappNumber
    ? whatsappChatLink(
        vendor.whatsappNumber,
        `Hi ${vendor.businessName}, I have a question about your preorders.`,
      )
    : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <VendorHeader
        businessName={vendor.businessName}
        logoPath={vendor.logoPath}
        batchesDelivered={vendor.batchesDelivered}
        description={drop.description}
        href={vendorPath(vendorSlug)}
      />

      <div className="sticky top-0 z-20">
        <BatchBanner
          openBatch={openBatch}
          nextBatch={nextBatch}
          notifySlot={<NotifyMeForm dropId={drop.id} />}
        />

        {openBatch && <DeliveryExpectation batch={openBatch} />}

        {usedCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-border bg-canvas/95 px-5 py-3 backdrop-blur scrollbar-none">
            <Chip href={base} active={!activeCategory}>
              All
            </Chip>
            {usedCategories.map((category) => (
              <Chip
                key={category.id}
                href={`${base}?category=${category.id}`}
                active={activeCategory === category.id}
              >
                {category.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <main
        id="products"
        className={cn(
          "mx-auto w-full max-w-3xl flex-1",
          questionsHref ? "pb-28" : "pb-8",
        )}
      >
        <PublicProductCatalog
          products={visible}
          base={base}
          freightMode={openBatch?.freightMode ?? "sea_cbm"}
          freightRateEstimate={openBatch?.freightRateEstimate ?? 0}
          categoryNames={Object.fromEntries(
            categories.map((category) => [category.id, category.name]),
          )}
          emptyTitle={
            activeCategory ? "Nothing in this category" : "Nothing here yet"
          }
          emptyDescription={
            activeCategory
              ? "Try another category."
              : `${vendor.businessName} has not added products to this link yet.`
          }
        />

        {!questionsHref && (
          <p className="px-5 pt-4 text-center text-xs text-ink-subtle">
            You pay for your goods now. Shipping is charged when they arrive,
            split fairly by{" "}
            {openBatch?.freightMode === "air_kg" ? "weight" : "size"}.
          </p>
        )}
      </main>

      {questionsHref ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-safe">
          <div className="mx-auto w-full max-w-3xl space-y-1.5 px-4 py-2">
            {openBatch && (
              <CartBar
                checkoutHref={`${base}/checkout`}
                className="static border-0 bg-transparent p-0 shadow-none"
              />
            )}
            <a
              href={questionsHref}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-control border border-border/70 bg-surface px-3 py-2 text-center text-xs font-medium text-ink"
            >
              <MessageCircle className="size-3.5 shrink-0 text-open" aria-hidden />
              Questions? Chat with {vendor.businessName.split(" ")[0]}
            </a>
            <p className="text-center text-[11px] leading-snug text-ink-subtle">
              Goods now · shipping later by{" "}
              {openBatch?.freightMode === "air_kg" ? "weight" : "size"}
            </p>
          </div>
        </div>
      ) : (
        openBatch && <CartBar checkoutHref={`${base}/checkout`} />
      )}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors",
        active
          ? "bg-brand-700 font-medium text-white"
          : "bg-surface-muted text-ink-muted",
      )}
    >
      {children}
    </Link>
  );
}
